import Link from "next/link";
import { usuario } from "@/server/supabase";
import type { Libro } from "@/server/tipos";

export default async function LibrosPanel({ searchParams }: { searchParams: Promise<{ aviso?: string }> }) {
  const { aviso } = await searchParams;
  const db = await usuario();
  const { data } = await db.from("libros").select("*").order("orden").order("creado_en", { ascending: false });
  const libros = (data ?? []) as Libro[];

  return (
    <>
      <div className="panel-cabeza">
        <div>
          <h1>Mis libros</h1>
          <p className="muted">Aparecen en la portada y en la página «Libros», con sus enlaces de compra.</p>
        </div>
        <Link href="/admin/libros/nuevo" className="btn btn-primary">+ Agregar un libro</Link>
      </div>
      {aviso && <p className="aviso exito" style={{ marginBottom: 18 }}>{aviso}</p>}
      <div className="caja">
        {!libros.length ? (
          <p className="muted centro" style={{ padding: 30 }}>Todavía no agregas tu libro.</p>
        ) : (
          <ul className="lista-admin">
            {libros.map((l) => (
              <li key={l.id}>
                <div className="titulo">
                  <Link href={`/admin/libros/${l.id}`}>{l.titulo}</Link>
                  <small>{[l.subtitulo, l.anio].filter(Boolean).join(" · ")} · {l.enlaces.length} enlace(s) de compra</small>
                </div>
                <span className={`estado ${l.visible ? "publicado" : "borrador"}`}>{l.visible ? "Visible" : "Oculto"}</span>
                <Link href={`/admin/libros/${l.id}`} className="btn btn-ghost btn-chico">Editar</Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
