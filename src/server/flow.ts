import "server-only";

import { createHmac } from "node:crypto";
import { env, exigir } from "./env";

// Flow (flow.cl), sin SDK: crear el cobro (link de pago) y leer su estado. La plata llega a la
// cuenta del autor. Cada llamada va firmada: HMAC-SHA256 con la secretKey sobre los parámetros
// ordenados por nombre y pegados «nombrevalor», en el parámetro `s`.

export interface ItemCobro {
  producto_id: string;
  nombre: string;
  precio: number;
  cantidad: number;
}

export class ErrorFlow extends Error {
  constructor(public estado: number, ruta: string, detalle = "") {
    super(`Flow ${ruta} → ${estado}${detalle ? ` ${detalle}` : ""}`);
  }
}

export function firmar(params: Record<string, string>, secreto: string): string {
  const texto = Object.keys(params)
    .sort()
    .map((k) => k + params[k])
    .join("");
  return createHmac("sha256", secreto).update(texto).digest("hex");
}

function conFirma(params: Record<string, string>): URLSearchParams {
  const todos = { ...params, apiKey: exigir("flowApiKey") };
  return new URLSearchParams({ ...todos, s: firmar(todos, exigir("flowSecreto")) });
}

async function flow<T>(ruta: string, params: Record<string, string>, metodo: "GET" | "POST"): Promise<T> {
  const cuerpo = conFirma(params);
  const res = await fetch(metodo === "GET" ? `${env.flowApi}${ruta}?${cuerpo}` : `${env.flowApi}${ruta}`, {
    method: metodo,
    headers: metodo === "POST" ? { "Content-Type": "application/x-www-form-urlencoded" } : undefined,
    body: metodo === "POST" ? cuerpo : undefined,
    signal: AbortSignal.timeout(15000),
    cache: "no-store",
  });
  if (!res.ok) throw new ErrorFlow(res.status, ruta, await res.text().catch(() => ""));
  return (await res.json()) as T;
}

/** Crea el cobro del pedido y devuelve a dónde mandar al comprador. */
export async function crearCobro(p: { pedidoId: string; numero: number; total: number; correo: string; autor: string }): Promise<{ token: string; url: string }> {
  const r = await flow<{ url: string; token: string; flowOrder: number }>(
    "/payment/create",
    {
      commerceOrder: p.pedidoId,
      subject: `Pedido #${p.numero} · ${p.autor}`.slice(0, 120),
      currency: "CLP",
      amount: String(p.total),
      email: p.correo,
      paymentMethod: "9", // todos los medios que tenga activos la cuenta (tarjetas, transferencia…)
      urlConfirmation: `${env.sitio}/api/flow/confirmacion`,
      urlReturn: `${env.sitio}/api/flow/retorno`,
    },
    "POST",
  );
  return { token: r.token, url: `${r.url}?token=${encodeURIComponent(r.token)}` };
}

/** Estado de una orden en Flow: 1 pendiente, 2 pagada, 3 rechazada, 4 anulada. */
export interface EstadoFlow {
  flowOrder: number;
  commerceOrder: string;
  status: 1 | 2 | 3 | 4;
  amount: number | string;
  currency: string;
}

export const tokenValido = (token: string) => /^[A-Za-z0-9_-]{10,100}$/.test(token);

export function leerEstado(token: string): Promise<EstadoFlow> {
  if (!tokenValido(token)) throw new Error("token de Flow inválido");
  return flow<EstadoFlow>("/payment/getStatus", { token }, "GET");
}
