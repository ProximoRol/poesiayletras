import type { Metadata } from "next";
import { MenuPanel } from "@/components/panel/MenuPanel";
import { exigirAutor } from "@/server/panel/auth";
import { resumenComentarios } from "@/server/panel/resumen";
import { usuario } from "@/server/supabase";

export const metadata: Metadata = { title: "Panel", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function LayoutPanel({ children }: { children: React.ReactNode }) {
  await exigirAutor();
  const db = await usuario();
  const { pendientes, semana } = await resumenComentarios(db);

  return (
    <div className="panel">
      <MenuPanel pendientes={pendientes || semana} />
      <main className="panel-main">
        <div className="wrap">{children}</div>
      </main>
    </div>
  );
}
