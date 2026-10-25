import Link from "next/link";
import { EditorTexto } from "@/components/panel/EditorTexto";
import { temas } from "@/server/datos";
import { env } from "@/server/env";

export default async function NuevoTexto() {
  const listaTemas = await temas();
  return (
    <>
      <div className="panel-cabeza">
        <div>
          <Link href="/admin" className="enlace">← Mis textos</Link>
          <h1 style={{ marginTop: 8 }}>Texto nuevo</h1>
        </div>
      </div>
      <EditorTexto texto={null} temas={listaTemas} urlBase={env.supabaseUrl} />
    </>
  );
}
