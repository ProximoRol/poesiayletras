"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { aSlug, esCategoria, extracto, slugLibre } from "@/domain/textos";
import { usuario } from "../supabase";
import type { EnlaceCompra } from "../tipos";
import { exigirAutor } from "./auth";

// Acciones del panel. Cada una vuelve a exigir al autor (además, RLS lo exige en la base).

export type Resultado = { ok: true; aviso?: string } | { ok: false; error: string } | null;

const txt = (form: FormData, campo: string) => String(form.get(campo) ?? "").trim();
const opcional = (form: FormData, campo: string) => txt(form, campo) || null;

function refrescarSitio() {
  revalidatePath("/", "layout");
}

// ── Textos ──────────────────────────────────────────────────────────────────

export async function guardarTexto(_previo: Resultado, form: FormData): Promise<Resultado> {
  await exigirAutor();
  const db = await usuario();

  const id = txt(form, "id");
  const titulo = txt(form, "titulo");
  const categoria = txt(form, "categoria");
  const cuerpo = String(form.get("cuerpo") ?? "").replace(/\r\n?/g, "\n").replace(/\s+$/, "");
  const imagen = opcional(form, "imagen");
  const accion = txt(form, "accion"); // «borrador» | «publicar» | «guardar»

  if (!titulo) return { ok: false, error: "Ponle un título al texto." };
  if (titulo.length > 200) return { ok: false, error: "El título es muy largo." };
  if (!esCategoria(categoria)) return { ok: false, error: "Elige de qué tipo es el texto." };
  if (accion === "publicar" && !cuerpo.trim()) return { ok: false, error: "El texto está vacío." };

  const datos: Record<string, unknown> = { titulo, categoria, cuerpo, imagen, extracto: extracto(cuerpo, categoria) };

  let actual: { estado: string; publicado_en: string | null } | null = null;
  if (id) {
    const { data } = await db.from("textos").select("estado, publicado_en").eq("id", id).maybeSingle();
    if (!data) return { ok: false, error: "Ese texto ya no existe." };
    actual = data;
  }
  if (accion === "publicar") {
    datos.estado = "publicado";
    datos.publicado_en = actual?.publicado_en ?? new Date().toISOString();
  } else if (accion === "borrador") {
    datos.estado = "borrador";
  }

  let guardadoId = id;
  if (id) {
    const { error } = await db.from("textos").update(datos).eq("id", id);
    if (error) return { ok: false, error: "No se pudo guardar. Inténtalo de nuevo." };
  } else {
    const base = aSlug(titulo);
    const { data: parecidos } = await db.from("textos").select("slug").like("slug", `${base}%`);
    const slug = slugLibre(base, (parecidos ?? []).map((p) => p.slug as string));
    const { data, error } = await db.from("textos").insert({ ...datos, slug }).select("id").single();
    if (error || !data) return { ok: false, error: "No se pudo guardar. Inténtalo de nuevo." };
    guardadoId = data.id as string;
  }

  refrescarSitio();
  const aviso =
    accion === "publicar"
      ? actual?.estado === "publicado" ? "Cambios publicados." : "¡Publicado! Ya lo pueden leer."
      : accion === "borrador"
        ? actual?.estado === "publicado" ? "Se retiró de la página. Quedó como borrador." : "Borrador guardado."
        : "Cambios guardados.";
  if (!id) redirect(`/admin/textos/${guardadoId}?aviso=${encodeURIComponent(aviso)}`);
  return { ok: true, aviso };
}

export async function borrarTexto(form: FormData) {
  await exigirAutor();
  const db = await usuario();
  await db.from("textos").delete().eq("id", txt(form, "id"));
  refrescarSitio();
  redirect("/admin?aviso=" + encodeURIComponent("Texto borrado."));
}

// ── Comentarios ─────────────────────────────────────────────────────────────

export async function aprobarComentario(form: FormData) {
  await exigirAutor();
  const db = await usuario();
  await db.from("comentarios").update({ estado: "aprobado" }).eq("id", txt(form, "id"));
  refrescarSitio();
}

export async function responderComentario(form: FormData) {
  await exigirAutor();
  const db = await usuario();
  const respuesta = txt(form, "respuesta").slice(0, 3000) || null;
  // Responder también aprueba: si el autor contesta, el comentario se muestra.
  await db.from("comentarios").update({ respuesta, estado: "aprobado" }).eq("id", txt(form, "id"));
  refrescarSitio();
}

