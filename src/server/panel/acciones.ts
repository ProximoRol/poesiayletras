"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { aSlug, esFormato, extracto, NUEVO_TEMA, slugLibre, type Formato } from "@/domain/textos";
import { esUnidad } from "@/lib/correccion";
import { avisarPedidoEnviado, type PedidoCorreo } from "../avisos";
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
  if (accion === "publicar" && !cuerpo.trim()) return { ok: false, error: "El texto está vacío." };

  // El tema puede ser uno existente o uno nuevo escrito ahí mismo («＋ Otro tema…»).
  let tema: { slug: string; formato: Formato } | null;
  if (categoria === NUEVO_TEMA) {
    const creado = await crearTemaEn(db, txt(form, "tema_nombre"), txt(form, "tema_formato"));
    if (!creado.ok) return creado;
    tema = creado.tema;
  } else {
    const { data } = await db.from("temas").select("slug, formato").eq("slug", categoria).maybeSingle();
    tema = data as typeof tema;
  }
  if (!tema) return { ok: false, error: "Elige de qué tema es el texto." };

  const datos: Record<string, unknown> = { titulo, categoria: tema.slug, cuerpo, imagen, extracto: extracto(cuerpo, tema.formato) };

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
  if (!id || categoria === NUEVO_TEMA) redirect(`/admin/textos/${guardadoId}?aviso=${encodeURIComponent(aviso)}`);
  return { ok: true, aviso };
}

export async function borrarTexto(form: FormData) {
  await exigirAutor();
  const db = await usuario();
  await db.from("textos").delete().eq("id", txt(form, "id"));
  refrescarSitio();
  redirect("/admin?aviso=" + encodeURIComponent("Texto borrado."));
}

// ── Temas ───────────────────────────────────────────────────────────────────
// El autor nombra sus temas como quiera. El slug se fija al crearlo (es el del filtro
// /textos?tipo=…) y no cambia al renombrar, para no romper enlaces ya compartidos.

type Db = Awaited<ReturnType<typeof usuario>>;

async function crearTemaEn(db: Db, nombre: string, formato: string): Promise<{ ok: true; tema: { slug: string; formato: Formato } } | { ok: false; error: string }> {
  if (!nombre) return { ok: false, error: "Escribe el nombre del tema nuevo." };
  if (nombre.length > 40) return { ok: false, error: "El nombre del tema es muy largo (máximo 40 letras)." };
  const f: Formato = esFormato(formato) ? formato : "prosa";
  const { data: todos } = await db.from("temas").select("slug, nombre, formato, orden");
  const lista = (todos ?? []) as { slug: string; nombre: string; formato: Formato; orden: number }[];
  const igual = lista.find((t) => t.nombre.toLocaleLowerCase("es") === nombre.toLocaleLowerCase("es"));
  if (igual) return { ok: true, tema: igual };
  const slug = slugLibre(aSlug(nombre).slice(0, 50).replace(/-+$/, "") || "tema", lista.map((t) => t.slug));
  const orden = lista.reduce((m, t) => Math.max(m, t.orden), -1) + 1;
  const { error } = await db.from("temas").insert({ slug, nombre, formato: f, orden });
  if (error) return { ok: false, error: "No se pudo crear el tema. Inténtalo de nuevo." };
  return { ok: true, tema: { slug, formato: f } };
}

function volverATemas(aviso: string, error = false): never {
  redirect(`/admin/temas?${error ? "error" : "aviso"}=` + encodeURIComponent(aviso));
}

export async function crearTema(form: FormData) {
  await exigirAutor();
  const db = await usuario();
  const r = await crearTemaEn(db, txt(form, "nombre"), txt(form, "formato"));
  if (!r.ok) volverATemas(r.error, true);
  refrescarSitio();
  volverATemas("Tema agregado.");
}

export async function guardarTema(form: FormData) {
  await exigirAutor();
  const db = await usuario();
  const nombre = txt(form, "nombre");
  const formato = txt(form, "formato");
  if (!nombre || nombre.length > 40) volverATemas("El nombre del tema debe tener entre 1 y 40 letras.", true);
  if (!esFormato(formato)) volverATemas("Elige si el tema va en versos o en párrafos.", true);
  const slug = txt(form, "slug");
  const { error } = await db.from("temas").update({ nombre, formato }).eq("slug", slug);
  if (error) volverATemas("No se pudo guardar el tema.", true);
  // El extracto de las tarjetas depende del formato: se rehace para los textos del tema.
  const { data: textos } = await db.from("textos").select("id, cuerpo").eq("categoria", slug);
  for (const t of textos ?? []) await db.from("textos").update({ extracto: extracto(t.cuerpo as string, formato as Formato) }).eq("id", t.id);
  refrescarSitio();
  volverATemas("Tema guardado.");
}

export async function moverTema(form: FormData) {
  await exigirAutor();
  const db = await usuario();
  const { data } = await db.from("temas").select("slug, orden").order("orden").order("nombre");
  const lista = (data ?? []) as { slug: string; orden: number }[];
  const i = lista.findIndex((t) => t.slug === txt(form, "slug"));
  const j = txt(form, "hacia") === "arriba" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= lista.length) return;
  [lista[i], lista[j]] = [lista[j], lista[i]];
  await Promise.all(lista.map((t, n) => (t.orden === n ? null : db.from("temas").update({ orden: n }).eq("slug", t.slug))));
  refrescarSitio();
  revalidatePath("/admin/temas");
}

