"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { formatoCLP, REGIONES } from "@/lib/dinero";
import { ENVIO_GRATIS, envioPorPagar } from "@/lib/envio";
import { capaDatos, rastrear, vaciar } from "@/lib/rastreo";
import { comprar, type EstadoCompra } from "@/server/comprar";
import { IdsVisita } from "./IdsVisita";
import { useCarrito } from "./Carrito";

export function FormCompra({ pagosActivos, whatsapp }: { pagosActivos: boolean; whatsapp: string | null }) {
  const { lineas, total, listo } = useCarrito();
  const [estado, enviar, enviando] = useActionState<EstadoCompra, FormData>(comprar, null);
  const [region, setRegion] = useState("");
  const [comuna, setComuna] = useState("");
  const porPagar = envioPorPagar(region, comuna);

  if (!listo) return <p className="muted">Cargando tu carrito…</p>;
  if (!lineas.length) {
    return (
      <div className="vacio">
        <p style={{ marginBottom: 18 }}>Tu carrito está vacío.</p>
        <Link href="/tienda" className="btn btn-primary">Ir a la tienda</Link>
      </div>
    );
  }

  return (
    <form
      action={enviar}
      className="form-panel"
      onSubmit={() => {
        rastrear("checkout_start", { valor: total });
        capaDatos("begin_checkout", {}, { currency: "CLP", value: total, items: lineas.map((l) => ({ item_id: l.id, item_name: l.nombre, price: l.precio, quantity: l.cantidad })) });
        vaciar(); // sale ya: después viene la página de Flow
      }}
    >
      <IdsVisita />
      <input type="hidden" name="carro" value={JSON.stringify(lineas.map((l) => ({ producto_id: l.id, cantidad: l.cantidad })))} />

      <div className="caja-compra">
        <h2 className="serif" style={{ fontSize: "1.4rem", marginBottom: 12 }}>Tu pedido</h2>
        {lineas.map((l) => (
          <div key={l.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "6px 0" }}>
            <span>{l.cantidad} × {l.nombre}</span>
            <b>{formatoCLP(l.precio * l.cantidad)}</b>
          </div>
        ))}
        <div className="cart-total" style={{ borderTop: "1px solid var(--borde)", paddingTop: 12, marginTop: 8 }}>
          <span>Total</span>
          <span>{formatoCLP(total)}</span>
        </div>
        <p className="muted" style={{ fontSize: ".9rem", marginTop: 8 }}>
          {porPagar ? (
            <>+ envío <b>por pagar</b>: a Magallanes e Isla de Pascua lo despachamos por Starken o Blue Express y pagas el envío al recibirlo.</>
          ) : (
            <><b>Envío gratis</b>: lo despachamos por Starken o Blue Express. {region ? "" : ENVIO_GRATIS}</>
          )}
        </p>
      </div>

      <div className="caja-compra form-panel">
        <h2 className="serif" style={{ fontSize: "1.4rem" }}>¿A quién se lo enviamos?</h2>
        <div className="dos-col">
          <label className="campo"><span>Nombre completo</span><input type="text" name="nombre" required autoComplete="name" maxLength={120} /></label>
          <label className="campo"><span>RUT <small>· opcional, lo pide el courier</small></span><input type="text" name="rut" maxLength={15} placeholder="12.345.678-9" /></label>
          <label className="campo"><span>Correo <small>· te llega la confirmación</small></span><input type="email" name="correo" required autoComplete="email" maxLength={200} /></label>
          <label className="campo"><span>Teléfono</span><input type="tel" name="telefono" required autoComplete="tel" placeholder="+56 9 1234 5678" maxLength={30} /></label>
        </div>
        <label className="campo"><span>Dirección <small>· calle, número, depto.</small></span><input type="text" name="direccion" required autoComplete="street-address" maxLength={200} /></label>
        <div className="dos-col">
          <label className="campo"><span>Comuna</span><input type="text" name="comuna" required maxLength={80} value={comuna} onChange={(e) => setComuna(e.target.value)} /></label>
          <label className="campo">
            <span>Región</span>
            <select name="region" required value={region} onChange={(e) => setRegion(e.target.value)}>
              <option value="" disabled>Elige…</option>
              {REGIONES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
        </div>
        <label className="campo">
          <span>Nota <small>· opcional, por ejemplo «dedicado a María»</small></span>
          <textarea name="notas" rows={2} maxLength={1000} style={{ minHeight: 70 }} />
        </label>
      </div>

      {estado && !estado.ok && <p className="aviso error">{estado.error}</p>}
      {pagosActivos ? (
        <button type="submit" className="btn btn-primary" disabled={enviando} style={{ fontSize: "1.05rem", padding: "16px 28px" }}>
          {enviando ? "Llevándote a pagar…" : `Pagar ${formatoCLP(total)}`}
        </button>
      ) : (
        <p className="aviso info">
          El pago en línea estará disponible muy pronto.
          {whatsapp && <> Mientras tanto, <a className="enlace" href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer">pídelo por WhatsApp</a>.</>}
        </p>
      )}
      <small className="muted">Vas a pagar en Flow, el sistema de pago seguro (tarjeta de crédito, débito o transferencia). No guardamos datos de tarjetas.</small>
    </form>
  );
}
