import type { Metadata } from "next";
import { MenuPanel } from "@/components/panel/MenuPanel";
import { exigirAutor } from "@/server/panel/auth";
import { usuario } from "@/server/supabase";

export const metadata: Metadata = { title: "Panel", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function LayoutPanel({ children }: { children: React.ReactNode }) {
  await exigirAutor();
  const db = await usuario();
  const { count } = await db.from("comentarios").select("id", { count: "exact", head: true }).eq("estado", "pendiente");

  return (
    <div className="panel">
      <MenuPanel pendientes={count ?? 0} />
      <main className="panel-main">
        <div className="wrap">{children}</div>
      </main>
    </div>
  );
}
