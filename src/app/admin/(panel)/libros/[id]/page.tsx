import Link from "next/link";
import { notFound } from "next/navigation";
import { BotonConfirmar } from "@/components/panel/BotonConfirmar";
import { FormLibro } from "@/components/panel/FormLibro";
import { env } from "@/server/env";
import { borrarLibro } from "@/server/panel/acciones";
import { usuario } from "@/server/supabase";
import type { Libro } from "@/server/tipos";

export default async function EditarLibro({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let libro: Libro | null = null;
  if (id !== "nuevo") {
    if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
    const db = await usuario();
    const { data } = await db.from("libros").select("*").eq("id", id).maybeSingle();
    if (!data) notFound();
    libro = data as Libro;
  }

  return (
    <>
      <div className="panel-cabeza">
        <div>
          <Link href="/admin/libros" className="enlace">← Mis libros</Link>
          <h1 style={{ marginTop: 8 }}>{libro ? libro.titulo : "Libro nuevo"}</h1>
        </div>
      </div>
      <FormLibro key={libro?.id ?? "nuevo"} libro={libro} urlBase={env.supabaseUrl} />
      {libro && (
        <form action={borrarLibro} style={{ marginTop: 40, textAlign: "right" }}>
          <input type="hidden" name="id" value={libro.id} />
          <BotonConfirmar pregunta="¿Borrar este libro de tu página?">Borrar este libro</BotonConfirmar>
        </form>
      )}
    </>
  );
}
