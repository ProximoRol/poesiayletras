import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export const SEMANA_MS = 7 * 24 * 60 * 60 * 1000;

/** Comentarios por aprobar (si revisa antes) y comentarios llegados en los últimos 7 días. */
export async function resumenComentarios(db: SupabaseClient): Promise<{ pendientes: number; semana: number }> {
  const desde = new Date(Date.now() - SEMANA_MS).toISOString();
  const [p, s] = await Promise.all([
    db.from("comentarios").select("id", { count: "exact", head: true }).eq("estado", "pendiente"),
    db.from("comentarios").select("id", { count: "exact", head: true }).gte("creado_en", desde),
  ]);
  return { pendientes: p.count ?? 0, semana: s.count ?? 0 };
}
