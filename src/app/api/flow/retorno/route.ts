import { NextResponse, type NextRequest } from "next/server";
import { env, hayPagos } from "@/server/env";
import { tokenValido } from "@/server/flow";
import { procesarPago } from "@/server/pedidos";

// Vuelta del comprador desde Flow (urlReturn). Flow la llama por POST con el token; se confirma
// el pago aquí mismo (por si el aviso aún no llega) y se lleva al comprador a su pedido.

async function volver(token: string) {
  if (!hayPagos() || !tokenValido(token)) return NextResponse.redirect(`${env.sitio}/tienda`, 303);
  try {
    const { pedidoId, estado } = await procesarPago(token);
    const extra = estado === "rechazado" ? "?pago=rechazado" : "";
    return NextResponse.redirect(`${env.sitio}/pedido/${pedidoId}${extra}`, 303);
  } catch (e) {
    console.error("[flow] no se pudo leer el pago al volver", e);
    return NextResponse.redirect(`${env.sitio}/tienda`, 303);
  }
}

export async function POST(req: NextRequest) {
  return volver(String((await req.formData().catch(() => null))?.get("token") ?? ""));
}

export async function GET(req: NextRequest) {
  return volver(req.nextUrl.searchParams.get("token") ?? "");
}
