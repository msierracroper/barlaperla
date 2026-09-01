# Alcance del Proyecto - La Perla Video Bar

Documento de Alcance del Proyecto
Sistema de Control de Inventario, Ventas, Créditos y Utilidades — La Perla Video Bar

Versión: 1.0 (Levantamiento inicial) — Fecha: Agosto 2026

> Transcrito desde `alcance-proyecto-barV2.pdf` para tenerlo como texto de referencia junto al resto de la documentación técnica del proyecto.

---

## 1. Visión general del proyecto

Sistema de gestión integral para un bar de tamaño pequeño-mediano, con dos barras (aprox. 8 sillas c/u, configurable) y mesas (aprox. 5, configurable), que permite controlar el flujo completo de operación: toma de pedidos, preparación, cobro, inventario (incluyendo control por unidad y por volumen para licores), créditos informales (fiados), gastos, y reportería/utilidades — todo en tiempo real y accesible desde dispositivos móviles, tablet y PC (enfoque **mobile first**).

Stack tecnológico definido: PWA (mesera/preparador en móvil, cajero en web PC/tablet, admin en web), Supabase (backend/DB), Vercel (despliegue). Sistema **100% online** (no requiere modo offline).

Diseño pensado a futuro: aunque hoy es un solo local, el modelo de datos contemplará el concepto de "sede" desde el inicio para facilitar una eventual expansión multi-sede.

## 2. Roles y usuarios

| Rol | Descripción |
|---|---|
| Administrador | Acceso total: gestión de productos, mesas/sillas, usuarios, inventario, gastos, reportería y dashboard. |
| Mesera | Toma pedidos en mesa/barra desde dispositivo móvil, visualiza estado de preparación, gestiona cuentas y sub-cuentas. |
| Preparador/Alistador | Recibe pedidos en tiempo real, marca productos como "listos", ve a qué mesa/silla corresponde cada preparación. |
| Cajero | Visualiza todas las cuentas abiertas (mesa/barra), cierra cuentas, gestiona pagos (efectivo/transferencia/mixto/fiado), autoriza fiados, registra gastos y anulaciones. |

Reglas:
- Un mismo usuario puede tener más de un rol asignado simultáneamente (ej: mesera que también prepara).
- Pueden trabajar varias meseras en simultáneo.
- No se manejan turnos formales; existe una sola jornada de trabajo por día.
- **Jornada operativa (día de negocio)**: de ~5:00 p.m. a ~1:00 a.m. del día siguiente. Se maneja el concepto de "fecha operativa", distinta de la fecha calendario, para que las ventas de la madrugada se contabilicen dentro del día de negocio correspondiente (no como un nuevo día).

## 3. Mesas y barras

- Configuración inicial: ~5 mesas, 2 barras (~8 sillas c/u) — totalmente editable/ampliable por el admin vía módulo de gestión de mesas y sillas.
- Cada silla de barra tiene numeración individual.
- Cuentas flexibles en barra: una cuenta puede agrupar varias sillas (ej: sillas 3, 4 y 5 = una sola cuenta).
- Independencia total entre cuentas de mesa y cuentas de barra.
- Unión de mesas: se pueden combinar 2+ mesas en una sola cuenta.
- Movimiento de cuentas: una cuenta puede reasignarse de una mesa/silla a otra.
- División en sub-cuentas por producto (no por monto): cada sub-cuenta se arma asignando productos específicos a una persona (ej: Juan = 2 aguardientes, Pedro = 5 cervezas). La mesera visualiza el total general y un resumen por sub-cuenta.
- Pagos por sub-cuenta: cada sub-cuenta puede pagarse en efectivo, transferencia o mixto, de forma independiente.

## 4. Flujo operativo del pedido

1. La mesera registra el pedido en tiempo real desde su dispositivo móvil (PWA), apenas lo toma en mesa o barra.
2. El pedido aparece automáticamente en la pantalla del preparador, sin intervención manual de aviso.
3. El preparador visualiza a qué mesa/silla corresponde cada pedido y marca como "listo" cuando termina, para que la mesera sepa que debe entregarlo.
4. Los pedidos son acumulativos: una misma cuenta puede recibir múltiples rondas a lo largo de la jornada.
5. El cajero tiene visibilidad total de todas las cuentas abiertas (mesas y barras), no solo las marcadas como listas para cobrar — permitiendo mayor flexibilidad operativa.
6. El cajero cierra la cuenta (o sub-cuenta) registrando el método de pago correspondiente.

## 5. Productos e inventario

