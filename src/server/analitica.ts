import "server-only";

import { COOKIE_EQUIPO, dispositivoDesdeUA, dominioReferente, esTipoEvento, navegadorDesdeUA, soDesdeUA, type TipoEvento } from "@/domain/analitica";
import { env, hayBase } from "./env";
import { servicio } from "./supabase";

// Escritura de eventos (desde /api/track y al confirmarse un pago). Lectura: el panel, con RLS.

const BOTS = /bot|crawl|spider|slurp|preview|lighthouse|headless|vercel-screenshot|facebookexternalhit|whatsapp\/|telegrambot/i;
export const esBot = (ua: string) => BOTS.test(ua);

const texto = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const ID = /^[A-Za-z0-9]{8,40}$/;

/** Valida un evento del navegador. Devuelve null si no sirve (se descarta en silencio). */
export function leerEvento(e: unknown) {
  if (!e || typeof e !== "object") return null;
  const o = e as Record<string, unknown>;
  if (!esTipoEvento(o.tipo) || typeof o.vid !== "string" || typeof o.sid !== "string" || !ID.test(o.vid) || !ID.test(o.sid)) return null;
  // El navegador no puede inventar una compra: esa la escribe el servidor al confirmar el pago.
  if (o.tipo === "purchase") return null;
  const valor = typeof o.valor === "number" && Number.isInteger(o.valor) && o.valor >= 0 && o.valor < 100_000_000 ? o.valor : null;
  return {
    tipo: o.tipo,
    vid: o.vid,
    sid: o.sid,
    ruta: texto(o.ruta, 300),
    objeto: texto(o.objeto, 80),
    valor,
    referente: texto(o.referente, 500),
    utm_source: texto(o.utm_source, 100),
    utm_medium: texto(o.utm_medium, 100),
    utm_campaign: texto(o.utm_campaign, 150),
    utm_term: texto(o.utm_term, 150),
    pantalla: texto(o.pantalla, 20),
    idioma: texto(o.idioma, 20),
    nuevo: typeof o.nuevo === "boolean" ? o.nuevo : null,
    entrada: texto(o.entrada, 300),
    datos: o.datos && typeof o.datos === "object" && !Array.isArray(o.datos) ? limitarDatos(o.datos as Record<string, unknown>) : null,
  };
}
type Evento = NonNullable<ReturnType<typeof leerEvento>>;

export async function registrarEventos(eventos: Evento[], contexto: { ua: string; pais: string | null }) {
  if (!hayBase() || !eventos.length) return;
  const host = new URL(env.sitio).hostname;
  const filas = eventos.map((e) => ({
    tipo: e.tipo,
    visitante_id: e.vid,
    sesion_id: e.sid,
    ruta: e.ruta?.split("?")[0] ?? null,
    objeto: e.objeto,
    valor: e.valor,
    referente: dominioReferente(e.referente, host),
    utm_source: e.utm_source,
    utm_medium: e.utm_medium,
    utm_campaign: e.utm_campaign,
    utm_term: e.utm_term?.toLowerCase() ?? null,
    pais: contexto.pais,
    dispositivo: dispositivoDesdeUA(contexto.ua),
    navegador: navegadorDesdeUA(contexto.ua),
    so: soDesdeUA(contexto.ua),
    pantalla: e.pantalla,
    idioma: e.idioma,
    nuevo: e.nuevo,
    entrada: e.entrada?.split("?")[0] ?? null,
    datos: e.datos,
  }));
  const { error } = await servicio().from("eventos").insert(filas);
  if (error) console.error("[analitica] eventos no guardados:", error.message);
}

/** Evento escrito por el servidor (la compra confirmada), unido a la visita que la hizo. */
export async function registrarDelServidor(tipo: TipoEvento, visita: { vid: string | null; sid: string | null }, extra: { ruta?: string; objeto?: string; valor?: number; datos?: Record<string, unknown> }) {
  if (!hayBase() || !visita.vid || !visita.sid) return;
  const { error } = await servicio().from("eventos").insert({
    tipo,
    visitante_id: visita.vid,
    sesion_id: visita.sid,
    ruta: extra.ruta ?? null,
    objeto: extra.objeto ?? null,
    valor: extra.valor ?? null,
    datos: extra.datos ?? null,
  });
  if (error) console.error("[analitica] evento del servidor no guardado:", error.message);
}

/** Ids de la visita que llegan del navegador (cookie o campo oculto), validados. */
export function visitaValida(vid: unknown, sid: unknown): { vid: string | null; sid: string | null } {
  return typeof vid === "string" && typeof sid === "string" && ID.test(vid) && ID.test(sid) ? { vid, sid } : { vid: null, sid: null };
}

/** Los datos libres del evento se recortan: 20 claves y 300 caracteres por valor como máximo. */
function limitarDatos(datos: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(datos)
      .slice(0, 20)
      .map(([k, v]) => [k.slice(0, 40), typeof v === "string" ? v.slice(0, 300) : typeof v === "number" || typeof v === "boolean" ? v : String(v).slice(0, 300)]),
  );
}

/** La visita que está pagando: cookies vid/sid o, sin cookies, los campos ocultos del formulario.
 *  Nada para la familia (cookie equipo). */
export async function visitaDelPago(form: FormData): Promise<{ vid: string | null; sid: string | null }> {
  const { cookies } = await import("next/headers");
  const c = await cookies();
  if (c.get(COOKIE_EQUIPO)?.value === "1") return { vid: null, sid: null };
  const deCookie = visitaValida(c.get("vid")?.value, c.get("sid")?.value);
  return deCookie.vid ? deCookie : visitaValida(form.get("visita_vid"), form.get("visita_sid"));
}
