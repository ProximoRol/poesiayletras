"use client";

import { useActionState, useState } from "react";
import { ARCHIVO_MAX, cantidadTexto, EXTENSIONES, UNIDADES } from "@/lib/correccion";
import { formatoCLP } from "@/lib/dinero";
import { capaDatos, rastrear, vaciar } from "@/lib/rastreo";
import { contratar, type EstadoContrato } from "@/server/contratar";
import type { Servicio } from "@/server/tipos";
import { IdsVisita } from "./IdsVisita";

export function FormEncargo({ plan }: { plan: Servicio }) {
  const [estado, enviar, enviando] = useActionState<EstadoContrato, FormData>(contratar, null);
  const porCantidad = plan.unidad !== "fijo";
  const [cantidad, setCantidad] = useState(plan.minimo);
  const [aviso, setAviso] = useState<string | null>(null);
  const precio = plan.precio ?? 0;
  const total = precio * (porCantidad ? Math.max(cantidad, plan.minimo) : 1);

  return (
    <form
      action={enviar}
      className="form-panel"
      onSubmit={() => {
        rastrear("service_start", { objeto: plan.id, valor: total });
        capaDatos("begin_checkout", {}, { currency: "CLP", value: total, items: [{ item_id: plan.id, item_name: `Corrección · ${plan.nombre}`, item_category: "correccion", price: precio, quantity: porCantidad ? Math.max(cantidad, plan.minimo) : 1 }] });
        vaciar();
      }}
    >
      <IdsVisita />
      <input type="hidden" name="servicio" value={plan.id} />

      <div className="caja-compra form-panel">
        <h2 className="serif" style={{ fontSize: "1.4rem" }}>Tu texto</h2>
        {porCantidad && (
          <label className="campo" style={{ maxWidth: 260 }}>
            <span>{UNIDADES[plan.unidad].pregunta} {plan.minimo > 1 && <small>· mínimo {plan.minimo}</small>}</span>
            <input
              type="number"
              name="cantidad"
              min={plan.minimo}
              max={500}
              required
              value={cantidad}
              onChange={(e) => setCantidad(Number.parseInt(e.target.value, 10) || plan.minimo)}
            />
          </label>
        )}
        {plan.nota && <p className="muted" style={{ fontSize: ".92rem", margin: 0 }}>{plan.nota}</p>}
        <label className="campo">
          <span>Archivo <small>· Word, PDF u otro de texto, hasta 4 MB</small></span>
          <input
            type="file"
            name="archivo"
            required
            accept={EXTENSIONES.join(",")}
            onChange={(e) => {
              const f = e.target.files?.[0];
              setAviso(f && f.size > ARCHIVO_MAX ? "Ese archivo pesa más de 4 MB. Si es muy largo, escríbenos por WhatsApp." : null);
            }}
          />
        </label>
        {aviso && <p className="aviso error" style={{ margin: 0 }}>{aviso}</p>}
        <label className="campo">
          <span>Cuéntame sobre tu texto <small>· opcional: qué es, para qué es, si hay un plazo</small></span>
          <textarea name="notas" rows={3} maxLength={2000} style={{ minHeight: 90 }} />
        </label>
      </div>

      <div className="caja-compra form-panel">
        <h2 className="serif" style={{ fontSize: "1.4rem" }}>¿A quién se lo devuelvo?</h2>
        <div className="dos-col">
          <label className="campo"><span>Nombre completo</span><input type="text" name="nombre" required autoComplete="name" maxLength={120} /></label>
          <label className="campo"><span>Correo <small>· ahí te llega el texto corregido</small></span><input type="email" name="correo" required autoComplete="email" maxLength={200} /></label>
          <label className="campo"><span>Teléfono</span><input type="tel" name="telefono" required autoComplete="tel" placeholder="+56 9 1234 5678" maxLength={30} /></label>
        </div>
      </div>

      <div className="caja-compra">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "6px 0" }}>
          <span>{plan.nombre}{porCantidad && ` · ${cantidadTexto(plan.unidad, Math.max(cantidad, plan.minimo))} × ${formatoCLP(precio)}`}</span>
        </div>
        <div className="cart-total" style={{ borderTop: "1px solid var(--borde)", paddingTop: 12, marginTop: 8 }}>
          <span>Total</span>
          <span>{formatoCLP(total)}</span>
        </div>
      </div>

      {estado && !estado.ok && <p className="aviso error">{estado.error}</p>}
      <button type="submit" className="btn btn-primary" disabled={enviando || Boolean(aviso)} style={{ fontSize: "1.05rem", padding: "16px 28px" }}>
        {enviando ? "Subiendo tu texto…" : `Pagar ${formatoCLP(total)}`}
      </button>
      <small className="muted">Vas a pagar en Flow, el sistema de pago seguro (tarjeta de crédito, débito o transferencia). Tu texto solo lo lee el autor.</small>
    </form>
  );
}
