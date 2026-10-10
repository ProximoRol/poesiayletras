import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Solo el panel: refresca la sesión de Supabase y manda a /admin/login si no hay usuario.
// La autorización real (¿es el autor?) se vuelve a comprobar en cada página y acción del
// panel: el proxy es la primera barrera, no la única.

export async function proxy(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return NextResponse.next(); // sin base, el login explica cómo configurarla

  let res = NextResponse.next({ request: req });
  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (lista) => {
        for (const { name, value } of lista) req.cookies.set(name, value);
        res = NextResponse.next({ request: req });
        for (const { name, value, options } of lista) res.cookies.set(name, value, options);
      },
    },
  });
  const { data } = await supabase.auth.getUser();

  const publica = req.nextUrl.pathname === "/admin/login" || req.nextUrl.pathname.startsWith("/admin/auth/");
  if (!data.user && !publica) {
    const destino = req.nextUrl.clone();
    destino.pathname = "/admin/login";
    destino.search = "";
    return NextResponse.redirect(destino);
  }
  return res;
}

export const config = { matcher: ["/admin/:path*"] };
