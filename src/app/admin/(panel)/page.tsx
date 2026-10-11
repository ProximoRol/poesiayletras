import Link from "next/link";
import { CATEGORIAS } from "@/domain/textos";
import { fechaLarga } from "@/lib/contacto";
import { usuario } from "@/server/supabase";
import type { Texto } from "@/server/tipos";

export default async function MisTextos({ searchParams }: { searchParams: Promise<{ aviso?: string }> }) {
  const { aviso } = await searchParams;
  const db = await usuario();
  const [{ data }, { count: pendientes }] = await Promise.all([
    db.from("textos").select("id, slug, titulo, categoria, estado, publicado_en, actualizado_en").order("actualizado_en", { ascending: false }),
    db.from("comentarios").select("id", { count: "exact", head: true }).eq("estado", "pendiente"),
  ]);
  const textos = (data ?? []) as Texto[];

  return (
    <>
      {aviso && <p className="aviso exito" style={{ marginBottom: 18 }}>{aviso}</p>}

      <Link href="/admin/textos/nuevo" className="boton-grande">
        <span className="ic" aria-hidden>✍️</span>
        <span>
          Escribir un texto nuevo
          <small>Un poema, un cuento o lo que quieras compartir</small>
        </span>
      </Link>

      {!!pendientes && (
        <div className="aviso-pendientes">
          <span>💬 Tienes {pendientes === 1 ? "1 comentario nuevo" : `${pendientes} comentarios nuevos`} por revisar</span>
          <Link href="/admin/comentarios" className="btn btn-oscuro btn-chico">Ver comentarios</Link>
        </div>
      )}

      <h1 style={{ margin: "40px 0 14px" }}>Lo que ya escribiste</h1>
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
