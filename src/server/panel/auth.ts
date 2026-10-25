import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";
import { hayBase } from "../env";
import { usuario } from "../supabase";

/**
 * Exige al autor. Se llama en el layout del panel Y en cada acción del servidor: el proxy y
 * el layout no protegen las server actions por sí solos.
 */
export const exigirAutor = cache(async (): Promise<{ email: string }> => {
  if (!hayBase()) redirect("/admin/login");
  const db = await usuario();
  const { data } = await db.auth.getUser();
  if (!data.user?.email) redirect("/admin/login");
  const { data: esAdmin } = await db.rpc("es_admin");
  if (!esAdmin) redirect("/admin/login?error=no_admin");
  return { email: data.user.email };
});
