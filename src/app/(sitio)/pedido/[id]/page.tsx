import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { VaciarCarrito } from "@/components/Carrito";
import { formatoCLP } from "@/lib/dinero";
import { perfil } from "@/server/datos";
import { hayPagos } from "@/server/env";
import { pedidoPorId, procesarPago } from "@/server/pedidos";

export const metadata: Metadata = { title: "Tu pedido", robots: { index: false } };
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ payment_id?: string; status?: string }> };

export default async function PaginaPedido({ params, searchParams }: Props) {
  if (!hayPagos()) notFound();
  const [{ id }, { payment_id, status }] = await Promise.all([params, searchParams]);

  // Al volver de Mercado Pago se confirma el pago aquí mismo (por si el aviso aún no llega).
  // procesarPago lo vuelve a leer a Mercado Pago: la URL no basta para marcarlo pagado.
  if (payment_id && /^\d{1,30}$/.test(payment_id)) {
    try {
      await procesarPago(payment_id, { revalidar: false });
    } catch (e) {
      console.error("[pedido] no se pudo confirmar el pago al volver", e);
    }
  }

  const [pedido, p] = await Promise.all([pedidoPorId(id), perfil()]);
  if (!pedido) notFound();
  const pagado = pedido.estado === "pagado" || pedido.estado === "enviado";
  const rechazado = !pagado && (status === "rejected" || status === "failure" || status === "null");

  return (
    <section style={{ paddingTop: 60 }}>
      <div className="estrecho centro">
        {pagado && <VaciarCarrito />}
        <span className="eyebrow">Pedido #{pedido.numero}</span>
        {pagado ? (
          <>
            <h1 className="titulo-pagina">¡Gracias, <em>{pedido.nombre.split(" ")[0]}</em>!</h1>
            <p className="muted" style={{ fontSize: "1.1rem", marginBottom: 28 }}>
              Recibimos tu pago. {p.nombre.split(" ")[0]} prepara tu pedido y te lo envía por pagar a {pedido.comuna}. Te llegó la confirmación a {pedido.correo}.
            </p>
          </>
        ) : rechazado ? (
          <>
            <h1 className="titulo-pagina">El pago <em>no se completó</em></h1>
            <p className="muted" style={{ fontSize: "1.1rem", marginBottom: 28 }}>No se hizo ningún cobro. Puedes intentarlo de nuevo con otro medio de pago.</p>
            <Link href="/comprar" className="btn btn-primary">Intentar de nuevo</Link>
          </>
        ) : (
          <>
            <h1 className="titulo-pagina">Estamos esperando <em>tu pago</em></h1>
            <p className="muted" style={{ fontSize: "1.1rem", marginBottom: 28 }}>
              Si pagaste por transferencia o en efectivo, puede tardar un poco. Te avisaremos por correo cuando se confirme.
            </p>
          </>
        )}
        <div className="caja-compra" style={{ textAlign: "left", marginTop: 30 }}>
          {pedido.items.map((i, n) => (
            <div key={n} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "4px 0" }}>
              <span>{i.cantidad} × {i.nombre}</span>
              <b>{formatoCLP(i.precio * i.cantidad)}</b>
            </div>
          ))}
          <div className="cart-total" style={{ borderTop: "1px solid var(--borde)", paddingTop: 10, marginTop: 8 }}>
            <span>Total</span>
            <span>{formatoCLP(pedido.total)}</span>
          </div>
        </div>
        <p style={{ marginTop: 30 }}><Link href="/textos" className="enlace">Mientras tanto, lee algunos de sus textos →</Link></p>
      </div>
    </section>
  );
}
