import { COOKIE_EQUIPO } from "@/domain/analitica";
import { esBot, leerEvento, registrarEventos } from "@/server/analitica";

// Recibe eventos del navegador (sendBeacon), en lote {eventos: [...]}. Responde siempre 204: el
// rastreo nunca debe dar errores visibles. Los bots y los navegadores de la familia no se cuentan.

export async function POST(req: Request) {
  const ua = req.headers.get("user-agent") ?? "";
  if (esBot(ua)) return new Response(null, { status: 204 });
  if (new RegExp(`(?:^|; )${COOKIE_EQUIPO}=1(?:;|$)`).test(req.headers.get("cookie") ?? "")) return new Response(null, { status: 204 });

  let cuerpo: unknown;
  try {
    cuerpo = await req.json();
  } catch {
    return new Response(null, { status: 204 });
  }
  const lista = cuerpo && typeof cuerpo === "object" && Array.isArray((cuerpo as { eventos?: unknown }).eventos) ? (cuerpo as { eventos: unknown[] }).eventos.slice(0, 50) : [];
  try {
    await registrarEventos(lista.map(leerEvento).filter((e) => e !== null), { ua, pais: req.headers.get("x-vercel-ip-country") });
  } catch (err) {
    console.error("[track] eventos descartados:", err instanceof Error ? err.message : err);
  }
  return new Response(null, { status: 204 });
}
