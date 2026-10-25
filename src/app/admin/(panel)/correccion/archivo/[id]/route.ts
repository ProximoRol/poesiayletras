import { NextResponse, type NextRequest } from "next/server";
import { exigirAutor } from "@/server/panel/auth";
import { usuario } from "@/server/supabase";

// Descarga del texto que subió el cliente: enlace firmado de 1 minuto al depósito privado.
// Solo el autor (RLS del depósito «encargos»).

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await exigirAutor();
  const { id } = await params;
  const db = await usuario();
  const { data } = await db.from("encargos").select("archivo, archivo_nombre").eq("id", id).maybeSingle();
  if (!data?.archivo) return NextResponse.redirect(new URL("/admin/correccion", req.url));
  const { data: firmado } = await db.storage.from("encargos").createSignedUrl(data.archivo as string, 60, { download: (data.archivo_nombre as string | null) ?? true });
  if (!firmado?.signedUrl) return NextResponse.redirect(new URL("/admin/correccion", req.url));
  return NextResponse.redirect(firmado.signedUrl);
}
