"use server";

import { redirect } from "next/navigation";
import { ARCHIVO_MAX, EXTENSIONES } from "@/lib/correccion";
import { visitaDelPago } from "./analitica";
import { perfil } from "./datos";
import { hayPagos } from "./env";
import { crearCobro } from "./flow";
import { servicio } from "./supabase";

// Contratar una corrección: el precio sale de la base (crear_encargo), el texto del cliente va
// a un depósito privado que solo lee el autor, y el pago se hace en Flow.

export type EstadoContrato = { ok: false; error: string } | null;

const ERRORES: Record<string, string> = {
  servicio_no_disponible: "Ese servicio ya no está disponible. Vuelve a la página de corrección.",
  cantidad_invalida: "Revisa la cantidad: no cumple el mínimo del plan.",
};

/** Nombre de archivo seguro para guardarlo (sin tildes, espacios ni rutas). */
function nombreSeguro(nombre: string): string {
  const punto = nombre.lastIndexOf(".");
  const ext = punto >= 0 ? nombre.slice(punto).toLowerCase() : "";
  const base = (punto >= 0 ? nombre.slice(0, punto) : nombre)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return (base || "texto") + ext;
}

export async function contratar(_previo: EstadoContrato, form: FormData): Promise<EstadoContrato> {
  if (!hayPagos()) return { ok: false, error: "El pago en línea todavía no está activo. Escríbenos por WhatsApp." };

  const t = (c: string) => String(form.get(c) ?? "").trim();
  const datos = { nombre: t("nombre"), correo: t("correo"), telefono: t("telefono"), notas: t("notas").slice(0, 2000) };
  if (datos.nombre.length < 2) return { ok: false, error: "Escribe tu nombre completo." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(datos.correo)) return { ok: false, error: "Revisa tu correo: ahí te llega el texto corregido." };
  if (datos.telefono.replace(/\D/g, "").length < 8) return { ok: false, error: "Escribe un teléfono de contacto." };

  const archivo = form.get("archivo");
  if (!(archivo instanceof File) || archivo.size === 0) return { ok: false, error: "Sube el texto que quieres corregir." };
  const ext = archivo.name.slice(archivo.name.lastIndexOf(".")).toLowerCase();
  if (!EXTENSIONES.includes(ext)) return { ok: false, error: `El archivo debe ser ${EXTENSIONES.join(", ")}.` };
  if (archivo.size > ARCHIVO_MAX) return { ok: false, error: "El archivo pesa más de 4 MB. Si es muy largo, escríbenos por WhatsApp." };

  const servicioId = t("servicio");
  const cantidad = Number.parseInt(t("cantidad") || "1", 10);
  const db = servicio();
  const { data, error } = await db
    .rpc("crear_encargo", { p_servicio: servicioId, p_cantidad: Number.isFinite(cantidad) ? cantidad : 0, p_datos: datos })
    .single<{ id: string; numero: number; total: number }>();
  if (error || !data) return { ok: false, error: ERRORES[error?.message ?? ""] ?? "No pudimos crear tu encargo. Inténtalo de nuevo." };

  const ruta = `${data.id}/${nombreSeguro(archivo.name)}`;
  const subida = await db.storage.from("encargos").upload(ruta, archivo, { contentType: archivo.type || "application/octet-stream" });
  if (subida.error) {
    console.error("[contratar] no se pudo guardar el archivo", subida.error);
    await db.from("encargos").update({ estado: "cancelado" }).eq("id", data.id);
    return { ok: false, error: "No pudimos recibir tu archivo. Inténtalo de nuevo." };
  }

  let url: string;
  try {
    const cobro = await crearCobro({
      orden: `E-${data.id}`,
      asunto: `Corrección #${data.numero} · ${(await perfil()).nombre}`,
      total: data.total,
      correo: datos.correo,
    });
    const visita = await visitaDelPago(form);
    await db.from("encargos").update({ archivo: ruta, archivo_nombre: archivo.name.slice(0, 200), pago_token: cobro.token, visitante_id: visita.vid, sesion_id: visita.sid }).eq("id", data.id);
    url = cobro.url;
  } catch (e) {
    console.error("[contratar] Flow no respondió", e);
    return { ok: false, error: "No pudimos conectar con el sistema de pago. Inténtalo de nuevo en un momento." };
  }
  redirect(url);
}
