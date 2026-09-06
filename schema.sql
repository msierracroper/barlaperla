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
  'licor_multiuso',-- licores vendidos por botella completa: control por botella (unidad)
  'receta',        -- cócteles: descuenta ingredientes de su receta, no tiene stock propio
  'shot_de_licor'  -- shots: no tiene stock propio, descuenta ml de la botella 'abierta_shots' de licor_base_id
);

create table productos (
  id uuid primary key default gen_random_uuid(),
  sede_id uuid not null references sedes(id),
  categoria_id uuid references categorias_producto(id),
  nombre text not null,
  precio_venta numeric(12,2) not null,
  costo_promedio numeric(12,2) not null default 0, -- se recalcula en cada ingreso de inventario
  control_inventario control_inventario_tipo not null default 'simple',
  -- solo aplica cuando control_inventario='shot_de_licor': a que producto
  -- 'licor_multiuso' (la botella fisica) se le descuentan los ml de este shot.
  licor_base_id uuid references productos(id),
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
  -- metodo/jornada_id: para que el abono (dinero que SI entra a caja hoy,
  -- a diferencia del fiado original) cuente en el resumen/arqueo de caja
  -- del dia en que se recibe, no del dia en que se origino el fiado.
  metodo metodo_pago not null default 'efectivo',
  jornada_id uuid not null references jornadas(id),
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
create index idx_fiado_abonos_jornada on fiado_abonos(jornada_id);
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

-- subcuentas tenia RLS activo desde el schema.sql original pero nunca se le
-- escribieron politicas (bug real que bloqueaba abrir cuenta -> tomar pedido).
create policy "usuarios autenticados leen subcuentas"
  on subcuentas for select
  using (auth.role() = 'authenticated');

create policy "mesera, cajero y admin gestionan subcuentas"
  on subcuentas for all
  using (tiene_rol('mesera') or tiene_rol('cajero') or tiene_rol('admin'))
  with check (tiene_rol('mesera') or tiene_rol('cajero') or tiene_rol('admin'));

-- lectura abierta a cualquier autenticado (el cajero necesita ver los
-- items de una cuenta para cobrarla, aunque no los cree ni los modifique).
create policy "usuarios autenticados leen pedido_items"
  on pedido_items for select
  using (auth.role() = 'authenticated');

-- anulaciones: por regla de negocio del alcance, solo cajero/admin pueden
-- anular un item (la mesera solo crea/ajusta items en estado pendiente,
-- ya cubierto por la politica de mesera/preparador/admin de mas abajo).
create policy "cajero y admin anulan pedido_items"
  on pedido_items for update
  using (tiene_rol('cajero') or tiene_rol('admin'))
  with check (tiene_rol('cajero') or tiene_rol('admin'));

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

-- "for all" con solo admin bloqueaba tambien la LECTURA para el resto de
-- roles (la mesera no podia ver el menu). Se agrega lectura abierta aparte;
-- las politicas RLS son permisivas/OR, asi que esto no afloja la escritura.
create policy "usuarios autenticados leen productos"
  on productos for select
  using (auth.role() = 'authenticated');

create policy "solo admin gestiona productos"
  on productos for all
  using (tiene_rol('admin'))
  with check (tiene_rol('admin'));

-- mismo caso que productos: se separa lectura (todos) de escritura (admin).
create policy "usuarios autenticados leen botellas"
  on botellas for select
  using (auth.role() = 'authenticated');

create policy "solo admin gestiona botellas e inventario"
  on botellas for all
  using (tiene_rol('admin'))
  with check (tiene_rol('admin'));

create policy "usuarios ven movimientos de inventario"
  on inventario_movimientos for select
  using (auth.role() = 'authenticated');

-- esta tabla nunca tuvo politica de escritura (solo se le habia dado
-- select) -- sin esto, el ingreso de inventario (admin) se bloquea en
-- silencio por RLS.
create policy "solo admin registra movimientos de inventario"
  on inventario_movimientos for insert
  with check (tiene_rol('admin'));

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

-- Resto de tablas: en este proyecto Supabase, RLS queda activo por defecto
-- en TODA tabla nueva creada desde el SQL Editor (confirmado con
-- pg_class.relrowsecurity), independientemente de si el create table
-- original lo pedia. Sin politicas, Postgres deniega todo. Se completan
-- aqui todas las que faltaban para que Fase 1 en adelante no vuelva a
-- toparse con este bloqueo.

create policy "usuarios autenticados leen sedes"
  on sedes for select
  using (auth.role() = 'authenticated');

create policy "solo admin gestiona sedes"
  on sedes for all
  using (tiene_rol('admin'))
  with check (tiene_rol('admin'));

create policy "usuarios autenticados leen mesas"
  on mesas for select
  using (auth.role() = 'authenticated');

create policy "solo admin gestiona mesas"
  on mesas for all
  using (tiene_rol('admin'))
  with check (tiene_rol('admin'));

create policy "usuarios autenticados leen barras"
  on barras for select
  using (auth.role() = 'authenticated');

create policy "solo admin gestiona barras"
  on barras for all
  using (tiene_rol('admin'))
  with check (tiene_rol('admin'));

create policy "usuarios autenticados leen sillas_barra"
  on sillas_barra for select
  using (auth.role() = 'authenticated');

create policy "solo admin gestiona sillas_barra"
  on sillas_barra for all
  using (tiene_rol('admin'))
  with check (tiene_rol('admin'));

create policy "usuarios autenticados leen categorias_producto"
  on categorias_producto for select
  using (auth.role() = 'authenticated');

create policy "solo admin gestiona categorias_producto"
  on categorias_producto for all
  using (tiene_rol('admin'))
  with check (tiene_rol('admin'));

create policy "usuarios autenticados leen modificadores"
  on modificadores for select
  using (auth.role() = 'authenticated');

create policy "solo admin gestiona modificadores"
  on modificadores for all
  using (tiene_rol('admin'))
  with check (tiene_rol('admin'));

create policy "usuarios autenticados leen producto_modificadores"
  on producto_modificadores for select
  using (auth.role() = 'authenticated');

create policy "solo admin gestiona producto_modificadores"
  on producto_modificadores for all
  using (tiene_rol('admin'))
  with check (tiene_rol('admin'));

create policy "usuarios autenticados leen stock_simple"
  on stock_simple for select
  using (auth.role() = 'authenticated');

create policy "solo admin gestiona stock_simple"
  on stock_simple for all
  using (tiene_rol('admin'))
  with check (tiene_rol('admin'));

create policy "usuarios autenticados leen recetas_coctel"
  on recetas_coctel for select
  using (auth.role() = 'authenticated');

create policy "solo admin gestiona recetas_coctel"
  on recetas_coctel for all
  using (tiene_rol('admin'))
  with check (tiene_rol('admin'));

create policy "usuarios autenticados leen clientes_fiado"
  on clientes_fiado for select
  using (auth.role() = 'authenticated');

create policy "cajero y admin gestionan clientes_fiado"
  on clientes_fiado for all
  using (tiene_rol('cajero') or tiene_rol('admin'))
  with check (tiene_rol('cajero') or tiene_rol('admin'));

create policy "usuarios autenticados leen fiado_abonos"
  on fiado_abonos for select
  using (auth.role() = 'authenticated');

create policy "cajero y admin registran fiado_abonos"
  on fiado_abonos for insert
  with check (tiene_rol('cajero') or tiene_rol('admin'));

create policy "usuarios autenticados leen gastos_categorias"
  on gastos_categorias for select
  using (auth.role() = 'authenticated');

create policy "solo admin gestiona gastos_categorias"
  on gastos_categorias for all
  using (tiene_rol('admin'))
  with check (tiene_rol('admin'));

create policy "usuarios autenticados leen jornadas"
  on jornadas for select
  using (auth.role() = 'authenticated');

create policy "cajero y admin gestionan jornadas"
  on jornadas for all
  using (tiene_rol('cajero') or tiene_rol('admin'))
  with check (tiene_rol('cajero') or tiene_rol('admin'));

create policy "usuarios autenticados leen parametros_sistema"
  on parametros_sistema for select
  using (auth.role() = 'authenticated');

create policy "solo admin gestiona parametros_sistema"
  on parametros_sistema for all
  using (tiene_rol('admin'))
  with check (tiene_rol('admin'));

create policy "usuarios autenticados leen cuenta_ubicaciones"
  on cuenta_ubicaciones for select
  using (auth.role() = 'authenticated');

create policy "mesera y admin crean cuenta_ubicaciones"
  on cuenta_ubicaciones for insert
  with check (tiene_rol('mesera') or tiene_rol('admin'));

create policy "mesera, cajero y admin mueven cuenta_ubicaciones"
  on cuenta_ubicaciones for update
  using (tiene_rol('mesera') or tiene_rol('cajero') or tiene_rol('admin'))
  with check (tiene_rol('mesera') or tiene_rol('cajero') or tiene_rol('admin'));

create policy "cajero y admin eliminan cuenta_ubicaciones"
  on cuenta_ubicaciones for delete
  using (tiene_rol('cajero') or tiene_rol('admin'));

-- mesera tambien dispara la auto-creacion de jornada al abrir una cuenta
-- (ver funcion jornada_activa mas abajo), asi que necesita poder insertar.
create policy "mesera crea jornadas al abrir cuenta"
  on jornadas for insert
  with check (tiene_rol('mesera') or tiene_rol('cajero') or tiene_rol('admin'));

-- ============================================================================
-- FUNCION jornada_activa(sede_id) -- resuelve o crea la jornada operativa
-- ============================================================================
-- Dia de negocio: ~17:00 a ~01:00 del dia siguiente (hora de Bogota). Toda
-- pantalla que registre una venta/gasto/cierre debe llamar esta funcion en
-- vez de duplicar la logica de fecha operativa. security definer para que
-- cualquier rol autenticado pueda invocarla sin necesitar permisos directos
-- de insert/select amplios sobre jornadas.

create or replace function jornada_activa(p_sede_id uuid)
returns jornadas
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ahora_bogota timestamp;
  v_fecha date;
  v_jornada jornadas;
begin
  v_ahora_bogota := now() at time zone 'America/Bogota';
  v_fecha := v_ahora_bogota::date;

  if extract(hour from v_ahora_bogota) < 1 then
    v_fecha := v_fecha - interval '1 day';
  end if;

  select * into v_jornada
  from jornadas
  where sede_id = p_sede_id and fecha_operativa = v_fecha;

  if not found then
    insert into jornadas (sede_id, fecha_operativa, usuario_apertura_id)
    values (p_sede_id, v_fecha, auth.uid())
    returning * into v_jornada;
  end if;

  return v_jornada;
end;
$$;

grant execute on function jornada_activa(uuid) to authenticated;

-- ============================================================================
-- FUNCION registrar_movimiento_stock_simple -- descuento/reposicion atomico
-- ============================================================================
-- Ajusta stock_simple.cantidad_actual y registra el movimiento en un solo
-- paso atomico (evita "lost update" si dos meseras venden el mismo producto
-- casi al mismo tiempo -- un UPDATE ... SET x = x + delta es atomico en
-- Postgres, a diferencia de leer y despues escribir desde la aplicacion).
-- security definer: mesera vende (delta negativo) y cajero/admin anulan
-- (delta positivo) sin necesitar permisos directos de escritura sobre
-- stock_simple/inventario_movimientos (que siguen restringidos a admin
-- para edicion manual). cantidad_actual nunca baja de 0 (greatest).
create or replace function registrar_movimiento_stock_simple(
  p_producto_id uuid,
  p_delta numeric,
  p_tipo movimiento_tipo,
  p_referencia_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update stock_simple
  set cantidad_actual = greatest(0, cantidad_actual + p_delta)
  where producto_id = p_producto_id;

  insert into inventario_movimientos (producto_id, tipo, cantidad, referencia_id, usuario_id)
  values (p_producto_id, p_tipo, p_delta, p_referencia_id, auth.uid());
end;
$$;

grant execute on function registrar_movimiento_stock_simple(uuid, numeric, movimiento_tipo, uuid) to authenticated;

-- ============================================================================
-- FUNCIONES de botellas -- venta directa (unidad) y venta por shots (ml)
-- ============================================================================
-- Mismo motivo que registrar_movimiento_stock_simple: atomico + security
-- definer para que mesera/cajero no necesiten permisos directos sobre
-- botellas/inventario_movimientos.

-- Venta directa de botella(s) completa(s) (producto control_inventario=
-- 'licor_multiuso' vendido tal cual, ej. "Aguardiente" en la categoria
-- Licores). Todo o nada: si no hay suficientes botellas 'cerrada', rechaza.
create or replace function vender_botella_completa(
  p_producto_id uuid,
  p_cantidad int,
  p_referencia_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_botella_id uuid;
  v_disponibles int;
begin
  select count(*) into v_disponibles
  from botellas
  where producto_id = p_producto_id and estado = 'cerrada';

  if v_disponibles < p_cantidad then
    raise exception 'No hay suficientes botellas cerradas disponibles (disponibles: %, pedidas: %).', v_disponibles, p_cantidad;
  end if;

  for v_botella_id in
    select id from botellas
    where producto_id = p_producto_id and estado = 'cerrada'
    order by fecha_ingreso asc
    limit p_cantidad
  loop
    update botellas set estado = 'agotada' where id = v_botella_id;
    insert into inventario_movimientos (producto_id, botella_id, tipo, cantidad, referencia_id, usuario_id)
    values (p_producto_id, v_botella_id, 'venta', -1, p_referencia_id, auth.uid());
  end loop;
end;
$$;

grant execute on function vender_botella_completa(uuid, int, uuid) to authenticated;

-- Reversa de vender_botella_completa (anular el item): busca todos los
-- movimientos de venta con esa referencia y regresa cada botella a 'cerrada'.
create or replace function reponer_botella_completa(p_referencia_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mov inventario_movimientos;
begin
  for v_mov in
    select * from inventario_movimientos
    where referencia_id = p_referencia_id and tipo = 'venta' and botella_id is not null
  loop
    update botellas set estado = 'cerrada' where id = v_mov.botella_id;
    insert into inventario_movimientos (producto_id, botella_id, tipo, cantidad, referencia_id, usuario_id)
    values (v_mov.producto_id, v_mov.botella_id, 'anulacion', 1, p_referencia_id, auth.uid());
  end loop;
end;
$$;

grant execute on function reponer_botella_completa(uuid) to authenticated;

-- Venta por shots: descuenta ml de LA botella 'abierta_shots' del licor
-- base (por diseño se abre una sola botella a la vez para shots -- si no
-- alcanza, rechaza y hay que convertir otra botella 'cerrada' manualmente
-- desde Admin > Inventario, no se reparte automaticamente entre varias).
create or replace function vender_shot(
  p_licor_base_id uuid,
  p_ml numeric,
  p_referencia_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_botella botellas;
begin
  select * into v_botella
  from botellas
  where producto_id = p_licor_base_id and estado = 'abierta_shots'
  order by convertida_at asc nulls last
  limit 1;

  if not found or v_botella.volumen_ml_restante < p_ml then
    raise exception 'No hay suficiente volumen en la botella abierta para shots de este licor.';
  end if;

  update botellas
  set volumen_ml_restante = volumen_ml_restante - p_ml,
      estado = case when volumen_ml_restante - p_ml <= 0 then 'agotada'::botella_estado else estado end
  where id = v_botella.id;

  insert into inventario_movimientos (producto_id, botella_id, tipo, cantidad, referencia_id, usuario_id)
  values (p_licor_base_id, v_botella.id, 'venta', -p_ml, p_referencia_id, auth.uid());
end;
$$;

grant execute on function vender_shot(uuid, numeric, uuid) to authenticated;

-- Reversa de vender_shot (anular el item): regresa el ml a la botella de
-- donde salio (aunque haya quedado 'agotada') y la reabre a 'abierta_shots'.
create or replace function reponer_shot(p_referencia_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mov inventario_movimientos;
begin
  select * into v_mov
  from inventario_movimientos
  where referencia_id = p_referencia_id and tipo = 'venta' and botella_id is not null
  order by created_at desc
  limit 1;

  if not found then
    return;
  end if;

  update botellas
  set volumen_ml_restante = volumen_ml_restante + abs(v_mov.cantidad),
      estado = 'abierta_shots'
  where id = v_mov.botella_id;

  insert into inventario_movimientos (producto_id, botella_id, tipo, cantidad, referencia_id, usuario_id)
  values (v_mov.producto_id, v_mov.botella_id, 'anulacion', abs(v_mov.cantidad), p_referencia_id, auth.uid());
end;
$$;

grant execute on function reponer_shot(uuid) to authenticated;

-- Venta de coctel: descuenta ml de la botella 'abierta_coctel' de CADA
-- ingrediente de la receta (recetas_coctel). Todo o nada -- si algun
-- ingrediente no alcanza, se aborta (una excepcion sin capturar dentro de
-- una funcion plpgsql revierte automaticamente lo que ya se hubiera hecho
-- en ese mismo llamado, no hace falta un rollback manual).
create or replace function vender_coctel(
  p_producto_coctel_id uuid,
  p_cantidad int,
  p_referencia_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ingrediente record;
  v_botella botellas;
  v_ml_necesario numeric;
begin
  for v_ingrediente in
    select producto_ingrediente_id, cantidad_ml
    from recetas_coctel
    where producto_coctel_id = p_producto_coctel_id
  loop
    v_ml_necesario := v_ingrediente.cantidad_ml * p_cantidad;

    select * into v_botella
    from botellas
    where producto_id = v_ingrediente.producto_ingrediente_id and estado = 'abierta_coctel'
    order by convertida_at asc nulls last
    limit 1;

    if not found or v_botella.volumen_ml_restante < v_ml_necesario then
      raise exception 'No hay suficiente volumen abierto para cocteleria de uno de los ingredientes.';
    end if;

    update botellas
    set volumen_ml_restante = volumen_ml_restante - v_ml_necesario,
        estado = case when volumen_ml_restante - v_ml_necesario <= 0 then 'agotada'::botella_estado else estado end
    where id = v_botella.id;

    insert into inventario_movimientos (producto_id, botella_id, tipo, cantidad, referencia_id, usuario_id)
    values (v_ingrediente.producto_ingrediente_id, v_botella.id, 'venta', -v_ml_necesario, p_referencia_id, auth.uid());
  end loop;
end;
$$;

grant execute on function vender_coctel(uuid, int, uuid) to authenticated;

-- Reversa de vender_coctel: recorre TODOS los movimientos de venta con esa
-- referencia (uno por ingrediente) y regresa cada botella a 'abierta_coctel'.
create or replace function reponer_coctel(p_referencia_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mov inventario_movimientos;
begin
  for v_mov in
    select * from inventario_movimientos
    where referencia_id = p_referencia_id and tipo = 'venta' and botella_id is not null
  loop
    update botellas
    set volumen_ml_restante = volumen_ml_restante + abs(v_mov.cantidad),
        estado = 'abierta_coctel'
    where id = v_mov.botella_id;

    insert into inventario_movimientos (producto_id, botella_id, tipo, cantidad, referencia_id, usuario_id)
    values (v_mov.producto_id, v_mov.botella_id, 'anulacion', abs(v_mov.cantidad), p_referencia_id, auth.uid());
  end loop;
end;
$$;

grant execute on function reponer_coctel(uuid) to authenticated;

-- ============================================================================
-- REALTIME -- necesario para que la mesera y el preparador vean cambios
-- en pedido_items sin recargar (supabase.channel().on('postgres_changes'))
-- ============================================================================
alter publication supabase_realtime add table pedido_items;
