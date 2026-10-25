import type { Formato } from "@/domain/textos";
import type { EstadoEncargo, Unidad } from "@/lib/correccion";

export interface Perfil {
  nombre: string;
  frase: string;
  presentacion: string;
  biografia: string;
  foto: string | null;
  instagram: string | null;
  facebook: string | null;
  whatsapp: string | null;
  correo: string | null;
  moderar_comentarios: boolean;
}

export interface Texto {
  id: string;
  slug: string;
  titulo: string;
  /** Slug del tema (columna `categoria`). */
  categoria: string;
  /** El tema del texto, leído junto con él. */
  tema: { nombre: string; formato: Formato } | null;
  cuerpo: string;
  extracto: string;
  imagen: string | null;
  estado: "borrador" | "publicado";
  publicado_en: string | null;
  actualizado_en: string;
}

export interface Comentario {
  id: string;
  texto_id: string;
  nombre: string;
  cuerpo: string;
  estado: "pendiente" | "aprobado";
  respuesta: string | null;
  creado_en: string;
}

export interface EnlaceCompra {
  tienda: string;
  url: string;
}

export interface Producto {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  foto: string | null;
  stock: number | null;
  libro_id: string | null;
  visible: boolean;
  orden: number;
}

export interface Pedido {
  id: string;
  numero: number;
  estado: "pendiente_pago" | "pagado" | "enviado" | "cancelado";
  nombre: string;
  correo: string;
  telefono: string;
  rut: string | null;
  direccion: string;
  comuna: string;
  region: string;
  notas: string;
  items: { producto_id: string; nombre: string; precio: number; cantidad: number }[];
  total: number;
  seguimiento: string | null;
  pagado_en: string | null;
  enviado_en: string | null;
  creado_en: string;
}

export interface Libro {
  id: string;
  titulo: string;
  subtitulo: string;
  anio: number | null;
  portada: string | null;
  sinopsis: string;
  enlaces: EnlaceCompra[];
  orden: number;
  visible: boolean;
}

export interface Servicio {
  id: string;
  nombre: string;
  descripcion: string;
  incluye: string[];
  /** Pesos chilenos; null = se consulta por WhatsApp. */
  precio: number | null;
  unidad: Unidad;
  minimo: number;
  nota: string;
  destacado: boolean;
  visible: boolean;
  orden: number;
}

export interface Encargo {
  id: string;
  numero: number;
  estado: EstadoEncargo;
  servicio: string;
  unidad: Unidad;
  cantidad: number;
  precio: number;
  total: number;
  nombre: string;
  correo: string;
  telefono: string;
  notas: string;
  archivo: string | null;
  archivo_nombre: string | null;
  pagado_en: string | null;
  entregado_en: string | null;
  creado_en: string;
}