### 5.1 Estructura de productos

- Categorías configurables libremente por el admin (ej: Cerveza botella, Cerveza lata, Licores, Agua con gas, Cócteles enlatados, Gatorade, etc.).
- **Modificadores/adicionales**: ítems con precio propio que se suman al producto base (ej: Cerveza $5.000 + Michelada (adicional) $2.000 = $7.000). **No descuentan inventario propio por ahora** (se maneja como gasto/insumo genérico a definir más adelante).
- Cócteles: tienen receta definida por ingrediente en ml/oz, y su venta descuenta automáticamente cada insumo de su inventario respectivo.

### 5.2 Inventario de licores (doble nivel de control)

Una misma referencia de licor (ej: Aguardiente) puede tener varias botellas en stock, y cada botella se destina individualmente a uno de tres usos:
1. Venta directa de botella completa (descuento por unidad).
2. Venta por shots (botella "abierta", descuento por volumen — medida fija mediante dispensador, parametrizable en el sistema).
3. Uso en coctelería (descuento por volumen según receta).

- La conversión/traslado de una botella de "venta directa" a "abierta para shots/coctelería" la realiza **manualmente el Administrador**.
- El tamaño del shot es fijo (definido por dispensador) y se maneja como **parámetro configurable** en el sistema.

### 5.3 Resto de productos (cervezas, aguas, enlatados, etc.)

- Control simple por unidad individual (sin conversión de cajas/presentaciones).
- Ingreso de inventario solo por unidad (ej: entran 50 botellas, no "1 caja de 24").
- Stock mínimo configurable por producto, con alerta cuando se alcanza el umbral.
- Bloqueo automático de venta cuando el stock llega a 0.

### 5.4 Costeo

- Cada ingreso de inventario registra el costo unitario de compra.
- Cuando el costo varía entre compras, el sistema mantiene un **costo promedio/actual simplificado** por producto (no por lote), usado para calcular márgenes de utilidad.

## 6. Créditos / Fiados (Cuentas por cobrar)

- Manejo informal en la práctica (solo a personas de confianza del dueño), pero con **registro formal en el sistema** para trazabilidad.
- Se identifica al cliente por nombre (registro simple, sin cédula ni validaciones complejas), creando una lista de "clientes de fiado" reutilizable.
- Sin límite de crédito predefinido.
- Autorización de fiar: rol Admin o Cajero con permiso, quedando registrado quién lo autorizó (aunque la decisión real se tome de palabra).
- El fiado descuenta inventario inmediatamente (el producto salió físicamente).
- El fiado **no** se contabiliza como dinero en caja en el cierre del día; queda en estado "Pendiente por cobrar".
- Se permiten abonos parciales (no exige pago único total).
- Módulo de Cuentas por Cobrar: listado con cliente, productos/monto, fecha, quién autorizó, días transcurridos, estado (pendiente/abonado/pagado), registro de pagos/abonos.
- Visible como indicador en el dashboard del admin (total pendiente, monto y cantidad de cuentas, la más antigua destacada).

## 7. Ventas, pagos y caja

- Métodos de pago: efectivo, transferencia (genérica, sin diferenciar entidad), mixto (parte efectivo + parte transferencia), fiado — aplicable a nivel de cuenta o sub-cuenta.
- Apertura de caja: registro de base inicial de efectivo al comenzar la jornada (~5 p.m.).
- Cierre de caja: arqueo al final de la jornada (~1 a.m.), comparando efectivo físico contado vs. lo calculado por el sistema.
- Propinas: no se gestionan dentro del sistema (quedan directamente para el personal).
- Anulaciones: Admin y Cajero pueden anular un pedido/producto no servido; el ítem regresa automáticamente al inventario; queda registro de quién anuló (y motivo, para trazabilidad en reportes).
- Descuentos/cortesías: fuera del alcance inicial (posible mejora futura).
- Impresión de factura: al cerrar la cuenta, el cajero podrá enviar a imprimir el tiquet/factura a una impresora térmica (modelo pendiente de definir). Solo se imprime la factura final del cliente — no se imprimen comandas físicas (estas son 100% digitales). Se diseñará la integración de impresión como un módulo desacoplado, fácil de conectar cuando se defina el hardware.

## 8. Gastos

- Categorías configurables por el admin (ej: insumos, servicios públicos, arriendo, nómina, mantenimiento, compra de inventario, otros).
- Registro con información básica: fecha, monto, descripción, categoría (sin foto de recibo ni número de factura, por ahora).
- Pueden registrar gastos tanto el Admin como el Cajero.
- El costo de compra de inventario queda ligado al producto (no solo como gasto suelto), para alimentar el cálculo de márgenes/utilidad por producto.

