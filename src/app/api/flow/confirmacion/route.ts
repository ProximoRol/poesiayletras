import { NextResponse, type NextRequest } from "next/server";
import { hayPagos } from "@/server/env";
import { ErrorFlow, tokenValido } from "@/server/flow";
import { procesarPago } from "@/server/pedidos";

// Aviso (urlConfirmation) de Flow: llega por POST con el token de la orden. Solo se usa el
// token: el estado real se vuelve a leer a Flow con nuestra clave.

export async function POST(req: NextRequest) {
  if (!hayPagos()) return NextResponse.json({ ok: false }, { status: 503 });
  const token = String((await req.formData().catch(() => null))?.get("token") ?? "");
  if (!tokenValido(token)) return NextResponse.json({ ok: true, ignorado: true });

  try {
    await procesarPago(token);
    return NextResponse.json({ ok: true });
  } catch (e) {
    // Un token que Flow no conoce: aviso falso o de otra cuenta. Nada que reintentar.
    if (e instanceof ErrorFlow && (e.estado === 400 || e.estado === 401)) return NextResponse.json({ ok: true, ignorado: true });
    console.error("[flow] no se pudo procesar el pago", e);
    // 500: Flow reintenta más tarde.
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
