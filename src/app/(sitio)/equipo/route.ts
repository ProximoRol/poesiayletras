import { NextResponse, type NextRequest } from "next/server";
import { CLAVE_ENLACE_EQUIPO, COOKIE_EQUIPO } from "@/domain/analitica";

// /equipo?clave=… marca este navegador como de la familia: sus visitas no se miden. La cookie la
// pone el servidor (Safari acorta a 7 días las que crea JavaScript). Clave equivocada: a la portada.

export function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("clave") !== CLAVE_ENLACE_EQUIPO) return NextResponse.redirect(new URL("/", req.url), 302);
  const res = new NextResponse(
    `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Listo</title></head>
<body style="font-family:Georgia,serif;max-width:520px;margin:60px auto;padding:0 20px;color:#2e2620;background:#faf6ef;line-height:1.6">
<h1 style="font-weight:normal">Listo ✓</h1><p>Las visitas desde este navegador ya no se cuentan en las estadísticas de la página.</p><p><a href="/" style="color:#b8622f">Ir a la página</a></p></body></html>`,
    { headers: { "content-type": "text/html; charset=utf-8", "x-robots-tag": "noindex" } },
  );
  res.cookies.set(COOKIE_EQUIPO, "1", { maxAge: 60 * 60 * 24 * 365, path: "/", sameSite: "lax", secure: req.nextUrl.protocol === "https:" });
  return res;
}
