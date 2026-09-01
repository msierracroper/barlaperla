-- ============================================================================
-- ESQUEMA DE BASE DE DATOS — La Perla Video Bar
-- Sistema de control de inventario, ventas, créditos y utilidades
-- Motor: PostgreSQL (Supabase)
-- ============================================================================
-- Convenciones:
--   - Todas las tablas usan uuid como PK (default gen_random_uuid())
--   - Todas las tablas de negocio incluyen sede_id (preparado para multi-sede)
--   - created_at / updated_at en todas las tablas relevantes
--   - Montos en numeric(12,2) (pesos colombianos, sin decimales reales pero
--     se deja precisión por si acaso)
--   - "Jornada operativa": el día de negocio va de ~17:00 a ~01:00 del día
--     siguiente. Todas las ventas/gastos/cierres se asocian a una jornada,
--     NO a la fecha calendario, para que la madrugada no se cuente como
--     "otro día".
-- ============================================================================

create extension if not exists "pgcrypto";

-- ============================================================================
-- 1. SEDES (preparado para multi-sede futuro, hoy solo existe 1 registro)
-- ============================================================================
create table sedes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  direccion text,
  telefono text,
  activa boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 2. USUARIOS Y ROLES
-- ============================================================================
-- usuarios.id = auth.users.id (Supabase Auth). Un usuario puede tener varios roles.

