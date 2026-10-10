import Link from "next/link";
import { CATEGORIAS } from "@/domain/textos";
import { fechaLarga } from "@/lib/contacto";
import { usuario } from "@/server/supabase";
import type { Texto } from "@/server/tipos";

export default async function MisTextos({ searchParams }: { searchParams: Promise<{ aviso?: string }> }) {
  const { aviso } = await searchParams;
  const db = await usuario();
  const { data } = await db.from("textos").select("id, slug, titulo, categoria, estado, publicado_en, actualizado_en").order("actualizado_en", { ascending: false });
  const textos = (data ?? []) as Texto[];

  return (
    <>
      <div className="panel-cabeza">
        <div>
          <h1>Mis textos</h1>
          <p className="muted">Escribe, guarda como borrador y publica cuando quieras.</p>
        </div>
        <Link href="/admin/textos/nuevo" className="btn btn-primary">+ Escribir un texto nuevo</Link>
      </div>
      {aviso && <p className="aviso exito" style={{ marginBottom: 18 }}>{aviso}</p>}
      <div className="caja">
        {!textos.length ? (
          <p className="muted centro" style={{ padding: 30 }}>Todavía no hay textos. ¡Empieza con el primero!</p>
        ) : (
          <ul className="lista-admin">
            {textos.map((t) => (
              <li key={t.id}>
                <div className="titulo">
                  <Link href={`/admin/textos/${t.id}`}>{t.titulo}</Link>
                  <small>
                    {CATEGORIAS[t.categoria]} · {t.estado === "publicado" ? `publicado el ${fechaLarga(t.publicado_en)}` : `editado el ${fechaLarga(t.actualizado_en)}`}
                  </small>
                </div>
                <span className={`estado ${t.estado}`}>{t.estado === "publicado" ? "Publicado" : "Borrador"}</span>
                <Link href={`/admin/textos/${t.id}`} className="btn btn-ghost btn-chico">Editar</Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
