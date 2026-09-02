// Tipos de la base de datos de La Perla Soft.
//
// Escritos a mano a partir de schema.sql para poder arrancar el desarrollo
// sin depender del MCP de Supabase (proyecto de cliente, conexion manual).
// Una vez el schema este aplicado en el proyecto real, se recomienda
// regenerar este archivo con la CLI de Supabase para que quede 100%
// sincronizado:
//
//   supabase gen types typescript --project-id cdhvdhjronhfrkitfmop --schema public > types/database.types.ts
//
// o desde el Dashboard: Project Settings -> API -> "Generate types".

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type RolTipo = "admin" | "mesera" | "preparador" | "cajero";
export type JornadaEstado = "abierta" | "cerrada";
export type CuentaTipo = "mesa" | "barra";
export type CuentaEstado =
  | "abierta"
  | "lista_para_cobrar"
  | "cerrada"
  | "anulada";
export type SubcuentaEstado = "abierta" | "cerrada";
export type ControlInventarioTipo = "simple" | "licor_multiuso" | "receta";
export type BotellaEstado =
  | "cerrada"
  | "abierta_shots"
  | "abierta_coctel"
  | "agotada";
export type MovimientoTipo =
  | "ingreso"
  | "venta"
  | "anulacion"
  | "fiado"
  | "conversion_botella"
  | "merma"
  | "ajuste";
export type PedidoItemEstado = "pendiente" | "listo" | "entregado" | "anulado";
export type MetodoPago = "efectivo" | "transferencia" | "mixto" | "fiado";
export type FiadoEstado = "pendiente" | "abonado_parcial" | "pagado";

