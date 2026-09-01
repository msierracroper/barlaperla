Vamos a construir un sistema de control de inventario, ventas, créditos y
utilidades para "La Perla Video Bar", un bar pequeño con dos barras y varias
mesas. Te comparto todo el contexto de negocio y técnico ya definido — léelo
completo antes de escribir código.

Adjunto tres documentos de referencia (los voy a pegar/subir a continuación):
1. `alcance-proyecto-bar.pdf` — el alcance funcional completo del negocio,
   levantado con el dueño del bar (roles, mesas/barras, flujo de pedido,
   productos/inventario, fiados, ventas/caja, gastos, reportería, dashboard).
2. `schema.sql` — el esquema completo de base de datos ya diseñado para
   Supabase (Postgres), incluyendo RLS base.
3. `especificacion-tecnica.md` — stack, arquitectura, estructura de carpetas
   y fases de desarrollo sugeridas.

## Lo que necesito que hagas

1. **Primero, resume en tus propias palabras** el alcance funcional y la
   arquitectura, para confirmar que entendiste correctamente antes de tocar
   código. Si algo del negocio no te queda claro o ves una inconsistencia
   entre los documentos, pregúntame antes de avanzar.

2. **Inicializa el proyecto** siguiendo la estructura de carpetas de
   `especificacion-tecnica.md`:
   - Next.js 14+ (App Router) + TypeScript + Tailwind CSS
   - Supabase como backend (auth + DB + realtime)
   - Configuración PWA (next-pwa o equivalente) para las áreas de mesera y
     preparador
   - Identidad visual de La Perla Video Bar (colores: azul noche `#0d2547`,
     dorado `#f2c14e`, rojo `#c41230`, verde éxito `#4fce8c`) — te comparto
     también el logo y el banner como referencia visual.

3. **Ejecuta/adapta el `schema.sql`** en el proyecto de Supabase (yo ya tengo
   el proyecto creado / lo vamos a crear juntos — dime qué necesitas de mí
   para conectarlo). Genera los tipos de TypeScript a partir del esquema.

4. **Trabajemos por fases**, siguiendo el orden de
   `especificacion-tecnica.md` sección 5 (Fase 0 → Fase 5). No avances a la
   siguiente fase sin que yo confirme que la anterior funciona bien.
   Empecemos por la **Fase 0** (setup base + auth + layout con identidad
   visual) y la **Fase 1** (operación mínima: crear producto/mesas/usuarios
   desde admin, mesera toma pedido, preparador lo recibe en tiempo real,
   cajero cierra cuenta).

5. Recuerda estas reglas de negocio clave que no se deben perder en el
   camino (están detalladas en el alcance, pero las resalto porque son las
   que más fácil se pasan por alto):
   - El **día de negocio (jornada operativa)** va de ~5pm a ~1am del día
     siguiente — las ventas de la madrugada pertenecen al día anterior, no
     al día calendario real.
   - Las **sub-cuentas se dividen por producto asignado a cada persona**, no
     por monto.
   - Los **licores tienen triple destino** (venta directa / shots /
     coctelería) y ese destino se define **manualmente por el admin** al
     convertir una botella.
   - Los **fiados descuentan inventario de inmediato** pero no cuentan como
     dinero en caja hasta que se paguen (abonos parciales permitidos).
   - El **cajero ve todas las cuentas abiertas**, no solo las marcadas como
     listas.

Cuando termines de leer todo, dame tu resumen de entendimiento y el plan
concreto para la Fase 0 antes de generar el primer archivo de código.
