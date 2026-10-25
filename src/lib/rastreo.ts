"use client";

import { COOKIE_EQUIPO, SESION_MINUTOS, utmDesdeClic, type TipoEvento } from "@/domain/analitica";

// Rastreo propio, sin terceros (el de Ugen, con sus correcciones). Dos ids al azar en cookies de
// primera parte, para que el servidor también los lea al cobrar (une la venta a su visita):
//  · vid — visitante, dura 1 año.
//  · sid — sesión, caduca tras 30 min sin actividad (cada evento la renueva).
// Nunca se envía correo, nombre ni la URL completa del referente. Con «No rastrear» activado en
// el navegador se mide igual, pero sin guardar nada en el dispositivo (ids solo en memoria).

const UN_ANO = 60 * 60 * 24 * 365;

function leerCookie(nombre: string): string | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${nombre}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

function ponerCookie(nombre: string, valor: string, segundos: number) {
  document.cookie = `${nombre}=${encodeURIComponent(valor)}; Max-Age=${segundos}; Path=/; SameSite=Lax`;
}

const nuevoId = () => crypto.randomUUID().replace(/-/g, "").slice(0, 20);

/** Navegador de la familia (cookie puesta al entrar al panel o con /equipo?clave=…): no se mide. */
export const esEquipo = () => typeof document !== "undefined" && leerCookie(COOKIE_EQUIPO) === "1";
const esAnonimo = () => navigator.doNotTrack === "1";

function sesionGuardada(clave: string): string | null {
  try {
    return sessionStorage.getItem(clave);
  } catch {
    return null;
  }
}
function guardarSesion(clave: string, valor: string) {
  try {
    sessionStorage.setItem(clave, valor);
  } catch {}
}

function ids(): { vid: string; sid: string; nuevaSesion: boolean; nuevo: boolean } {
  const vidPrevio = leerCookie("vid");
  let sid = leerCookie("sid");
  const vid = vidPrevio ?? nuevoId();
  ponerCookie("vid", vid, UN_ANO);
  const nuevaSesion = !sid;
  sid ??= nuevoId();
  ponerCookie("sid", sid, SESION_MINUTOS * 60);
  // «Nuevo» = no tenía id de visitante al empezar esta sesión. Se fija al inicio y no cambia.
  const nuevo = nuevaSesion ? !vidPrevio : sesionGuardada("nuevo") === "1";
  if (nuevaSesion) {
    guardarSesion("nuevo", nuevo ? "1" : "0");
    guardarSesion("entrada", location.pathname);
  }
  return { vid, sid, nuevaSesion, nuevo };
}

// ── Modo anónimo («No rastrear») ────────────────────────────────────────────
// Ids que viven solo en la memoria de esta pestaña. Se pierden al recargar; la navegación dentro
// de la página (sin recargar) mantiene la misma visita. Prefijo «an» para distinguirlas.
let memoria: { vid: string; sid: string } | null = null;
let eventosAnonimos = 0;
const entradaEnMemoria = typeof window === "undefined" ? "/" : location.pathname;
const idsEnMemoria = () => (memoria ??= { vid: `an${nuevoId().slice(0, 18)}`, sid: `an${nuevoId().slice(0, 18)}` });

/** Ids de esta visita para unir una venta a ella (los formularios de pago los mandan ocultos
 *  cuando no hay cookies). Null para la familia. */
export function idsVisita(): { vid: string; sid: string } | null {
  if (typeof window === "undefined" || esEquipo()) return null;
  if (esAnonimo()) return idsEnMemoria();
  const vid = leerCookie("vid");
  const sid = leerCookie("sid");
  return vid && sid ? { vid, sid } : null;
}

// utm_term: palabra clave del anuncio (sufijo de URL de Google Ads «utm_term={keyword}»).
const UTM = ["utm_source", "utm_medium", "utm_campaign", "utm_term"];
function utmDeEstaUrl(): Record<string, string> {
  const p = new URLSearchParams(location.search);
  // Un id de clic de anuncio (gclid…) sin utm propios cuenta como anuncio de esa red.
  return { ...utmDesdeClic(p), ...Object.fromEntries(UTM.flatMap((k) => (p.get(k) ? [[k, p.get(k)!]] : []))) };
}

/** UTM de la URL de entrada; se guardan para toda la sesión. */
function utm(nuevaSesion: boolean): Record<string, string> {
  const actuales = utmDeEstaUrl();
  try {
    if (Object.keys(actuales).length) sessionStorage.setItem("utm", JSON.stringify(actuales));
    else if (nuevaSesion) sessionStorage.removeItem("utm");
    return JSON.parse(sessionStorage.getItem("utm") ?? "{}");
  } catch {
    return actuales;
  }
}
let utmEnMemoria: Record<string, string> | null = null;