export interface Database {
  public: {
    Tables: {
      sedes: {
        Row: {
          id: string;
          nombre: string;
          direccion: string | null;
          telefono: string | null;
          activa: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          nombre: string;
          direccion?: string | null;
          telefono?: string | null;
          activa?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          nombre?: string;
          direccion?: string | null;
          telefono?: string | null;
          activa?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      usuarios: {
        Row: {
          id: string;
          sede_id: string;
          nombre: string;
          telefono: string | null;
          activo: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          sede_id: string;
          nombre: string;
          telefono?: string | null;
          activo?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          sede_id?: string;
          nombre?: string;
          telefono?: string | null;
          activo?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      usuario_roles: {
        Row: {
          usuario_id: string;
          rol: RolTipo;
        };
        Insert: {
          usuario_id: string;
          rol: RolTipo;
        };
        Update: {
          usuario_id?: string;
          rol?: RolTipo;
        };
        Relationships: [
          {
            foreignKeyName: "usuario_roles_usuario_id_fkey";
            columns: ["usuario_id"];
            isOneToOne: false;
            referencedRelation: "usuarios";
            referencedColumns: ["id"];
          },
        ];
      };
      jornadas: {
        Row: {
          id: string;
          sede_id: string;
          fecha_operativa: string;
          estado: JornadaEstado;
          base_caja_inicial: number;
          efectivo_contado: number | null;
          diferencia_caja: number | null;
          usuario_apertura_id: string | null;
          usuario_cierre_id: string | null;
          abierta_at: string;
          cerrada_at: string | null;
        };
        Insert: {
          id?: string;
          sede_id: string;
          fecha_operativa: string;
          estado?: JornadaEstado;
          base_caja_inicial?: number;
          efectivo_contado?: number | null;
          diferencia_caja?: number | null;
          usuario_apertura_id?: string | null;
          usuario_cierre_id?: string | null;
          abierta_at?: string;
          cerrada_at?: string | null;
        };
        Update: {
          id?: string;
          sede_id?: string;
          fecha_operativa?: string;
          estado?: JornadaEstado;
          base_caja_inicial?: number;
          efectivo_contado?: number | null;
          diferencia_caja?: number | null;
          usuario_apertura_id?: string | null;
          usuario_cierre_id?: string | null;
          abierta_at?: string;
          cerrada_at?: string | null;
        };
        Relationships: [];
      };
      mesas: {
        Row: {
          id: string;
          sede_id: string;
          numero: string;
          activa: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          sede_id: string;
          numero: string;
          activa?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          sede_id?: string;
          numero?: string;
          activa?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      barras: {
        Row: {
          id: string;
          sede_id: string;
          nombre: string;
          activa: boolean;
        };
        Insert: {
          id?: string;
          sede_id: string;
          nombre: string;
          activa?: boolean;
        };
        Update: {
          id?: string;
          sede_id?: string;
          nombre?: string;
          activa?: boolean;
        };
        Relationships: [];
      };
      sillas_barra: {
        Row: {
          id: string;
          barra_id: string;
          numero: string;
          activa: boolean;
        };
        Insert: {
          id?: string;
          barra_id: string;
          numero: string;
          activa?: boolean;
        };
        Update: {
          id?: string;
          barra_id?: string;
          numero?: string;
          activa?: boolean;
        };
        Relationships: [];
      };
      cuentas: {
        Row: {
          id: string;
          sede_id: string;
          jornada_id: string;
          tipo: CuentaTipo;
          estado: CuentaEstado;
          creado_por: string;
          created_at: string;
          cerrada_at: string | null;
        };
        Insert: {
          id?: string;
          sede_id: string;
          jornada_id: string;
          tipo: CuentaTipo;
          estado?: CuentaEstado;
          creado_por: string;
          created_at?: string;
          cerrada_at?: string | null;
        };
        Update: {
          id?: string;
          sede_id?: string;
          jornada_id?: string;
          tipo?: CuentaTipo;
          estado?: CuentaEstado;
          creado_por?: string;
          created_at?: string;
          cerrada_at?: string | null;
        };
        Relationships: [];
      };
      cuenta_ubicaciones: {
        Row: {
          id: string;
          cuenta_id: string;
          mesa_id: string | null;
          silla_barra_id: string | null;
        };
        Insert: {
          id?: string;
          cuenta_id: string;
          mesa_id?: string | null;
          silla_barra_id?: string | null;
        };
        Update: {
          id?: string;
          cuenta_id?: string;
          mesa_id?: string | null;
          silla_barra_id?: string | null;
        };
        Relationships: [];
      };
      subcuentas: {
        Row: {
          id: string;
          cuenta_id: string;
          nombre_cliente: string;
          estado: SubcuentaEstado;
          created_at: string;
        };
        Insert: {
          id?: string;
          cuenta_id: string;
          nombre_cliente?: string;
          estado?: SubcuentaEstado;
          created_at?: string;
        };
        Update: {
          id?: string;
          cuenta_id?: string;
          nombre_cliente?: string;
          estado?: SubcuentaEstado;
          created_at?: string;
        };
        Relationships: [];
      };
      categorias_producto: {
        Row: {
          id: string;
          sede_id: string;
          nombre: string;
          activa: boolean;
        };
        Insert: {
          id?: string;
          sede_id: string;
          nombre: string;
          activa?: boolean;
        };
        Update: {
          id?: string;
          sede_id?: string;
          nombre?: string;
          activa?: boolean;
        };
        Relationships: [];
      };
      productos: {
        Row: {
          id: string;
          sede_id: string;
          categoria_id: string | null;
          nombre: string;
          precio_venta: number;
          costo_promedio: number;
          control_inventario: ControlInventarioTipo;
          stock_minimo: number | null;
          activo: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          sede_id: string;
          categoria_id?: string | null;
          nombre: string;
          precio_venta: number;
          costo_promedio?: number;
          control_inventario?: ControlInventarioTipo;
          stock_minimo?: number | null;
          activo?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          sede_id?: string;
          categoria_id?: string | null;
          nombre?: string;
          precio_venta?: number;
          costo_promedio?: number;
          control_inventario?: ControlInventarioTipo;
          stock_minimo?: number | null;
          activo?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "productos_categoria_id_fkey";
            columns: ["categoria_id"];
            isOneToOne: false;
            referencedRelation: "categorias_producto";
            referencedColumns: ["id"];
          },
        ];
      };
      modificadores: {
        Row: {
          id: string;
          sede_id: string;
          nombre: string;
          precio_adicional: number;
          activo: boolean;
        };
        Insert: {
          id?: string;
          sede_id: string;
          nombre: string;
          precio_adicional?: number;
          activo?: boolean;
        };
        Update: {
          id?: string;
          sede_id?: string;
          nombre?: string;
          precio_adicional?: number;
          activo?: boolean;
        };
        Relationships: [];
      };
      producto_modificadores: {
        Row: {
          producto_id: string;
          modificador_id: string;
        };
        Insert: {
          producto_id: string;
          modificador_id: string;
        };
        Update: {
          producto_id?: string;
          modificador_id?: string;
        };
        Relationships: [];
      };
      stock_simple: {
        Row: {
          producto_id: string;
          cantidad_actual: number;
        };
        Insert: {
          producto_id: string;
          cantidad_actual?: number;
        };
        Update: {
          producto_id?: string;
          cantidad_actual?: number;
        };
        Relationships: [];
      };
      botellas: {
        Row: {
          id: string;
          producto_id: string;
          estado: BotellaEstado;
          volumen_ml_total: number;
          volumen_ml_restante: number;
          costo_unitario: number;
          fecha_ingreso: string;
          convertida_por: string | null;
          convertida_at: string | null;
        };
        Insert: {
          id?: string;
          producto_id: string;
          estado?: BotellaEstado;
          volumen_ml_total?: number;
          volumen_ml_restante?: number;
          costo_unitario: number;
          fecha_ingreso?: string;
          convertida_por?: string | null;
          convertida_at?: string | null;
        };
        Update: {
          id?: string;
          producto_id?: string;
          estado?: BotellaEstado;
          volumen_ml_total?: number;
          volumen_ml_restante?: number;
          costo_unitario?: number;
          fecha_ingreso?: string;
          convertida_por?: string | null;
          convertida_at?: string | null;
        };
        Relationships: [];
      };
      recetas_coctel: {
        Row: {
          id: string;
          producto_coctel_id: string;
          producto_ingrediente_id: string;
          cantidad_ml: number;
        };
        Insert: {
          id?: string;
          producto_coctel_id: string;
          producto_ingrediente_id: string;
          cantidad_ml: number;
        };
        Update: {
          id?: string;
          producto_coctel_id?: string;
          producto_ingrediente_id?: string;
          cantidad_ml?: number;
        };
        Relationships: [];
      };
      inventario_movimientos: {
        Row: {
          id: string;
          producto_id: string;
          botella_id: string | null;
          tipo: MovimientoTipo;
          cantidad: number;
          costo_unitario: number | null;
          referencia_id: string | null;
          usuario_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          producto_id: string;
          botella_id?: string | null;
          tipo: MovimientoTipo;
          cantidad: number;
          costo_unitario?: number | null;
          referencia_id?: string | null;
          usuario_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          producto_id?: string;
          botella_id?: string | null;
          tipo?: MovimientoTipo;
          cantidad?: number;
          costo_unitario?: number | null;
          referencia_id?: string | null;
          usuario_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      pedido_items: {
        Row: {
          id: string;
          subcuenta_id: string;
          producto_id: string;
          modificador_id: string | null;
          cantidad: number;
          precio_unitario: number;
          precio_modificador: number | null;
          estado: PedidoItemEstado;
          creado_por: string;
          preparado_por: string | null;
          preparado_at: string | null;
          entregado_at: string | null;
          anulado: boolean;
          motivo_anulacion: string | null;
          anulado_por: string | null;
          anulado_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          subcuenta_id: string;
          producto_id: string;
          modificador_id?: string | null;
          cantidad?: number;
          precio_unitario: number;
          precio_modificador?: number | null;
          estado?: PedidoItemEstado;
          creado_por: string;
          preparado_por?: string | null;
          preparado_at?: string | null;
          entregado_at?: string | null;
          anulado?: boolean;
          motivo_anulacion?: string | null;
          anulado_por?: string | null;
          anulado_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          subcuenta_id?: string;
          producto_id?: string;
          modificador_id?: string | null;
          cantidad?: number;
          precio_unitario?: number;
          precio_modificador?: number | null;
          estado?: PedidoItemEstado;
          creado_por?: string;
          preparado_por?: string | null;
          preparado_at?: string | null;
          entregado_at?: string | null;
          anulado?: boolean;
          motivo_anulacion?: string | null;
          anulado_por?: string | null;
          anulado_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pedido_items_producto_id_fkey";
            columns: ["producto_id"];
            isOneToOne: false;
            referencedRelation: "productos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pedido_items_subcuenta_id_fkey";
            columns: ["subcuenta_id"];
            isOneToOne: false;
            referencedRelation: "subcuentas";
            referencedColumns: ["id"];
          },
        ];
      };
      pagos: {
        Row: {
          id: string;
          subcuenta_id: string;
          metodo: MetodoPago;
          monto_efectivo: number;
          monto_transferencia: number;
          monto_fiado: number;
          monto_total: number;
          registrado_por: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          subcuenta_id: string;
          metodo: MetodoPago;
          monto_efectivo?: number;
          monto_transferencia?: number;
          monto_fiado?: number;
          monto_total: number;
          registrado_por: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          subcuenta_id?: string;
          metodo?: MetodoPago;
          monto_efectivo?: number;
          monto_transferencia?: number;
          monto_fiado?: number;
          monto_total?: number;
          registrado_por?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      clientes_fiado: {
        Row: {
          id: string;
          sede_id: string;
          nombre: string;
          telefono: string | null;
          activo: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          sede_id: string;
          nombre: string;
          telefono?: string | null;
          activo?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          sede_id?: string;
          nombre?: string;
          telefono?: string | null;
          activo?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      fiados: {
        Row: {
          id: string;
          pago_id: string;
          cliente_fiado_id: string;
          monto_total: number;
          monto_pagado: number;
          estado: FiadoEstado;
          autorizado_por: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          pago_id: string;
          cliente_fiado_id: string;
          monto_total: number;
          monto_pagado?: number;
          estado?: FiadoEstado;
          autorizado_por: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          pago_id?: string;
          cliente_fiado_id?: string;
          monto_total?: number;
          monto_pagado?: number;
          estado?: FiadoEstado;
          autorizado_por?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      fiado_abonos: {
        Row: {
          id: string;
          fiado_id: string;
          monto: number;
          registrado_por: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          fiado_id: string;
          monto: number;
          registrado_por: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          fiado_id?: string;
          monto?: number;
          registrado_por?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      gastos_categorias: {
        Row: {
          id: string;
          sede_id: string;
          nombre: string;
          activa: boolean;
        };
        Insert: {
          id?: string;
          sede_id: string;
          nombre: string;
          activa?: boolean;
        };
        Update: {
          id?: string;
          sede_id?: string;
          nombre?: string;
          activa?: boolean;
        };
        Relationships: [];
      };
      gastos: {
        Row: {
          id: string;
          sede_id: string;
          jornada_id: string | null;
          categoria_id: string | null;
          monto: number;
          descripcion: string | null;
          registrado_por: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          sede_id: string;
          jornada_id?: string | null;
          categoria_id?: string | null;
          monto: number;
          descripcion?: string | null;
          registrado_por: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          sede_id?: string;
          jornada_id?: string | null;
          categoria_id?: string | null;
          monto?: number;
          descripcion?: string | null;
          registrado_por?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      parametros_sistema: {
        Row: {
          sede_id: string;
          clave: string;
          valor: string;
        };
        Insert: {
          sede_id: string;
          clave: string;
          valor: string;
        };
        Update: {
          sede_id?: string;
          clave?: string;
          valor?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      tiene_rol: {
        Args: { rol_buscado: RolTipo };
        Returns: boolean;
      };
      jornada_activa: {
        Args: { p_sede_id: string };
        Returns: Database["public"]["Tables"]["jornadas"]["Row"];
      };
    };
    Enums: {
      rol_tipo: RolTipo;
      jornada_estado: JornadaEstado;
      cuenta_tipo: CuentaTipo;
      cuenta_estado: CuentaEstado;
      subcuenta_estado: SubcuentaEstado;
      control_inventario_tipo: ControlInventarioTipo;
      botella_estado: BotellaEstado;
      movimiento_tipo: MovimientoTipo;
      pedido_item_estado: PedidoItemEstado;
      metodo_pago: MetodoPago;
      fiado_estado: FiadoEstado;
    };
    CompositeTypes: Record<string, never>;
  };
}

export type JornadaRow = Database["public"]["Tables"]["jornadas"]["Row"];
