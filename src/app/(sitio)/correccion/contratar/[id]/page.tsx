import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FormEncargo } from "@/components/FormEncargo";
import { RastrearAlVer } from "@/components/Instrumentacion";
import { serviciosVisibles } from "@/server/datos";
import { hayPagos } from "@/server/env";

export const metadata: Metadata = { title: "Contratar corrección", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Contratar({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const plan = (await serviciosVisibles()).find((s) => s.id === id);
  if (!plan || plan.precio === null || !hayPagos()) notFound();

  return (
    <section style={{ paddingTop: 50 }}>
      <div className="estrecho">
        <Link href="/correccion#servicios" className="enlace">← Corrección literaria</Link>
        <span className="eyebrow" style={{ display: "block", marginTop: 18 }}>Corrección · {plan.nombre}</span>
        <h1 className="titulo-pagina" style={{ marginBottom: 12 }}>Envíame <em>tu texto</em></h1>
        <p className="muted" style={{ marginBottom: 28 }}>{plan.descripcion}</p>
        <RastrearAlVer tipo="service_view" objeto={plan.id} valor={plan.precio} capa={{ evento: "view_item", ecommerce: { currency: "CLP", value: plan.precio, items: [{ item_id: plan.id, item_name: `Corrección · ${plan.nombre}`, item_category: "correccion", price: plan.precio }] } }} />
        <FormEncargo plan={plan} />
      </div>
    </section>
  );
}
