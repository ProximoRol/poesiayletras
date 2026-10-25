import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cantidadTexto } from "@/lib/correccion";
import { formatoCLP } from "@/lib/dinero";
import { perfil } from "@/server/datos";
import { hayPagos } from "@/server/env";
import { encargoPorId } from "@/server/pedidos";

export const metadata: Metadata = { title: "Tu corrección", robots: { index: false } };
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ pago?: string }> };

export default async function PaginaEncargo({ params, searchParams }: Props) {
  if (!hayPagos()) notFound();
  // El pago ya se confirmó al volver de Flow (/api/flow/retorno), leyéndolo a Flow.
  // ?pago=rechazado solo cambia el mensaje: el estado real es el del encargo.
  const [{ id }, { pago }] = await Promise.all([params, searchParams]);
  const [encargo, p] = await Promise.all([encargoPorId(id), perfil()]);
  if (!encargo) notFound();
  const pagado = encargo.estado === "pagado" || encargo.estado === "entregado";
  const rechazado = !pagado && pago === "rechazado";
  const autor = p.nombre.split(" ")[0];

  return (
    <section style={{ paddingTop: 60 }}>
      <div className="estrecho centro">
        <span className="eyebrow">Corrección #{encargo.numero}</span>
        {pagado ? (
          <>
            <h1 className="titulo-pagina">¡Gracias, <em>{encargo.nombre.split(" ")[0]}</em>!</h1>
            <p className="muted" style={{ fontSize: "1.1rem", marginBottom: 28 }}>
              Recibimos tu pago y tu texto. {autor} lo corregirá y te lo devolverá a {encargo.correo}.
            </p>
          </>
        ) : rechazado ? (
          <>
            <h1 className="titulo-pagina">El pago <em>no se completó</em></h1>
            <p className="muted" style={{ fontSize: "1.1rem", marginBottom: 28 }}>No se hizo ningún cobro. Puedes intentarlo de nuevo con otro medio de pago.</p>
            <Link href="/correccion#servicios" className="btn btn-primary">Intentar de nuevo</Link>
          </>
        ) : (
          <>
            <h1 className="titulo-pagina">Estamos esperando <em>tu pago</em></h1>
            <p className="muted" style={{ fontSize: "1.1rem", marginBottom: 28 }}>
              Si pagaste por transferencia, puede tardar un poco. Te avisaremos por correo cuando se confirme.
            </p>
          </>
        )}
        <div className="caja-compra" style={{ textAlign: "left", marginTop: 30 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "4px 0" }}>
            <span>{encargo.servicio}{encargo.unidad !== "fijo" && ` · ${cantidadTexto(encargo.unidad, encargo.cantidad)}`}</span>
          </div>
          {encargo.archivo_nombre && <p className="muted" style={{ fontSize: ".92rem", margin: "4px 0 0" }}>Tu archivo: {encargo.archivo_nombre}</p>}
          <div className="cart-total" style={{ borderTop: "1px solid var(--borde)", paddingTop: 10, marginTop: 8 }}>
            <span>Total</span>
            <span>{formatoCLP(encargo.total)}</span>
          </div>
        </div>
        <p style={{ marginTop: 30 }}><Link href="/textos" className="enlace">Mientras tanto, lee algunos de sus textos →</Link></p>
      </div>
    </section>
  );
}