export async function borrarComentario(form: FormData) {
  await exigirAutor();
  const db = await usuario();
  await db.from("comentarios").delete().eq("id", txt(form, "id"));
  refrescarSitio();
}

// ── Libros ──────────────────────────────────────────────────────────────────

function leerEnlaces(form: FormData): { enlaces: EnlaceCompra[]; malos: number } {
  const tiendas = form.getAll("enlace_tienda").map((v) => String(v).trim());
  const urls = form.getAll("enlace_url").map((v) => String(v).trim());
  const enlaces: EnlaceCompra[] = [];
  let malos = 0;
  urls.forEach((url, i) => {
    if (!url) return;
    if (/^https?:\/\/\S+$/i.test(url)) enlaces.push({ tienda: tiendas[i] || "Comprar", url });
    else malos++;
  });
  return { enlaces, malos };
}

export async function guardarLibro(_previo: Resultado, form: FormData): Promise<Resultado> {
  await exigirAutor();
  const db = await usuario();
  const id = txt(form, "id");
  const titulo = txt(form, "titulo");
  if (!titulo) return { ok: false, error: "Ponle el título del libro." };
  const anioTxt = txt(form, "anio");
  const anio = anioTxt ? Number(anioTxt) : null;
  if (anio !== null && (!Number.isInteger(anio) || anio < 1900 || anio > 2100)) return { ok: false, error: "El año no se ve bien." };
  const { enlaces, malos } = leerEnlaces(form);
  if (malos) return { ok: false, error: "Un enlace de compra no es válido: debe empezar con https://" };

  const datos = {
    titulo,
    subtitulo: txt(form, "subtitulo"),
    anio,
    portada: opcional(form, "portada"),
    sinopsis: String(form.get("sinopsis") ?? "").trim(),
    enlaces,
    visible: form.get("visible") === "on",
  };
  const { error } = id ? await db.from("libros").update(datos).eq("id", id) : await db.from("libros").insert(datos);
  if (error) return { ok: false, error: "No se pudo guardar el libro." };
  refrescarSitio();
  if (!id) redirect("/admin/libros?aviso=" + encodeURIComponent("Libro agregado."));
  return { ok: true, aviso: "Libro guardado." };
}

export async function borrarLibro(form: FormData) {
  await exigirAutor();
  const db = await usuario();
  await db.from("libros").delete().eq("id", txt(form, "id"));
  refrescarSitio();
  redirect("/admin/libros?aviso=" + encodeURIComponent("Libro borrado."));
}

// ── Perfil ──────────────────────────────────────────────────────────────────

function urlOpcional(valor: string | null): string | null | false {
  if (!valor) return null;
  return /^https?:\/\/\S+$/i.test(valor) ? valor : false;
}

export async function guardarPerfil(_previo: Resultado, form: FormData): Promise<Resultado> {
  await exigirAutor();
  const db = await usuario();
  const nombre = txt(form, "nombre");
  if (!nombre) return { ok: false, error: "Escribe tu nombre de autor." };
  const instagram = urlOpcional(opcional(form, "instagram"));
  const facebook = urlOpcional(opcional(form, "facebook"));
  if (instagram === false || facebook === false) return { ok: false, error: "Los enlaces de redes deben empezar con https://" };
  const whatsapp = txt(form, "whatsapp").replace(/[^\d]/g, "") || null;
  const correo = opcional(form, "correo");
  if (correo && !/^\S+@\S+\.\S+$/.test(correo)) return { ok: false, error: "El correo no se ve bien." };

  const { error } = await db
    .from("perfil")
    .update({
      nombre,
      frase: txt(form, "frase"),
      presentacion: String(form.get("presentacion") ?? "").trim(),
      biografia: String(form.get("biografia") ?? "").trim(),
      foto: opcional(form, "foto"),
      instagram,
      facebook,
      whatsapp,
      correo,
    })
    .eq("id", 1);
  if (error) return { ok: false, error: "No se pudo guardar." };
  refrescarSitio();
  return { ok: true, aviso: "Listo, tu página ya muestra los cambios." };
}

export async function salir() {
  const db = await usuario();
  await db.auth.signOut();
  redirect("/admin/login");
}
