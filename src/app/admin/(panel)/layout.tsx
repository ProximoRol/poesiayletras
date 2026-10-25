import type { Metadata } from "next";
import { MenuPanel } from "@/components/panel/MenuPanel";
import { exigirAutor } from "@/server/panel/auth";
import { resumenPanel } from "@/server/panel/resumen";
import { usuario } from "@/server/supabase";

export const metadata: Metadata = { title: "Panel", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function LayoutPanel({ children }: { children: React.ReactNode }) {
  await exigirAutor();
  const db = await usuario();
  const { pendientes, semana, porEnviar, porCorregir } = await resumenPanel(db);

  return (
    <div className="panel">
      <MenuPanel comentarios={pendientes || semana} pedidos={porEnviar} correcciones={porCorregir} />
      <main className="panel-main">
        <div className="wrap">{children}</div>
      </main>
    </div>
  );
}
