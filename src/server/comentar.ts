"use server";

import { revalidatePath } from "next/cache";
import { avisarComentario } from "./avisos";
import { hayBase } from "./env";
import { publico } from "./supabase";

export type EstadoComentario = { ok: true; publicado: boolean } | { ok: false; error: string } | null;

// Contra el spam, sin pedir cuenta ni captcha:
//  · campo trampa invisible («sitio»): las personas no lo ven ni lo llenan, los robots sí;
//  · tiempo mínimo: nadie lee y escribe un comentario en menos de 4 segundos.
// Si se publica al instante o queda pendiente lo decide la base (perfil.moderar_comentarios).
const MIN_MS = 4000;

export async function comentar(_previo: EstadoComentario, form: FormData): Promise<EstadoComentario> {
  if (!hayBase()) return { ok: false, error: "Los comentarios todavía no están activos." };

  const textoId = String(form.get("texto_id") ?? "");
  const nombre = String(form.get("nombre") ?? "").trim();
  const cuerpo = String(form.get("cuerpo") ?? "").trim();
  const trampa = String(form.get("sitio") ?? "");
  const abierto = Number(form.get("abierto") ?? 0);

  // Al robot se le responde como si hubiera funcionado: no aprende nada.
  if (trampa || !abierto || Date.now() - abierto < MIN_MS) return { ok: true, publicado: false };

  if (!/^[0-9a-f-]{36}$/.test(textoId)) return { ok: false, error: "No encontramos el texto." };
  if (nombre.length < 1 || nombre.length > 80) return { ok: false, error: "Escribe tu nombre (hasta 80 letras)." };
  if (cuerpo.length < 2) return { ok: false, error: "Escribe tu comentario." };
  if (cuerpo.length > 3000) return { ok: false, error: "El comentario es muy largo (máximo 3.000 caracteres)." };

  const db = publico();
  const { error } = await db.from("comentarios").insert({ texto_id: textoId, nombre, cuerpo });
  if (error) return { ok: false, error: "No se pudo enviar. Inténtalo de nuevo en un momento." };

  const [{ data: texto }, { data: perfil }] = await Promise.all([
    db.from("textos").select("titulo, slug").eq("id", textoId).maybeSingle(),
    db.from("perfil").select("moderar_comentarios").eq("id", 1).maybeSingle(),
  ]);
  const publicado = !perfil?.moderar_comentarios;
  if (publicado && texto?.slug) revalidatePath(`/textos/${texto.slug}`);
  await avisarComentario({ nombre, cuerpo, tituloTexto: texto?.titulo ?? "tu texto", publicado });
  return { ok: true, publicado };
}