export async function borrarTema(form: FormData) {
  await exigirAutor();
  const db = await usuario();
  const slug = txt(form, "slug");
  const { count } = await db.from("textos").select("id", { count: "exact", head: true }).eq("categoria", slug);
  if (count) volverATemas("Ese tema tiene textos. Cámbialos de tema antes de borrarlo.", true);
  const { error } = await db.from("temas").delete().eq("slug", slug);
  if (error) volverATemas("No se pudo borrar el tema.", true);
  refrescarSitio();
  volverATemas("Tema borrado.");
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
      moderar_comentarios: form.get("moderar_comentarios") === "on",
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

// ── Tienda ──────────────────────────────────────────────────────────────────

export async function guardarProducto(_previo: Resultado, form: FormData): Promise<Resultado> {
  await exigirAutor();
  const db = await usuario();
  const id = txt(form, "id");
  const nombre = txt(form, "nombre");
  if (!nombre) return { ok: false, error: "Ponle un nombre al producto." };
  const precio = Number(txt(form, "precio").replace(/[^\d]/g, ""));
  if (!Number.isInteger(precio) || precio < 100) return { ok: false, error: "Escribe el precio en pesos, por ejemplo 15000." };
  const stockTxt = txt(form, "stock").replace(/[^\d]/g, "");
  const stock = stockTxt === "" ? null : Number(stockTxt);
  const libroId = txt(form, "libro_id") || null;

  const datos = {
    nombre,
    descripcion: String(form.get("descripcion") ?? "").trim(),
    precio,
    stock,
    foto: opcional(form, "foto"),
    libro_id: libroId,
    visible: form.get("visible") === "on",
  };
  const { error } = id ? await db.from("productos").update(datos).eq("id", id) : await db.from("productos").insert(datos);
  if (error) return { ok: false, error: "No se pudo guardar el producto." };
  refrescarSitio();
  if (!id) redirect("/admin/tienda?aviso=" + encodeURIComponent("Producto agregado. Ya está a la venta."));
  return { ok: true, aviso: "Producto guardado." };
}

export async function borrarProducto(form: FormData) {
  await exigirAutor();
  const db = await usuario();
  await db.from("productos").delete().eq("id", txt(form, "id"));
  refrescarSitio();
  redirect("/admin/tienda?aviso=" + encodeURIComponent("Producto borrado."));
}

// ── Pedidos ─────────────────────────────────────────────────────────────────

export async function marcarEnviado(form: FormData) {
  await exigirAutor();
  const db = await usuario();
  const id = txt(form, "id");
  const seguimiento = txt(form, "seguimiento").slice(0, 100) || null;
  const { data } = await db
    .from("pedidos")
    .update({ estado: "enviado", enviado_en: new Date().toISOString(), seguimiento })
    .eq("id", id)
    .eq("estado", "pagado")
    .select("*")
    .maybeSingle();
  if (data) {
    const { data: p } = await db.from("perfil").select("nombre").eq("id", 1).maybeSingle();
    await avisarPedidoEnviado(data as PedidoCorreo, (p?.nombre as string | undefined) ?? "");
  }
  revalidatePath("/admin", "layout");
}

export async function cancelarPedido(form: FormData) {
  await exigirAutor();
  const db = await usuario();
  await db.from("pedidos").update({ estado: "cancelado" }).eq("id", txt(form, "id")).eq("estado", "pendiente_pago");
  revalidatePath("/admin", "layout");
}

// ── Corrección literaria ────────────────────────────────────────────────────

export async function guardarServicio(_previo: Resultado, form: FormData): Promise<Resultado> {
  await exigirAutor();
  const db = await usuario();
  const id = txt(form, "id");
  const nombre = txt(form, "nombre");
  if (!nombre) return { ok: false, error: "Ponle un nombre al plan." };
  const unidad = txt(form, "unidad");
  if (!esUnidad(unidad)) return { ok: false, error: "Elige cómo se cobra el plan." };
  const precioTxt = txt(form, "precio").replace(/[^\d]/g, "");
  const precio = precioTxt === "" ? null : Number(precioTxt);
  if (precio !== null && precio < 100) return { ok: false, error: "Escribe el precio en pesos, por ejemplo 5000, o déjalo vacío para que lo consulten por WhatsApp." };
  const minimo = unidad === "fijo" ? 1 : Math.max(1, Number(txt(form, "minimo").replace(/[^\d]/g, "")) || 1);

  const datos = {
    nombre,
    descripcion: txt(form, "descripcion").slice(0, 400),
    incluye: String(form.get("incluye") ?? "").split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 12),
    precio,
    unidad,
    minimo,
    nota: txt(form, "nota").slice(0, 120),
    destacado: form.get("destacado") === "on",
    visible: form.get("visible") === "on",
  };
  const { error } = id ? await db.from("servicios").update(datos).eq("id", id) : await db.from("servicios").insert(datos);
  if (error) return { ok: false, error: "No se pudo guardar el plan." };
  refrescarSitio();
  if (!id) redirect("/admin/correccion?aviso=" + encodeURIComponent("Plan agregado."));
  return { ok: true, aviso: "Plan guardado." };
}

export async function borrarServicio(form: FormData) {
  await exigirAutor();
  const db = await usuario();
  await db.from("servicios").delete().eq("id", txt(form, "id"));
  refrescarSitio();
  redirect("/admin/correccion?aviso=" + encodeURIComponent("Plan borrado."));
}

export async function marcarEntregado(form: FormData) {
  await exigirAutor();
  const db = await usuario();
  await db.from("encargos").update({ estado: "entregado", entregado_en: new Date().toISOString() }).eq("id", txt(form, "id")).eq("estado", "pagado");
  revalidatePath("/admin", "layout");
}
