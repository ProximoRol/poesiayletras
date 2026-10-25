import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { usuario } from "@/server/supabase";

// Destino de los enlaces de correo de Supabase (invitación y recuperación de contraseña).
// Acepta ?code=… (flujo PKCE) o ?token_hash=…&type=… (plantillas con token).
// Abre la sesión y manda a /admin/clave para elegir la contraseña.

const TIPOS: EmailOtpType[] = ["invite", "recovery", "signup", "magiclink", "email", "email_change"];

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const destino = new URL("/admin/clave", url.origin);
  const fallo = new URL("/admin/login?error=enlace", url.origin);
  const db = await usuario();

  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const tipo = url.searchParams.get("type") as EmailOtpType | null;

  if (code) {
    const { error } = await db.auth.exchangeCodeForSession(code);
    return NextResponse.redirect(error ? fallo : destino);
  }
  if (tokenHash && tipo && TIPOS.includes(tipo)) {
    const { error } = await db.auth.verifyOtp({ token_hash: tokenHash, type: tipo });
    return NextResponse.redirect(error ? fallo : destino);
  }
  return NextResponse.redirect(fallo);
}
