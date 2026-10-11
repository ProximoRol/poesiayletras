import type { Categoria } from "@/domain/textos";

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
  categoria: Categoria;
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
