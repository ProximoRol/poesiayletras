import "server-only";

import { cache } from "react";
import { hayBase } from "./env";
import { publico } from "./supabase";
import type { Tema } from "@/domain/textos";
import type { Comentario, Libro, Perfil, Producto, Servicio, Texto } from "./tipos";

// Lecturas públicas. Sin base configurada devuelven lo mínimo para que el sitio se vea.

export const PERFIL_VACIO: Perfil = {
  nombre: "Wagner Pérez Eulufí",
  frase: "Poesía para leer despacio.",
  presentacion: "",
  biografia: "",
  foto: null,
  instagram: "https://www.instagram.com/wagnerperezeulufi/",
  facebook: null,
  whatsapp: null,
  correo: null,
  moderar_comentarios: false,
};

const CAMPOS_TEXTO = "id, slug, titulo, categoria, tema:temas(nombre, formato), cuerpo, extracto, imagen, estado, publicado_en, actualizado_en";

/** Todos los temas, en el orden que eligió el autor. */
export const temas = cache(async (): Promise<Tema[]> => {
  if (!hayBase()) return [];
  const { data, error } = await publico().from("temas").select("slug, nombre, formato, orden").order("orden").order("nombre");
  if (error) throw error;
  return (data ?? []) as Tema[];
});

/** Temas con al menos un texto publicado: son los filtros de la página. */
export const temasConTextos = cache(async (): Promise<Tema[]> => {
  if (!hayBase()) return [];
  const [todos, { data, error }] = await Promise.all([temas(), publico().from("textos").select("categoria").eq("estado", "publicado")]);
  if (error) throw error;
  const usados = new Set((data ?? []).map((t) => t.categoria as string));
  return todos.filter((t) => usados.has(t.slug));
});

export const perfil = cache(async (): Promise<Perfil> => {
  if (!hayBase()) return PERFIL_VACIO;
  const { data, error } = await publico().from("perfil").select("*").eq("id", 1).maybeSingle();
  if (error) throw error;
  return (data as Perfil | null) ?? PERFIL_VACIO;
});

export async function textosPublicados(opciones: { limite?: number; categoria?: string } = {}): Promise<Texto[]> {
  if (!hayBase()) return [];
  let q = publico().from("textos").select(CAMPOS_TEXTO).eq("estado", "publicado").order("publicado_en", { ascending: false });
  if (opciones.categoria) q = q.eq("categoria", opciones.categoria);
  if (opciones.limite) q = q.limit(opciones.limite);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as Texto[];
}

export const textoPublicado = cache(async (slug: string): Promise<Texto | null> => {
  if (!hayBase()) return null;
  const { data, error } = await publico().from("textos").select(CAMPOS_TEXTO).eq("slug", slug).eq("estado", "publicado").maybeSingle();
  if (error) throw error;
  return data as unknown as Texto | null;
});

export async function comentariosAprobados(textoId: string): Promise<Comentario[]> {
  if (!hayBase()) return [];
  const { data, error } = await publico()
    .from("comentarios")
    .select("id, texto_id, nombre, cuerpo, estado, respuesta, creado_en")
    .eq("texto_id", textoId)
    .eq("estado", "aprobado")
    .order("creado_en", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Comentario[];
}

export async function librosVisibles(): Promise<Libro[]> {
  if (!hayBase()) return [];
  const { data, error } = await publico().from("libros").select("*").eq("visible", true).order("orden").order("creado_en", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Libro[];
}

export const productosVisibles = cache(async (): Promise<Producto[]> => {
  if (!hayBase()) return [];
  const { data, error } = await publico().from("productos").select("*").eq("visible", true).order("orden").order("creado_en");
  if (error) throw error;
  return (data ?? []) as Producto[];
});

/** Planes de corrección visibles, en el orden que eligió el autor. */
export const serviciosVisibles = cache(async (): Promise<Servicio[]> => {
  if (!hayBase()) return [];
  const { data, error } = await publico().from("servicios").select("*").eq("visible", true).order("orden").order("creado_en");
  if (error) throw error;
  return (data ?? []) as Servicio[];
});
