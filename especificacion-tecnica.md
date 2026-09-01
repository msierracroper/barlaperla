# Especificación técnica – La Perla Video Bar

Este documento complementa el `alcance-proyecto-bar.pdf` (negocio/funcional) y el
`schema.sql` (base de datos). Aquí se define la arquitectura, el stack y el plan
de ejecución para pasar a construcción en Claude Code.

---

## 1. Stack tecnológico

| Capa | Tecnología | Notas |
|---|---|---|
| Frontend | Next.js 14+ (App Router) + TypeScript | Un solo proyecto sirve las 4 experiencias (admin, cajero, mesera, preparador), con rutas y layouts distintos por rol |
| Estilos | Tailwind CSS | Mobile first obligatorio en todos los componentes |
| PWA | `next-pwa` (o `@ducanh2912/next-pwa`) | Instalable en celular/tablet para mesera y preparador; service worker para carga rápida (no offline real, ver alcance) |
| Backend / DB | Supabase (Postgres + Auth + Realtime + RLS) | Ver `schema.sql` |
| Tiempo real | Supabase Realtime (subscripciones sobre `pedido_items` y `cuentas`) | Para que el pedido llegue automáticamente al preparador y el cajero vea cambios de estado en vivo |
| Autenticación | Supabase Auth (email/password o magic link) | `usuarios.id` referencia `auth.users.id` directamente |
| Hosting | Vercel | Deploy continuo desde el repo |
| Impresión térmica | Pendiente (fase posterior) | Diseñar el módulo de "cierre de cuenta" desacoplado para poder conectar impresión más adelante (WebUSB, servicio local, o impresora de red) sin rehacer el flujo de cobro |

---

## 2. Arquitectura general

- **Un solo repositorio Next.js**, con áreas separadas por rol vía rutas:
  - `/admin/*` — panel de administración (productos, mesas, usuarios, inventario, gastos, reportería, dashboard)
  - `/caja/*` — vista del cajero (cuentas abiertas, cobro, cierre de caja)
  - `/mesera/*` — PWA de toma de pedidos
  - `/cocina/*` (o `/barra/*`) — PWA del preparador
  - `/login` — autenticación única, redirige según el/los roles del usuario
- **Control de acceso por rol** vía RLS en Supabase (ya definido en `schema.sql`) + verificación en el middleware de Next.js para redirigir a cada quien a su área.
- **Tiempo real**: la pantalla del preparador se suscribe a `pedido_items` filtrando por `estado = 'pendiente'`; al insertar la mesera un nuevo `pedido_item`, aparece automáticamente sin recargar.
- **Concepto de "jornada operativa"**: toda pantalla que registre una venta, gasto o cierre debe resolver primero la `jornada` activa (la de `fecha_operativa` = hoy si son antes de la 1am, o la de ayer si son después de medianoche pero antes de la 1am). Esto se recomienda centralizar en una función/hook único (`useJornadaActiva()` o función SQL `jornada_activa(sede_id)`) para no duplicar esa lógica en cada pantalla.

---

## 3. Estructura de carpetas sugerida

```
la-perla-bar/
├── app/
│   ├── (auth)/
│   │   └── login/
│   ├── admin/
│   │   ├── dashboard/
│   │   ├── productos/
│   │   ├── mesas/
│   │   ├── usuarios/
│   │   ├── inventario/
│   │   ├── gastos/
│   │   ├── reportes/
│   │   └── layout.tsx
│   ├── caja/
│   │   ├── cuentas/
│   │   ├── cierre/
│   │   └── layout.tsx
│   ├── mesera/
│   │   ├── mesas/
│   │   ├── barra/
│   │   └── layout.tsx
│   ├── cocina/
│   │   └── layout.tsx
│   └── layout.tsx
├── components/
│   ├── ui/              (botones, cards, inputs reutilizables)
│   ├── cuentas/
│   ├── productos/
│   └── reportes/
├── lib/
│   ├── supabase/        (cliente browser + server + tipos generados)
│   ├── jornada.ts        (lógica de fecha operativa)
│   └── inventario.ts     (lógica de conversión de botellas, descuentos)
├── hooks/
│   ├── useRealtimePedidos.ts
│   └── useJornadaActiva.ts
├── types/
│   └── database.types.ts (generado con `supabase gen types typescript`)
├── public/
│   ├── manifest.json      (PWA)
│   └── icons/             (logo La Perla en varios tamaños)
├── schema.sql              (el que ya tenemos)
└── middleware.ts            (protección de rutas por rol)
```