## 9. Reportería

Reportes incluidos en el alcance:
- Productos más vendidos / menos vendidos
- Ventas por horario
- Ventas por mesa / silla
- Ventas por mesero (productividad)
- Reporte de utilidades (venta - costo - gastos)
- Cuentas por cobrar (fiados)
- Inventario (stock actual y alertas de mínimo)
- Gastos por categoría
- Reporte de anulaciones
- Histórico de cierres de caja

Periodicidad: diario, semanal, mensual y por rango de fechas personalizado, donde aplique (algunos reportes como el cierre de caja son naturalmente diarios, pero consultables en histórico por rango).

Exportación: no incluida en el alcance inicial — solo visualización en pantalla.

## 10. Dashboard / Resumen diario dinámico (panel del Admin)

Indicadores principales a mostrar al ingresar:
- Venta total del día (desglosada: efectivo / transferencia / fiado)
- Mesas y barras abiertas actualmente
- Total de fiados pendientes (monto y cantidad de cuentas)
- Top 5 productos más vendidos del día
- Alertas de inventario bajo o agotado
- Gastos del día
- Utilidad estimada del día (venta - costo - gastos)
- Comparativo con el mismo día de la semana anterior

## 11. Muestra visual de interfaz (mockups de prueba)

Mockups de referencia de "look and feel" (no diseño final) de las 4 pantallas principales, con la identidad visual de La Perla Video Bar:

### 11.1 Pantalla de la mesera — Toma de pedido
Vista móvil: header con logo, tabs (Mesas / Barra 1 / Barra 2), estado de la mesa ("Mesa 3 · Activa · Abierta hace 42 min"), lista de ítems del pedido con precios, total, resumen por sub-cuenta (Juan: 2 shots · $8.000 — Pedro: 2 cerv + mich · $17.000), botón rojo "+ Agregar producto".

### 11.2 Pantalla del preparador — Comandas en tiempo real
Vista móvil: lista "Comandas pendientes" con tarjetas por mesa/silla ("Barra 1 · Silla 4-5", "Mesa 3"), tiempo transcurrido, detalle de ítems, botón rojo "Marcar listo"; los ya listos se muestran atenuados con check verde.

### 11.3 Pantalla del cajero — Cuentas abiertas y cierre
Vista escritorio/tablet: grid de cuentas abiertas con badge de estado ("Lista" / "En curso"), monto, botón "Cobrar" o "Ver cuenta"; panel de "Cierre de caja" con desglose Efectivo / Transferencia / Fiado.

### 11.4 Panel del administrador — Resumen diario dinámico
Vista escritorio: header "Resumen del día · viernes 28 ago", tarjetas KPI (Venta total, Utilidad estimada, Mesas/barras abiertas, Fiados pendientes con cantidad de cuentas), tabla "Top 5 productos del día", panel de "Alertas de inventario" con severidad por color (rojo=crítico, amarillo=bajo, verde=normal).

## 12. Aspectos técnicos

- Enfoque mobile first: experiencia optimizada para celular, adaptable a tablet y PC, para todos los roles.
- PWA para mesera y preparador (uso intensivo en móvil); acceso web para cajero (PC/tablet) y admin.
- Sistema 100% online — no se contempla modo offline en esta fase.
- Un solo local/sede actualmente, pero modelo de datos preparado para escalar a multi-sede en el futuro.
- Stack: Supabase (base de datos y backend) + Vercel (despliegue).
- Impresión térmica: integración a definir una vez se conozca el modelo de impresora.

## 13. Fuera de alcance (fase inicial)

- Modo offline / sincronización sin conexión.
- Exportación de reportes (PDF/Excel).
- Descuentos y cortesías.
- Gestión de propinas dentro del sistema.
- Impresión de comandas físicas.
- Multi-sede activo (solo preparado en el modelo de datos).
- Diferenciación de medios de transferencia (Nequi, Daviplata, etc.).
- Fotos de recibos o número de factura en gastos.

## 14. Próximos pasos sugeridos

1. Validar este documento de alcance en su totalidad.
2. Definir modelo de datos (entidades y relaciones) basado en este alcance.
3. Priorizar módulos para un posible desarrollo por fases (MVP vs. incrementos).
4. Diseño de UI/UX mobile-first para cada rol.
5. Definir arquitectura técnica detallada sobre Supabase + Vercel.
