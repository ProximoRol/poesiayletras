import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { env, exigir } from "./env";

// Mercado Pago Checkout Pro, sin SDK: crear la preferencia (el link de pago), leer un pago y
// verificar la firma del aviso (webhook). La plata llega a la cuenta del autor.

export interface ItemCobro {
  producto_id: string;
  nombre: string;
  precio: number;
  cantidad: number;
}

export class ErrorMP extends Error {
  constructor(public estado: number, ruta: string) {
    super(`Mercado Pago ${ruta} → ${estado}`);
  }
}

async function mp<T>(ruta: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${env.mpApi}${ruta}`, {
    ...init,
    headers: { Authorization: `Bearer ${exigir("mpToken")}`, "Content-Type": "application/json", ...init.headers },
    signal: AbortSignal.timeout(15000),
    cache: "no-store",
  });
  if (!res.ok) throw new ErrorMP(res.status, ruta);
  return (await res.json()) as T;
}

export async function crearPreferencia(p: { pedidoId: string; numero: number; items: ItemCobro[]; nombre: string; correo: string }): Promise<{ id: string; url: string }> {
  const vuelta = `${env.sitio}/pedido/${p.pedidoId}`;
  const r = await mp<{ id: string; init_point: string }>("/checkout/preferences", {
    method: "POST",
    headers: { "X-Idempotency-Key": p.pedidoId },
    body: JSON.stringify({
      items: p.items.map((i) => ({ id: i.producto_id, title: i.nombre, quantity: i.cantidad, unit_price: i.precio, currency_id: "CLP" })),
      payer: { name: p.nombre, email: p.correo },
      external_reference: p.pedidoId,
      back_urls: { success: vuelta, pending: vuelta, failure: vuelta },
      auto_return: "approved",
      notification_url: `${env.sitio}/api/mercadopago`,
      statement_descriptor: "WAGNER PEREZ",
      metadata: { numero: p.numero },
    }),
  });
  return { id: r.id, url: r.init_point };
}

export interface PagoMP {
  id: number | string;
  status: string; // approved | pending | in_process | rejected | cancelled | refunded…
  external_reference: string | null;
  transaction_amount: number;
  currency_id: string;
}

export function leerPago(id: string): Promise<PagoMP> {
  if (!/^\d{1,30}$/.test(id)) throw new Error("id de pago inválido");
  return mp<PagoMP>(`/v1/payments/${id}`);
}

/**
 * Firma del aviso (cabecera x-signature «ts=…,v1=…»). Si no hay secreto configurado se acepta:
 * igual nunca se confía en el aviso, siempre se vuelve a leer el pago a Mercado Pago.
 */
export function firmaValida(cabeceras: Headers, dataId: string): boolean {
  if (!env.mpSecreto) return true;
  const firma = cabeceras.get("x-signature") ?? "";
  const pedido = cabeceras.get("x-request-id") ?? "";
  const partes = Object.fromEntries(firma.split(",").map((p) => p.split("=", 2).map((s) => s.trim())));
  if (!partes.ts || !partes.v1) return false;
  const manifiesto = `id:${dataId.toLowerCase()};request-id:${pedido};ts:${partes.ts};`;
  const esperada = createHmac("sha256", env.mpSecreto).update(manifiesto).digest("hex");
  const a = Buffer.from(esperada);
  const b = Buffer.from(String(partes.v1));
  return a.length === b.length && timingSafeEqual(a, b);
}