create table usuarios (
  id uuid primary key references auth.users(id) on delete cascade,
  sede_id uuid not null references sedes(id),
  nombre text not null,
  telefono text,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create type rol_tipo as enum ('admin', 'mesera', 'preparador', 'cajero');

create table usuario_roles (
  usuario_id uuid not null references usuarios(id) on delete cascade,
  rol rol_tipo not null,
  primary key (usuario_id, rol)
);

-- ============================================================================
-- 3. JORNADAS OPERATIVAS Y CAJA
-- ============================================================================
create type jornada_estado as enum ('abierta', 'cerrada');

create table jornadas (
  id uuid primary key default gen_random_uuid(),
  sede_id uuid not null references sedes(id),
  fecha_operativa date not null, -- fecha "de negocio" (ej: viernes, aunque cierre a la 1am del sábado)
  estado jornada_estado not null default 'abierta',
  base_caja_inicial numeric(12,2) not null default 0,
  efectivo_contado numeric(12,2), -- se llena al hacer el arqueo de cierre
  diferencia_caja numeric(12,2),  -- efectivo_contado - efectivo_esperado (calculado)
  usuario_apertura_id uuid references usuarios(id),
  usuario_cierre_id uuid references usuarios(id),
  abierta_at timestamptz not null default now(),
  cerrada_at timestamptz,
  unique (sede_id, fecha_operativa)
);

-- ============================================================================
-- 4. MESAS Y BARRAS (configurables por el admin)
-- ============================================================================
create table mesas (
  id uuid primary key default gen_random_uuid(),
  sede_id uuid not null references sedes(id),
  numero text not null,          -- "Mesa 1", "Mesa 2"...
  activa boolean not null default true,
  created_at timestamptz not null default now()
);

create table barras (
  id uuid primary key default gen_random_uuid(),
  sede_id uuid not null references sedes(id),
  nombre text not null,          -- "Barra 1", "Barra 2"
  activa boolean not null default true
);

create table sillas_barra (
  id uuid primary key default gen_random_uuid(),
  barra_id uuid not null references barras(id) on delete cascade,
  numero text not null,          -- "1", "2"... único dentro de la barra
  activa boolean not null default true,
  unique (barra_id, numero)
);

-- ============================================================================
-- 5. CUENTAS, SUB-CUENTAS Y UBICACIONES
-- ============================================================================
-- Una "cuenta" es el objeto central: puede vivir en 1+ mesas (unión de mesas)
-- o en 1+ sillas de barra (grupo compartiendo puestos). Nunca mezcla mesa+barra.

create type cuenta_tipo as enum ('mesa', 'barra');
create type cuenta_estado as enum ('abierta', 'lista_para_cobrar', 'cerrada', 'anulada');

create table cuentas (
  id uuid primary key default gen_random_uuid(),
  sede_id uuid not null references sedes(id),
  jornada_id uuid not null references jornadas(id),
  tipo cuenta_tipo not null,
  estado cuenta_estado not null default 'abierta',
  creado_por uuid not null references usuarios(id),
  created_at timestamptz not null default now(),
  cerrada_at timestamptz
);

-- Relación N a N: una cuenta puede tener varias mesas/sillas (unión), y en
-- teoría una mesa podría tener más de una cuenta si se subdivide en el futuro
-- por ubicación física (no confundir con sub-cuentas de pago, ver abajo).
create table cuenta_ubicaciones (
  id uuid primary key default gen_random_uuid(),
  cuenta_id uuid not null references cuentas(id) on delete cascade,
  mesa_id uuid references mesas(id),
  silla_barra_id uuid references sillas_barra(id),
  check (
    (mesa_id is not null and silla_barra_id is null) or
    (mesa_id is null and silla_barra_id is not null)
  )
);

-- Sub-cuentas: división de una cuenta por producto para que cada persona
-- pague lo suyo (ej: Juan paga 2 aguardientes, Pedro paga 5 cervezas).
create type subcuenta_estado as enum ('abierta', 'cerrada');

create table subcuentas (
  id uuid primary key default gen_random_uuid(),
  cuenta_id uuid not null references cuentas(id) on delete cascade,
  nombre_cliente text not null default 'General', -- "Juan", "Pedro", o "General" si no se divide
  estado subcuenta_estado not null default 'abierta',
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 6. PRODUCTOS, CATEGORÍAS Y MODIFICADORES
-- ============================================================================
create table categorias_producto (
  id uuid primary key default gen_random_uuid(),
  sede_id uuid not null references sedes(id),
  nombre text not null,
  activa boolean not null default true
);

create type control_inventario_tipo as enum (
  'simple',        -- cervezas, aguas, enlatados: solo unidades
  'licor_multiuso',-- licores: venta directa / shots / coctelería, control por botella + ml
  'receta'         -- cócteles: descuenta ingredientes de su receta, no tiene stock propio
);

create table productos (
  id uuid primary key default gen_random_uuid(),
  sede_id uuid not null references sedes(id),
  categoria_id uuid references categorias_producto(id),
  nombre text not null,
  precio_venta numeric(12,2) not null,
  costo_promedio numeric(12,2) not null default 0, -- se recalcula en cada ingreso de inventario
  control_inventario control_inventario_tipo not null default 'simple',
  stock_minimo numeric(12,2) default 0,             -- unidades (o ml si aplica)
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

-- Modificadores/adicionales (ej: "Michelada" = sal + limón, $2.000 adicional)
create table modificadores (
  id uuid primary key default gen_random_uuid(),
  sede_id uuid not null references sedes(id),
  nombre text not null,
  precio_adicional numeric(12,2) not null default 0,
  activo boolean not null default true
);

-- Qué modificadores aplican a qué productos (ej: Michelada solo aplica a cervezas)
create table producto_modificadores (
  producto_id uuid not null references productos(id) on delete cascade,
  modificador_id uuid not null references modificadores(id) on delete cascade,
  primary key (producto_id, modificador_id)
);

-- ============================================================================
-- 7. INVENTARIO
-- ============================================================================

-- 7.1 Stock simple (cervezas, aguas, enlatados): un contador por producto.
create table stock_simple (
  producto_id uuid primary key references productos(id) on delete cascade,
  cantidad_actual numeric(12,2) not null default 0
);

-- 7.2 Botellas individuales de licor (control_inventario = 'licor_multiuso').
-- Cada botella física se rastrea por separado y tiene un "destino":
--   cerrada          -> disponible para venta directa de botella completa
--   abierta_shots     -> se está sirviendo por shots (descuenta ml)
--   abierta_coctel    -> se está usando en coctelería (descuenta ml)
--   agotada           -> volumen_ml_restante = 0
create type botella_estado as enum ('cerrada', 'abierta_shots', 'abierta_coctel', 'agotada');

create table botellas (
  id uuid primary key default gen_random_uuid(),
  producto_id uuid not null references productos(id),
  estado botella_estado not null default 'cerrada',
  volumen_ml_total numeric(10,2) not null default 750, -- tamaño de la botella
  volumen_ml_restante numeric(10,2) not null default 750,
  costo_unitario numeric(12,2) not null,
  fecha_ingreso timestamptz not null default now(),
  convertida_por uuid references usuarios(id), -- quién la pasó a shots/coctel
  convertida_at timestamptz
);

-- 7.3 Recetas de cóctel: ingredientes en ml, referenciando productos tipo licor.
create table recetas_coctel (
  id uuid primary key default gen_random_uuid(),
  producto_coctel_id uuid not null references productos(id) on delete cascade,
  producto_ingrediente_id uuid not null references productos(id),
  cantidad_ml numeric(10,2) not null
);

-- 7.4 Movimientos de inventario (auditoría/trazabilidad de todo lo que
-- entra o sale, sea stock simple o botellas).
create type movimiento_tipo as enum (
  'ingreso', 'venta', 'anulacion', 'fiado', 'conversion_botella', 'merma', 'ajuste'
);

create table inventario_movimientos (
  id uuid primary key default gen_random_uuid(),
  producto_id uuid not null references productos(id),
  botella_id uuid references botellas(id),
  tipo movimiento_tipo not null,
  cantidad numeric(12,2) not null, -- positivo = entra, negativo = sale
  costo_unitario numeric(12,2),    -- solo relevante en 'ingreso'
  referencia_id uuid,              -- id del pedido_item, gasto, etc. relacionado
  usuario_id uuid not null references usuarios(id),
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 8. PEDIDOS (comandas)
-- ============================================================================
create type pedido_item_estado as enum ('pendiente', 'listo', 'entregado', 'anulado');

create table pedido_items (
  id uuid primary key default gen_random_uuid(),
  subcuenta_id uuid not null references subcuentas(id) on delete cascade,
  producto_id uuid not null references productos(id),
  modificador_id uuid references modificadores(id),
  cantidad numeric(10,2) not null default 1,
  precio_unitario numeric(12,2) not null,   -- snapshot del precio al momento de vender
  precio_modificador numeric(12,2) default 0,
  estado pedido_item_estado not null default 'pendiente',
  creado_por uuid not null references usuarios(id), -- mesera
  preparado_por uuid references usuarios(id),
  preparado_at timestamptz,
  entregado_at timestamptz,
  anulado boolean not null default false,
  motivo_anulacion text,
  anulado_por uuid references usuarios(id),
  anulado_at timestamptz,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 9. PAGOS
-- ============================================================================
create type metodo_pago as enum ('efectivo', 'transferencia', 'mixto', 'fiado');

create table pagos (
  id uuid primary key default gen_random_uuid(),
  subcuenta_id uuid not null references subcuentas(id),
  metodo metodo_pago not null,
  monto_efectivo numeric(12,2) not null default 0,
  monto_transferencia numeric(12,2) not null default 0,
  monto_fiado numeric(12,2) not null default 0,
  monto_total numeric(12,2) not null,
  registrado_por uuid not null references usuarios(id),
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 10. FIADOS / CUENTAS POR COBRAR
-- ============================================================================
create table clientes_fiado (
  id uuid primary key default gen_random_uuid(),
  sede_id uuid not null references sedes(id),
  nombre text not null,
  telefono text,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create type fiado_estado as enum ('pendiente', 'abonado_parcial', 'pagado');

create table fiados (
  id uuid primary key default gen_random_uuid(),
  pago_id uuid not null references pagos(id),
  cliente_fiado_id uuid not null references clientes_fiado(id),
  monto_total numeric(12,2) not null,
  monto_pagado numeric(12,2) not null default 0,
  estado fiado_estado not null default 'pendiente',
  autorizado_por uuid not null references usuarios(id),
  created_at timestamptz not null default now()
);

create table fiado_abonos (
  id uuid primary key default gen_random_uuid(),
  fiado_id uuid not null references fiados(id) on delete cascade,
  monto numeric(12,2) not null,
  registrado_por uuid not null references usuarios(id),
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 11. GASTOS
-- ============================================================================
create table gastos_categorias (
  id uuid primary key default gen_random_uuid(),
  sede_id uuid not null references sedes(id),
  nombre text not null,
  activa boolean not null default true
);

create table gastos (
  id uuid primary key default gen_random_uuid(),
  sede_id uuid not null references sedes(id),
  jornada_id uuid references jornadas(id),
  categoria_id uuid references gastos_categorias(id),
  monto numeric(12,2) not null,
  descripcion text,
  registrado_por uuid not null references usuarios(id),
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 12. PARÁMETROS DEL SISTEMA (configurables)
-- ============================================================================
create table parametros_sistema (
  sede_id uuid not null references sedes(id),
  clave text not null,       -- ej: 'tamano_shot_ml'
  valor text not null,       -- ej: '45'
  primary key (sede_id, clave)
);

-- ============================================================================
-- ÍNDICES RECOMENDADOS
-- ============================================================================
create index idx_cuentas_jornada on cuentas(jornada_id);
create index idx_cuentas_estado on cuentas(estado);
create index idx_subcuentas_cuenta on subcuentas(cuenta_id);
create index idx_pedido_items_subcuenta on pedido_items(subcuenta_id);
create index idx_pedido_items_estado on pedido_items(estado);
create index idx_inventario_mov_producto on inventario_movimientos(producto_id);
create index idx_botellas_producto on botellas(producto_id);
create index idx_fiados_cliente on fiados(cliente_fiado_id);
create index idx_gastos_jornada on gastos(jornada_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) — base a extender en Claude Code
-- ============================================================================
-- Filosofía: todos los usuarios autenticados de la sede pueden LEER la mayoría
-- de tablas operativas; las escrituras se restringen por rol.
-- Función auxiliar: verifica si el usuario autenticado tiene un rol dado.

create or replace function tiene_rol(rol_buscado rol_tipo)
returns boolean
language sql
security definer
as $$
  select exists (
    select 1 from usuario_roles
    where usuario_id = auth.uid() and rol = rol_buscado
  );
$$;

alter table cuentas enable row level security;
alter table subcuentas enable row level security;
alter table pedido_items enable row level security;
alter table pagos enable row level security;
alter table fiados enable row level security;
alter table gastos enable row level security;
alter table productos enable row level security;
alter table botellas enable row level security;
alter table inventario_movimientos enable row level security;

-- Ejemplo de políticas base (ajustar/expandir en la implementación):
create policy "usuarios autenticados leen cuentas de su sede"
  on cuentas for select
  using (auth.role() = 'authenticated');

create policy "mesera y admin crean cuentas"
  on cuentas for insert
  with check (tiene_rol('mesera') or tiene_rol('admin'));

create policy "cajero y admin cierran/anulan cuentas"
  on cuentas for update
  using (tiene_rol('cajero') or tiene_rol('admin'));

create policy "mesera, preparador y admin gestionan pedido_items"
  on pedido_items for all
  using (tiene_rol('mesera') or tiene_rol('preparador') or tiene_rol('admin'))
  with check (tiene_rol('mesera') or tiene_rol('preparador') or tiene_rol('admin'));

create policy "cajero y admin gestionan pagos"
  on pagos for all
  using (tiene_rol('cajero') or tiene_rol('admin'))
  with check (tiene_rol('cajero') or tiene_rol('admin'));

create policy "cajero y admin gestionan fiados"
  on fiados for all
  using (tiene_rol('cajero') or tiene_rol('admin'))
  with check (tiene_rol('cajero') or tiene_rol('admin'));

create policy "cajero y admin gestionan gastos"
  on gastos for all
  using (tiene_rol('cajero') or tiene_rol('admin'))
  with check (tiene_rol('cajero') or tiene_rol('admin'));

create policy "solo admin gestiona productos"
  on productos for all
  using (tiene_rol('admin'))
  with check (tiene_rol('admin'));

create policy "solo admin gestiona botellas e inventario"
  on botellas for all
  using (tiene_rol('admin'))
  with check (tiene_rol('admin'));

create policy "usuarios ven movimientos de inventario"
  on inventario_movimientos for select
  using (auth.role() = 'authenticated');

-- usuarios y usuario_roles: RLS activo (algunos proyectos Supabase lo
-- habilitan por defecto en tablas nuevas). tiene_rol() es security definer,
-- por eso puede leer usuario_roles sin quedar bloqueada por su propia RLS.
alter table usuarios enable row level security;
alter table usuario_roles enable row level security;

create policy "usuarios autenticados leen usuarios"
  on usuarios for select
  using (auth.role() = 'authenticated');

create policy "solo admin crea usuarios"
  on usuarios for insert
  with check (tiene_rol('admin'));

create policy "solo admin actualiza usuarios"
  on usuarios for update
  using (tiene_rol('admin'))
  with check (tiene_rol('admin'));

create policy "usuarios autenticados leen roles"
  on usuario_roles for select
  using (auth.role() = 'authenticated');

create policy "solo admin gestiona roles"
  on usuario_roles for all
  using (tiene_rol('admin'))
  with check (tiene_rol('admin'));

-- NOTA para Claude Code: revisar y completar políticas para el resto de
-- tablas (mesas, sillas_barra, categorias_producto, modificadores,
-- clientes_fiado, gastos_categorias, jornadas) siguiendo el mismo criterio
-- de roles.
