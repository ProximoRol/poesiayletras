// Reglas puras del blog: temas, slugs, extractos y el formato del texto.
// Sin dependencias de Next ni de Supabase, para poder probarlas solas.

/** Tema de un texto (Poesía, Cuento…). El autor los edita; el slug no cambia al renombrar. */
export type Formato = "verso" | "prosa";
export interface Tema {
  slug: string;
  nombre: string;
  formato: Formato;
  orden: number;
}
export const esFormato = (v: unknown): v is Formato => v === "verso" || v === "prosa";
/** Valor del selector de tema que significa «crear uno nuevo ahí mismo». */
export const NUEVO_TEMA = "__nuevo";

/** «Canción del árbol, otra vez» → «cancion-del-arbol-otra-vez». */
export function aSlug(titulo: string): string {
  const s = titulo
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/ñ/g, "n")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
  return s || "texto";
}

/** Primer slug libre: «poema», «poema-2», «poema-3»… */
export function slugLibre(base: string, ocupados: Iterable<string>): string {
  const usados = new Set(ocupados);
  if (!usados.has(base)) return base;
  for (let n = 2; ; n++) if (!usados.has(`${base}-${n}`)) return `${base}-${n}`;
}

/** Texto plano sin marcas de formato. */
export function sinMarcas(cuerpo: string): string {
  return cuerpo.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1");
}

/**
 * Extracto para tarjetas y al compartir. En verso conserva los primeros versos (con su salto
 * de línea); en prosa, las primeras frases hasta ~`max` caracteres.
 */
export function extracto(cuerpo: string, formato: Formato, max = 220): string {
  const limpio = sinMarcas(cuerpo).replace(/\r\n?/g, "\n").trim();
  if (!limpio) return "";
  if (formato === "verso") {
    const versos = limpio.split("\n").map((v) => v.trim()).filter(Boolean);
    const elegidos: string[] = [];
    let largo = 0;
    for (const v of versos) {
      if (elegidos.length >= 4 || (elegidos.length > 0 && largo + v.length > max)) break;
      elegidos.push(v);
      largo += v.length;
    }
    const resto = elegidos.length < versos.length;
    return elegidos.join("\n") + (resto ? "…" : "");
  }
  const plano = limpio.replace(/\s+/g, " ");
  if (plano.length <= max) return plano;
  const corte = plano.slice(0, max);
  const espacio = corte.lastIndexOf(" ");
  return (espacio > max * 0.6 ? corte.slice(0, espacio) : corte).replace(/[,;:.\s]+$/, "") + "…";
}

/** Minutos de lectura (≈200 palabras por minuto, mínimo 1). */
export function minutosLectura(cuerpo: string): number {
  const palabras = cuerpo.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(palabras / 200));
}

// ── Formato ─────────────────────────────────────────────────────────────────
// El autor escribe como en un cuaderno: Enter = nueva línea (verso), línea en blanco = nueva
// estrofa o párrafo. Opcional: *cursiva* y **negrita**. Nada más; nada de HTML.

export type Tramo = { t: string; cursiva?: true; negrita?: true };
export type Linea = Tramo[];
export type Bloque = Linea[];

export function tramos(linea: string): Linea {
  const out: Linea = [];
  const re = /\*\*(.+?)\*\*|\*(.+?)\*/g;
  let ultimo = 0;
  for (const m of linea.matchAll(re)) {
    if (m.index > ultimo) out.push({ t: linea.slice(ultimo, m.index) });
    if (m[1] !== undefined) out.push({ t: m[1], negrita: true });
    else out.push({ t: m[2], cursiva: true });
    ultimo = m.index + m[0].length;
  }
  if (ultimo < linea.length) out.push({ t: linea.slice(ultimo) });
  return out;
}

export function bloques(cuerpo: string): Bloque[] {
  return cuerpo
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n/)
    .map((b) => b.split("\n").map((l) => l.replace(/\s+$/, "")))
    .filter((lineas) => lineas.some((l) => l.trim()))
    .map((lineas) => lineas.map(tramos));
}
