import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export const SEMANA_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Lo que el autor tiene que atender: comentarios por aprobar (si revisa antes), comentarios de
 * los últimos 7 días, pedidos pagados por enviar y correcciones pagadas por entregar.
 */
export async function resumenPanel(db: SupabaseClient): Promise<{ pendientes: number; semana: number; porEnviar: number; porCorregir: number }> {
  const desde = new Date(Date.now() - SEMANA_MS).toISOString();
  const [p, s, e, c] = await Promise.all([
    db.from("comentarios").select("id", { count: "exact", head: true }).eq("estado", "pendiente"),
    db.from("comentarios").select("id", { count: "exact", head: true }).gte("creado_en", desde),
    db.from("pedidos").select("id", { count: "exact", head: true }).eq("estado", "pagado"),
    db.from("encargos").select("id", { count: "exact", head: true }).eq("estado", "pagado"),
  ]);
  return { pendientes: p.count ?? 0, semana: s.count ?? 0, porEnviar: e.count ?? 0, porCorregir: c.count ?? 0 };
}