export interface DatosEvento {
  /** Página a la que pertenece el evento si ya no es la actual (el tiempo activo se manda al salir). */
  ruta?: string;
  objeto?: string;
  valor?: number;
  datos?: Record<string, unknown>;
}

// Un mismo evento repetido en menos de 1 s es un doble disparo (efectos de React en modo
// estricto, doble clic), no dos acciones. La firma incluye los datos: scroll 25 y 50 no son
// un duplicado.
let ultimo = { firma: "", en: 0 };

export function rastrear(tipo: TipoEvento, extra: DatosEvento = {}) {
  if (typeof window === "undefined" || esEquipo()) return;
  const firma = `${tipo}|${location.pathname}|${extra.objeto ?? ""}|${extra.valor ?? ""}|${JSON.stringify(extra.datos ?? {})}`;
  const ahora = Date.now();
  if (firma === ultimo.firma && ahora - ultimo.en < 1000) return;
  ultimo = { firma, en: ahora };
  try {
    const comun = {
      tipo,
      ruta: location.pathname,
      pantalla: `${window.innerWidth}x${window.innerHeight}`,
      idioma: navigator.language?.slice(0, 20) ?? null,
    };
    let cuerpo: Record<string, unknown>;
    if (esAnonimo()) {
      eventosAnonimos += 1;
      cuerpo = {
        ...comun,
        ...idsEnMemoria(),
        referente: eventosAnonimos === 1 ? document.referrer || null : null,
        entrada: entradaEnMemoria,
        ...(utmEnMemoria ??= utmDeEstaUrl()),
      };
    } else {
      const { vid, sid, nuevaSesion, nuevo } = ids();
      cuerpo = {
        ...comun,
        vid,
        sid,
        referente: nuevaSesion ? document.referrer || null : null,
        nuevo,
        entrada: sesionGuardada("entrada") ?? location.pathname,
        ...utm(nuevaSesion),
      };
    }
    encolar(JSON.stringify({ ...cuerpo, ...extra }));
  } catch {
    // El rastreo nunca puede romper la página.
  }
}

// ── Envío en lotes ──────────────────────────────────────────────────────────
// Cada llamada a /api/track es una función de Vercel (se cobra). Los eventos se juntan y salen
// en UN envío: al ocultar o cerrar la página (sendBeacon sobrevive al cierre), cada 15 s o al
// llegar a 25.
const cola: string[] = [];
let temporizador: ReturnType<typeof setTimeout> | null = null;
let escuchando = false;

function encolar(cuerpo: string) {
  cola.push(cuerpo);
  if (!escuchando) {
    escuchando = true;
    document.addEventListener("visibilitychange", () => document.visibilityState === "hidden" && vaciar());
    window.addEventListener("pagehide", vaciar);
  }
  if (document.visibilityState === "hidden" || cola.length >= 25) return vaciar();
  temporizador ??= setTimeout(vaciar, 15000);
}

/** Manda ya lo que haya en cola (antes de salir a pagar, por ejemplo). */
export function vaciar() {
  if (temporizador) clearTimeout(temporizador);
  temporizador = null;
  if (!cola.length) return;
  const cuerpo = `{"eventos":[${cola.splice(0).join(",")}]}`;
  try {
    if (!navigator.sendBeacon?.("/api/track", new Blob([cuerpo], { type: "application/json" }))) {
      void fetch("/api/track", { method: "POST", body: cuerpo, keepalive: true, headers: { "content-type": "application/json" } });
    }
  } catch {}
}

// ── dataLayer (Google Tag Manager / GA4) ────────────────────────────────────
// Se empuja siempre (también sin GTM instalado: no molesta). Dos pushes por evento: primero se
// limpian los objetos anteriores, si no GTM los fusiona y un evento arrastra valores del previo.
// Nunca datos personales.
type Capa = { push: (x: Record<string, unknown>) => void };
export function capaDatos(evento: string, params: Record<string, unknown> = {}, ecommerce?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  const w = window as unknown as { dataLayer?: Capa & unknown[] };
  w.dataLayer ??= [] as unknown as Capa & unknown[];
  w.dataLayer.push({ event_params: null, ecommerce: null });
  w.dataLayer.push({ event: evento, event_params: params, user: { internal: esEquipo() }, ...(ecommerce ? { ecommerce } : {}) });
}
