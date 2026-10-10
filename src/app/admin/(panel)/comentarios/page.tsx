import Link from "next/link";
import { BotonConfirmar } from "@/components/panel/BotonConfirmar";
import { fechaLarga } from "@/lib/contacto";
import { aprobarComentario, borrarComentario, responderComentario } from "@/server/panel/acciones";
import { usuario } from "@/server/supabase";
import type { Comentario } from "@/server/tipos";

type ConTexto = Comentario & { textos: { titulo: string; slug: string } | null };

export default async function Comentarios({ searchParams }: { searchParams: Promise<{ ver?: string }> }) {
  const { ver } = await searchParams;
  const todos = ver === "todos";
  const db = await usuario();
  let q = db.from("comentarios").select("*, textos(titulo, slug)").order("creado_en", { ascending: false }).limit(200);
  if (!todos) q = q.eq("estado", "pendiente");
  const { data } = await q;
  const comentarios = (data ?? []) as ConTexto[];

  return (
    <>
      <div className="panel-cabeza">
        <div>
          <h1>Comentarios</h1>
          <p className="muted">Nada se publica sin que lo apruebes. Si respondes, el comentario se publica con tu respuesta.</p>
        </div>
        <nav className="filtros" style={{ margin: 0 }}>
          <Link href="/admin/comentarios" className="chip" aria-current={!todos ? "page" : undefined}>Por revisar</Link>
          <Link href="/admin/comentarios?ver=todos" className="chip" aria-current={todos ? "page" : undefined}>Todos</Link>
        </nav>
      </div>

      {!comentarios.length && (
        <div className="caja"><p className="muted centro" style={{ padding: 30 }}>{todos ? "Todavía no hay comentarios." : "No hay comentarios por revisar. ¡Al día!"}</p></div>
      )}

      {comentarios.map((c) => (
        <div key={c.id} className="caja">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <b>{c.nombre}</b> <span className="muted" style={{ fontSize: ".85rem" }}>· {fechaLarga(c.creado_en)} · en </span>
              {c.textos && <a className="enlace" href={`/textos/${c.textos.slug}#comentarios`} target="_blank" rel="noopener">{c.textos.titulo}</a>}
            </div>
            <span className={`estado ${c.estado === "aprobado" ? "publicado" : "pendiente"}`}>{c.estado === "aprobado" ? "Publicado" : "Por revisar"}</span>
          </div>
          <p style={{ whiteSpace: "pre-line", margin: "12px 0 16px" }}>{c.cuerpo}</p>

          <form action={responderComentario} className="form-panel" style={{ gap: 10 }}>
            <input type="hidden" name="id" value={c.id} />
            <label className="campo">
              <span>Tu respuesta <small>· opcional</small></span>
              <textarea name="respuesta" rows={2} defaultValue={c.respuesta ?? ""} maxLength={3000} style={{ minHeight: 70 }} />
            </label>
            <div className="acciones" style={{ alignItems: "center" }}>
              {c.estado === "pendiente" && (
                <button type="submit" formAction={aprobarComentario} className="btn btn-primary btn-chico">Aprobar</button>
              )}
              <button type="submit" className="btn btn-ghost btn-chico">{c.respuesta ? "Guardar respuesta" : "Responder y publicar"}</button>
              <BotonConfirmar pregunta="¿Borrar este comentario?" accion={borrarComentario}>Borrar</BotonConfirmar>
            </div>
          </form>
        </div>
      ))}
    </>
  );
}
