import Link from "next/link";
import { BotonConfirmar } from "@/components/panel/BotonConfirmar";
import { fechaLarga } from "@/lib/contacto";
import { aprobarComentario, borrarComentario, responderComentario } from "@/server/panel/acciones";
import { resumenPanel, SEMANA_MS } from "@/server/panel/resumen";
import { usuario } from "@/server/supabase";
import type { Comentario } from "@/server/tipos";

type ConTexto = Comentario & { textos: { titulo: string; slug: string } | null };

export default async function Comentarios({ searchParams }: { searchParams: Promise<{ ver?: string }> }) {
  const { ver } = await searchParams;
  const db = await usuario();
  const { pendientes } = await resumenPanel(db);
  const soloPendientes = ver === "pendientes" && pendientes > 0;

  let q = db.from("comentarios").select("*, textos(titulo, slug)").order("creado_en", { ascending: false }).limit(200);
  if (soloPendientes) q = q.eq("estado", "pendiente");
  const { data } = await q;
  const comentarios = (data ?? []) as ConTexto[];
  // eslint-disable-next-line react-hooks/purity -- página dinámica: la hora es la de cada visita
  const haceUnaSemana = Date.now() - SEMANA_MS;

  return (
    <>
      <div className="panel-cabeza">
        <div>
          <h1>Comentarios</h1>
          <p className="muted">Lo que tus lectores te escriben. Puedes responderles o borrar los que no te gusten.</p>
        </div>
        {pendientes > 0 && (
          <nav className="filtros" style={{ margin: 0 }}>
            <Link href="/admin/comentarios" className="chip" aria-current={!soloPendientes ? "page" : undefined}>Todos</Link>
            <Link href="/admin/comentarios?ver=pendientes" className="chip" aria-current={soloPendientes ? "page" : undefined}>Por aprobar ({pendientes})</Link>
          </nav>
        )}
      </div>

      {!comentarios.length && (
        <div className="caja"><p className="muted centro" style={{ padding: 30 }}>Todavía no hay comentarios.</p></div>
      )}

      {comentarios.map((c) => {
        const nuevo = new Date(c.creado_en).getTime() > haceUnaSemana;
        return (
          <div key={c.id} className="caja">
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <b>{c.nombre}</b> <span className="muted" style={{ fontSize: ".9rem" }}>· {fechaLarga(c.creado_en)} · en </span>
                {c.textos && <a className="enlace" href={`/textos/${c.textos.slug}#comentarios`} target="_blank" rel="noopener">{c.textos.titulo}</a>}
              </div>
              {c.estado === "pendiente" ? (
                <span className="estado pendiente">Por aprobar</span>
              ) : (
                nuevo && <span className="estado publicado">Nuevo</span>
              )}
            </div>
            <p style={{ whiteSpace: "pre-line", margin: "12px 0 16px", fontSize: "1.05rem" }}>{c.cuerpo}</p>

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
                <button type="submit" className="btn btn-ghost btn-chico">{c.respuesta ? "Guardar respuesta" : "Responder"}</button>
                <BotonConfirmar pregunta="¿Borrar este comentario? Ya no se verá en tu página." accion={borrarComentario}>Borrar</BotonConfirmar>
              </div>
            </form>
          </div>
        );
      })}
    </>
  );
}