---

## 4. Identidad visual a aplicar en el desarrollo

Basado en el logo y banner de **La Perla Video Bar**:

- **Azul noche** `#0d2547` / `#0a1830` — fondo principal, headers
- **Dorado** `#f2c14e` — acentos, totales, títulos destacados
- **Rojo** `#c41230` — botones de acción principal (cobrar, agregar, marcar listo)
- **Verde** `#1f6f4a` / `#4fce8c` — estados positivos (listo, activa, pagado)
- Tipografía sans-serif limpia para toda la UI (el estilo "cartel" del logo se queda solo en el logo, no se replica en la tipografía del sistema)
- Logo en el header de cada una de las 4 áreas (admin, caja, mesera, cocina)

---

## 5. Fases sugeridas de desarrollo (MVP incremental)

### Fase 0 — Base del proyecto
- Setup Next.js + Tailwind + Supabase + repositorio + deploy inicial en Vercel
- Ejecutar `schema.sql` en Supabase
- Autenticación + login + protección de rutas por rol
- Layout base con identidad visual de La Perla

### Fase 1 — Operación mínima viable
- Admin: crear productos, categorías, mesas, sillas de barra, usuarios
- Mesera: abrir cuenta, tomar pedido, ver estado
- Preparador: recibir pedido en tiempo real, marcar listo
- Cajero: ver cuentas abiertas, cerrar cuenta con pago simple (efectivo/transferencia)
- Apertura y cierre de caja diario básico

### Fase 2 — Reglas de negocio completas
- Sub-cuentas por producto (división de cuenta)
- Unión de mesas / movimiento de cuenta entre mesas o sillas
- Modificadores (michelada, etc.)
- Anulaciones con devolución a inventario
- Fiados (clientes, abonos parciales, cuentas por cobrar)

### Fase 3 — Inventario avanzado
- Control de botellas de licor (venta directa / shots / coctelería) con conversión manual
- Recetas de cóctel con descuento automático de ingredientes
- Alertas de stock mínimo y bloqueo automático al llegar a 0
- Registro de gastos con costo ligado a producto (costo promedio)

### Fase 4 — Reportería y dashboard
- Dashboard dinámico del admin (todos los indicadores definidos en el alcance)
- Reportes diario/semanal/mensual/rango personalizado: más vendidos, ventas por horario, por mesa/silla, por mesero, utilidades, anulaciones, histórico de cierres

### Fase 5 — Pulido y PWA
- Instalación PWA en dispositivos de mesera y preparador
- Ajustes de UX mobile-first, pruebas con el equipo real del bar
- Preparar el punto de integración para impresión térmica (aún sin impresora definida)

> Sugerencia: cada fase es un buen punto de corte para que Claude Code trabaje de forma incremental, probando y ajustando antes de avanzar a la siguiente.

---

## 6. Decisiones ya tomadas (no reabrir sin razón de peso)

- Costo de inventario: **promedio/actual simplificado**, no por lote.
- Fiados: informales en autorización, pero con **registro formal y trazable**; permiten **abonos parciales**; descuentan inventario **de inmediato**.
- Sin propinas, sin descuentos/cortesías, sin modo offline, sin exportación de reportes — todo en el alcance inicial.
- Transferencia como **método único genérico** (no se diferencia Nequi/Daviplata/etc.).
- Jornada operativa: **17:00 a 01:00** del día siguiente cuenta como un solo "día de negocio".

Estas decisiones ya fueron validadas con el dueño del bar durante el levantamiento de alcance — están documentadas con su justificación en `alcance-proyecto-bar.pdf`.
