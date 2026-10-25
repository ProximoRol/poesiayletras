// Medición propia: tipos de evento, canales de llegada y el embudo por sesiones. Lógica pura,
// sin red ni base (copiada de Ugen con sus correcciones: atribución por el primer utm de la
// sesión, rebote estilo GA4, tiempo medio solo de las visitas que no rebotaron).

/** Los únicos eventos que acepta /api/track. Agregar uno = agregarlo aquí y en el panel. */
export const TIPOS_EVENTO = [
  "page_view",
  "text_view", // objeto = slug del texto
  "text_read", // llegó al final del texto (objeto = slug)
  "comment_sent",
  "add_to_cart", // objeto = id del producto
  "cart_open",
  "checkout_start", // tienda: se fue a pagar
  "service_view", // corrección: abrió el formulario de un plan (objeto = id del plan)
  "service_start", // corrección: envió el formulario y se fue a pagar
  "purchase", // lo inserta el servidor al confirmarse el pago (datos.tipo = pedido | encargo)
  "scroll", // datos.pct: 25 | 50 | 75 | 100 (una vez por página)
  "engagement", // datos.ms: tiempo con la pestaña visible en esa página
  "interaction", // datos.accion (+ detalles): whatsapp, instagram, compartir…
  "web_vital", // datos.nombre (LCP, INP, CLS, FCP, TTFB) + datos.valor
  "js_error", // datos.mensaje
] as const;
export type TipoEvento = (typeof TIPOS_EVENTO)[number];
export const esTipoEvento = (v: unknown): v is TipoEvento => typeof v === "string" && (TIPOS_EVENTO as readonly string[]).includes(v);

/** Una sesión termina tras 30 min sin actividad (mismo criterio que GA). */
export const SESION_MINUTOS = 30;

/** Cookie que marca un navegador de la familia (al entrar al panel o con el enlace
 *  /equipo?clave=…): no se mide. */
export const COOKIE_EQUIPO = "equipo";
/** Clave del enlace para marcar dispositivos sin entrar al panel. No es un secreto serio: quien
 *  la use solo consigue que no lo midan. Evita que alguien lo active por azar. */
export const CLAVE_ENLACE_EQUIPO = "t61bxhOz3cfp";

export function dispositivoDesdeUA(ua: string): "movil" | "tablet" | "escritorio" {
  if (/ipad|tablet|kindle|silk|playbook/i.test(ua)) return "tablet";
  if (/mobi|iphone|android.+mobile|windows phone/i.test(ua)) return "movil";
  return "escritorio";
}

