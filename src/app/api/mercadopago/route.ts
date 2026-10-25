import { NextResponse, type NextRequest } from "next/server";
import { hayPagos } from "@/server/env";
import { ErrorMP, firmaValida } from "@/server/mercadopago";
import { procesarPago } from "@/server/pedidos";

// Aviso (webhook) de Mercado Pago. Solo usa el id del pago: el estado real se vuelve a leer a
// Mercado Pago con nuestra clave. Llega como ?type=payment&data.id=123 y/o en el cuerpo JSON.

export async function POST(req: NextRequest) {
  if (!hayPagos()) return NextResponse.json({ ok: false }, { status: 503 });

  const url = req.nextUrl;
  let cuerpo: { type?: string; action?: string; data?: { id?: string | number } } = {};
  try {
    cuerpo = await req.json();
  } catch {}
  const tipo = url.searchParams.get("type") ?? url.searchParams.get("topic") ?? cuerpo.type ?? "";
  const id = String(url.searchParams.get("data.id") ?? cuerpo.data?.id ?? url.searchParams.get("id") ?? "");

  if (tipo !== "payment" || !/^\d{1,30}$/.test(id)) return NextResponse.json({ ok: true, ignorado: true });
  if (!firmaValida(req.headers, id)) return NextResponse.json({ ok: false }, { status: 401 });

  try {
    await procesarPago(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    // Un pago que Mercado Pago no conoce: aviso falso o de otra cuenta. Nada que reintentar.
    if (e instanceof ErrorMP && e.estado === 404) return NextResponse.json({ ok: true, ignorado: true });
    console.error("[mercadopago] no se pudo procesar el pago", id, e);
    // 500: Mercado Pago reintenta más tarde.
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
