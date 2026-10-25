import Link from "next/link";
import { notFound } from "next/navigation";
import { BotonConfirmar } from "@/components/panel/BotonConfirmar";
import { EditorTexto } from "@/components/panel/EditorTexto";
import { env } from "@/server/env";
import { borrarTexto } from "@/server/panel/acciones";
import { usuario } from "@/server/supabase";
import type { Texto } from "@/server/tipos";

export default async function EditarTexto({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ aviso?: string }> }) {
  const [{ id }, { aviso }] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const db = await usuario();
  const { data } = await db.from("textos").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const texto = data as Texto;

  return (
    <>
      <div className="panel-cabeza">
        <div>
          <Link href="/admin" className="enlace">← Mis textos</Link>
          <h1 style={{ marginTop: 8 }}>{texto.estado === "publicado" ? "Editar texto publicado" : "Borrador"}</h1>
        </div>
        <span className={`estado ${texto.estado}`}>{texto.estado === "publicado" ? "Publicado" : "Borrador"}</span>
      </div>
      <EditorTexto key={texto.id} texto={texto} urlBase={env.supabaseUrl} avisoInicial={aviso} />
      <form action={borrarTexto} style={{ marginTop: 40, textAlign: "right" }}>
        <input type="hidden" name="id" value={texto.id} />
        <BotonConfirmar pregunta="¿Borrar este texto para siempre? También se borran sus comentarios.">Borrar este texto</BotonConfirmar>
      </form>
    </>
  );
}
