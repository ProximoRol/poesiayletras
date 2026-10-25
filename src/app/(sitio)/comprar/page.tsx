import type { Metadata } from "next";
import { FormCompra } from "@/components/FormCompra";
import { perfil } from "@/server/datos";
import { hayPagos } from "@/server/env";

export const metadata: Metadata = { title: "Comprar", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Comprar() {
  const p = await perfil();
  return (
    <section style={{ paddingTop: 50 }}>
      <div className="estrecho">
        <span className="eyebrow">Comprar</span>
        <h1 className="titulo-pagina" style={{ marginBottom: 28 }}>Ya casi es <em>tuyo</em></h1>
        <FormCompra pagosActivos={hayPagos()} whatsapp={p.whatsapp} />
      </div>
    </section>
  );
}