export function navegadorDesdeUA(ua: string): string {
  if (/edg\//i.test(ua)) return "Edge";
  if (/opr\/|opera/i.test(ua)) return "Opera";
  if (/samsungbrowser/i.test(ua)) return "Samsung Internet";
  if (/fbav|fban|instagram/i.test(ua)) return /instagram/i.test(ua) ? "Instagram (app)" : "Facebook (app)";
  if (/whatsapp/i.test(ua)) return "WhatsApp (app)";
  if (/crios|chrome\//i.test(ua)) return "Chrome";
  if (/fxios|firefox\//i.test(ua)) return "Firefox";
  if (/safari\//i.test(ua)) return "Safari";
  return "Otro";
}

export function soDesdeUA(ua: string): string {
  if (/iphone|ipad|ipod/i.test(ua)) return "iOS";
  if (/android/i.test(ua)) return "Android";
  if (/windows/i.test(ua)) return "Windows";
  if (/mac os x|macintosh/i.test(ua)) return "macOS";
  if (/linux/i.test(ua)) return "Linux";
  return "Otro";
}

/** Solo el dominio del referente; nunca la URL completa (puede traer datos personales). */
export function dominioReferente(referente: string | null | undefined, propio: string): string | null {
  if (!referente) return null;
  try {
    const host = new URL(referente).hostname.replace(/^www\./, "");
    return host === propio.replace(/^www\./, "") ? null : host;
  } catch {
    return null;
  }
}

/**
 * Id de clic de un anuncio en la URL de entrada → utm de anuncio, para no confundir un clic
 * pagado con una búsqueda orgánica. Solo cuando la URL no trae utm propios. `fbclid` NO cuenta:
 * Meta lo agrega también a los enlaces orgánicos (por eso los anuncios de Meta llevan utm).
 */
export function utmDesdeClic(p: URLSearchParams): { utm_source: string; utm_medium: string } | null {
  if (p.get("utm_source")) return null;
  if (p.get("gclid") || p.get("gbraid") || p.get("wbraid")) return { utm_source: "google", utm_medium: "cpc" };
  if (p.get("msclkid")) return { utm_source: "bing", utm_medium: "cpc" };
  if (p.get("ttclid")) return { utm_source: "tiktok", utm_medium: "paid" };
  if (p.get("li_fat_id")) return { utm_source: "linkedin", utm_medium: "paid" };
  return null;
}

// ── Tipo de canal: IA, búsqueda orgánica, anuncios, redes, correo, referidos o directo ──
export const GRUPOS_CANAL = ["anuncios", "ia", "organico", "redes", "correo", "referido", "directo"] as const;
export type GrupoCanal = (typeof GRUPOS_CANAL)[number];
export const NOMBRE_GRUPO: Record<GrupoCanal, string> = {
  anuncios: "Anuncios",
  ia: "IA (ChatGPT, Perplexity…)",
  organico: "Búsqueda en Google y otros",
  redes: "Redes sociales",
  correo: "Correo",
  referido: "Otras webs",
  directo: "Directo (escribió la dirección o un enlace sin origen)",
};

// Dominio o utm_source → nombre de la fuente y su tipo. Se compara por sufijo: «l.instagram.com»
// y «instagram.com» son Instagram; «google.cl» es Google.
const FUENTES: [RegExp, string, GrupoCanal][] = [
  [/(^|\.)(chatgpt\.com|chat\.openai\.com|openai\.com)$|^chatgpt$/, "ChatGPT", "ia"],
  [/(^|\.)perplexity\.ai$|^perplexity$/, "Perplexity", "ia"],
  [/(^|\.)gemini\.google\.com$|^gemini$|(^|\.)bard\.google\.com$/, "Gemini", "ia"],
  [/(^|\.)copilot\.microsoft\.com$|^copilot$/, "Copilot", "ia"],
  [/(^|\.)claude\.ai$|^claude$/, "Claude", "ia"],
  [/(^|\.)(you\.com|phind\.com|meta\.ai|deepseek\.com|chat\.deepseek\.com|grok\.com|poe\.com)$/, "Otra IA", "ia"],
  [/(^|\.)google\.[a-z.]+$|^google$/, "Google", "organico"],
  [/(^|\.)bing\.com$|^bing$/, "Bing", "organico"],
  [/(^|\.)(duckduckgo\.com|ecosia\.org|search\.yahoo\.com|yahoo\.com|search\.brave\.com|startpage\.com|yandex\.[a-z]+|baidu\.com)$|^(duckduckgo|ecosia|yahoo|brave)$/, "Otro buscador", "organico"],
  [/(^|\.)instagram\.com$|^(instagram|ig)$/, "Instagram", "redes"],
  [/(^|\.)tiktok\.com$|^tiktok$/, "TikTok", "redes"],
  [/(^|\.)(facebook\.com|fb\.com|fb\.me|messenger\.com)$|^(facebook|fb)$/, "Facebook", "redes"],
  [/(^|\.)(x\.com|twitter\.com|t\.co)$|^(x|twitter)$/, "X / Twitter", "redes"],
  [/(^|\.)(youtube\.com|youtu\.be)$|^youtube$/, "YouTube", "redes"],
  [/(^|\.)(linkedin\.com|lnkd\.in)$|^linkedin$/, "LinkedIn", "redes"],
  [/(^|\.)(threads\.net|threads\.com)$|^threads$/, "Threads", "redes"],
  [/(^|\.)(whatsapp\.com|wa\.me)$|^whatsapp$/, "WhatsApp", "redes"],
  [/(^|\.)(mail\.google\.com|outlook\.live\.com|outlook\.office\.com|mail\.yahoo\.com)$|^(email|newsletter|correo|resend)$/, "Correo", "correo"],
];
const MEDIOS_PAGADOS = /^(paid|cpc|ppc|cpm|paidsocial|paid_social|paid-social|display|ads?|retargeting)$/;

/** Fuente legible y tipo de canal (canal = utm_source o dominio del referente). */
export function grupoCanal(canal: string | null, medio: string | null): { fuente: string; grupo: GrupoCanal } {
  const c = (canal || "directo").toLowerCase().trim();
  const m = (medio || "").toLowerCase().trim();
  const hit = FUENTES.find(([re]) => re.test(c));
  const fuente = hit?.[1] ?? (c === "directo" ? "Directo" : c);
  if (MEDIOS_PAGADOS.test(m)) return { fuente, grupo: "anuncios" };
  if (m === "email" || m === "correo" || m === "newsletter") return { fuente, grupo: "correo" };
  if (m === "social" || m === "bio" || m === "organic_social") return { fuente, grupo: hit?.[2] === "ia" ? "ia" : "redes" };
  if (hit) return { fuente, grupo: hit[2] };
  return { fuente, grupo: c === "directo" ? "directo" : "referido" };
}

// ── Sesiones y embudo ───────────────────────────────────────────────────────

/** Una fila de analitica_sesiones() (0007). */
export interface Sesion {
  sesion_id: string;
  visitante_id: string;
  inicio: string;
  fin: string;
  utm_source: string | null;
  utm_medium: string | null;
  campana: string | null;
  palabra_clave: string | null;
  referente: string | null;
  entrada: string | null;
  pais: string | null;
  dispositivo: string | null;
  nuevo: boolean | null;
  paginas: number;
  rutas: number;
  ms: number;
  scroll: number;
  textos: string[];
  textos_enteros: string[];
  leyo: boolean;
  leyo_entero: boolean;
  vio_oferta: boolean;
  interactuo: boolean;
  whatsapp: boolean;
  comento: boolean;
  quiso: boolean;
  fue_a_pagar: boolean;
  compra: boolean;
  pedidos: number;
  ingresos: number;
  acciones: string[];
}

/** Menos de esto, en una sola página y sin tocar nada, es un rebote (criterio de GA4). */
export const MS_REBOTE = 10_000;

export const reboto = (s: Sesion) => s.rutas <= 1 && s.ms < MS_REBOTE && !s.interactuo && !s.comento && !s.quiso && !s.compra;

export const canalDe = (s: Sesion) => grupoCanal(s.utm_source ?? s.referente, s.utm_medium);

/** Pasos del embudo, abiertos: una sesión cuenta en un paso aunque se haya saltado el anterior. */
export const PASOS: { clave: string; nombre: string; cumple: (s: Sesion) => boolean }[] = [
  { clave: "entraron", nombre: "Entraron", cumple: () => true },
  { clave: "quedaron", nombre: "Se quedaron (no rebotaron)", cumple: (s) => !reboto(s) },
  { clave: "leyeron", nombre: "Abrieron un texto", cumple: (s) => s.leyo },
  { clave: "enteros", nombre: "Leyeron un texto hasta el final", cumple: (s) => s.leyo_entero },
  { clave: "oferta", nombre: "Miraron el libro, la tienda o la corrección", cumple: (s) => s.vio_oferta },
  { clave: "quisieron", nombre: "Agregaron al carro o abrieron un plan", cumple: (s) => s.quiso },
  { clave: "pagar", nombre: "Fueron a pagar", cumple: (s) => s.fue_a_pagar },
  { clave: "compraron", nombre: "Pagaron", cumple: (s) => s.compra },
];

export function embudo(sesiones: Sesion[]) {
  const total = sesiones.length;
  let previo = total;
  return PASOS.map((p) => {
    const n = sesiones.filter(p.cumple).length;
    const fila = { ...p, n, delTotal: total ? n / total : 0, delPrevio: previo ? n / previo : 0 };
    previo = n;
    return fila;
  });
}

function mediana(numeros: number[]): number {
  if (!numeros.length) return 0;
  const o = [...numeros].sort((a, b) => a - b);
  const m = Math.floor(o.length / 2);
  return o.length % 2 ? o[m] : Math.round((o[m - 1] + o[m]) / 2);
}

export function resumenSesiones(sesiones: Sesion[]) {
  const quedaron = sesiones.filter((s) => !reboto(s));
  const personas = new Set(sesiones.map((s) => s.visitante_id)).size;
  return {
    sesiones: sesiones.length,
    personas,
    rebote: sesiones.length ? 1 - quedaron.length / sesiones.length : 0,
    // La media de todas engaña (pestañas olvidadas y rebotes de 4 s): mediana de las que se quedaron.
    tiempoMediano: mediana(quedaron.map((s) => s.ms)),
    paginasPorSesion: sesiones.length ? sesiones.reduce((a, s) => a + s.paginas, 0) / sesiones.length : 0,
    whatsapp: sesiones.filter((s) => s.whatsapp).length,
    comentaron: sesiones.filter((s) => s.comento).length,
    compras: sesiones.reduce((a, s) => a + s.pedidos, 0),
    ingresos: sesiones.reduce((a, s) => a + s.ingresos, 0),
  };
}

/** Por tipo de canal: sesiones, rebote, lectura, contacto y ventas (solo los que tienen visitas). */
export function porCanal(sesiones: Sesion[]) {
  const grupos = new Map<GrupoCanal, Sesion[]>();
  for (const s of sesiones) {
    const g = canalDe(s).grupo;
    grupos.set(g, [...(grupos.get(g) ?? []), s]);
  }
  return GRUPOS_CANAL.filter((g) => grupos.has(g)).map((g) => {
    const lista = grupos.get(g)!;
    const r = resumenSesiones(lista);
    const fuentes = new Map<string, number>();
    for (const s of lista) fuentes.set(canalDe(s).fuente, (fuentes.get(canalDe(s).fuente) ?? 0) + 1);
    return {
      grupo: g,
      ...r,
      leyeron: lista.filter((s) => s.leyo).length,
      fuentes: [...fuentes.entries()].sort((a, b) => b[1] - a[1]),
    };
  });
}

/** Cuántas sesiones tienen cada valor (páginas de entrada, textos, acciones…), de mayor a menor. */
export function contarPorSesion(sesiones: Sesion[], valores: (s: Sesion) => (string | null | undefined)[]) {
  const acc = new Map<string, number>();
  for (const s of sesiones) for (const v of new Set(valores(s))) if (v) acc.set(v, (acc.get(v) ?? 0) + 1);
  return [...acc.entries()].sort((a, b) => b[1] - a[1]);
}
