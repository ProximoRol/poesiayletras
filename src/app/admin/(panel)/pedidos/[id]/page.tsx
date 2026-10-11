import Link from "next/link";
import { notFound } from "next/navigation";
import { BotonConfirmar } from "@/components/panel/BotonConfirmar";
import { fechaLarga } from "@/lib/contacto";
import { formatoCLP } from "@/lib/dinero";
import { ESTADOS } from "@/lib/pedidos";
import { cancelarPedido, marcarEnviado } from "@/server/panel/acciones";
import { usuario } from "@/server/supabase";
import type { Pedido } from "@/server/tipos";

export default async function DetallePedido({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const db = await usuario();
  const { data } = await db.from("pedidos").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const p = data as Pedido;

  return (
    <>
      <div className="panel-cabeza">
        <div>
          <Link href="/admin/pedidos" className="enlace">← Pedidos</Link>
          <h1 style={{ marginTop: 8 }}>Pedido #{p.numero}</h1>
          <p className="muted">{fechaLarga(p.creado_en)}</p>
        </div>
        <span className={`estado ${ESTADOS[p.estado].clase}`} style={{ fontSize: ".9rem" }}>{ESTADOS[p.estado].texto}</span>
      </div>

      <div className="caja">
        <h2 className="serif" style={{ fontSize: "1.3rem", marginBottom: 10 }}>Enviar a</h2>
        <p style={{ fontSize: "1.15rem", lineHeight: 1.7 }}>
          <b>{p.nombre}</b>{p.rut && <> · RUT {p.rut}</>}
          <br />{p.direccion}
          <br />{p.comuna}, {p.region}
          <br />Tel. <a className="enlace" href={`tel:${p.telefono.replace(/\s/g, "")}`}>{p.telefono}</a> · <a className="enlace" href={`mailto:${p.correo}`}>{p.correo}</a>
        </p>
        {p.notas && <p className="ayuda" style={{ marginTop: 14 }}><b>Nota del comprador:</b> {p.notas}</p>}
      </div>

      <div className="caja">
        <h2 className="serif" style={{ fontSize: "1.3rem", marginBottom: 10 }}>Productos</h2>
        {p.items.map((i, n) => (
          <div key={n} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "4px 0", fontSize: "1.05rem" }}>
            <span>{i.cantidad} × {i.nombre}</span>
            <b>{formatoCLP(i.precio * i.cantidad)}</b>
          </div>
        ))}
        <div className="cart-total" style={{ borderTop: "1px solid var(--borde)", paddingTop: 10, marginTop: 8 }}>
          <span>{p.estado === "pendiente_pago" || p.estado === "cancelado" ? "Total" : "Total pagado"}</span>
          <span>{formatoCLP(p.total)}</span>
        </div>
        <p className="muted" style={{ fontSize: ".9rem", marginTop: 6 }}>El envío lo paga el comprador al recibirlo.</p>
      </div>

      {p.estado === "pagado" && (
        <form action={marcarEnviado} className="caja form-panel">
          <input type="hidden" name="id" value={p.id} />
          <h2 className="serif" style={{ fontSize: "1.3rem" }}>¿Ya lo despachaste?</h2>
          <label className="campo">
            <span>Número de seguimiento <small>· opcional, viene en el comprobante del courier</small></span>
            <input type="text" name="seguimiento" maxLength={100} />
          </label>
          <div>
            <button type="submit" className="btn btn-primary">Marcar como enviado y avisar al comprador</button>
          </div>
        </form>
      )}
      {p.estado === "enviado" && (
        <div className="caja">
          <p>📦 Enviado el {fechaLarga(p.enviado_en)}{p.seguimiento && <> · seguimiento <b>{p.seguimiento}</b></>}.</p>
        </div>
      )}
      {p.estado === "pendiente_pago" && (
        <form action={cancelarPedido} className="caja">
          <input type="hidden" name="id" value={p.id} />
          <p style={{ marginBottom: 12 }}>Esta persona empezó la compra pero todavía no paga. No hay nada que enviar.</p>
          <BotonConfirmar pregunta="¿Cancelar este pedido sin pagar?">Cancelar pedido</BotonConfirmar>
        </form>
      )}
    </>
  );
}
