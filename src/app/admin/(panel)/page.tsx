import Link from "next/link";
import { fechaLarga } from "@/lib/contacto";
import { resumenPanel } from "@/server/panel/resumen";
import { usuario } from "@/server/supabase";
import type { Texto } from "@/server/tipos";

export default async function MisTextos({ searchParams }: { searchParams: Promise<{ aviso?: string; tema?: string }> }) {
  const { aviso, tema } = await searchParams;
  const db = await usuario();
  const [{ data }, { pendientes, semana, porEnviar }] = await Promise.all([
    db.from("textos").select("id, slug, titulo, categoria, tema:temas(nombre, formato), estado, publicado_en, actualizado_en").order("actualizado_en", { ascending: false }),
    resumenPanel(db),
  ]);
  const todos = (data ?? []) as unknown as Texto[];
  // Filtros: solo los temas que tienen algún texto, en el orden en que aparecen.
  const filtros = [...new Map(todos.map((t) => [t.categoria, t.tema?.nombre ?? t.categoria])).entries()];
  const elegido = filtros.some(([slug]) => slug === tema) ? tema : undefined;
  const textos = elegido ? todos.filter((t) => t.categoria === elegido) : todos;

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

      {porEnviar > 0 && (
        <div className="aviso-pendientes" style={{ background: "var(--exito-fondo)", color: "var(--exito)" }}>
          <span>📦 {porEnviar === 1 ? "Tienes 1 pedido pagado" : `Tienes ${porEnviar} pedidos pagados`} por enviar</span>
          <Link href="/admin/pedidos" className="btn btn-oscuro btn-chico">Ver pedidos</Link>
        </div>
      )}

      {(pendientes > 0 || semana > 0) && (
        <div className="aviso-pendientes">
          <span>
            💬{" "}
            {pendientes > 0
              ? `Tienes ${pendientes === 1 ? "1 comentario" : `${pendientes} comentarios`} por aprobar`
              : `Esta semana te ${semana === 1 ? "dejaron 1 comentario" : `dejaron ${semana} comentarios`}`}
          </span>
          <Link href="/admin/comentarios" className="btn btn-oscuro btn-chico">Ver comentarios</Link>
        </div>
      )}

      <div className="panel-cabeza" style={{ margin: "40px 0 14px" }}>
        <h1>Lo que ya escribiste</h1>
        <Link href="/admin/temas" className="btn btn-ghost btn-chico">Editar temas</Link>
      </div>
      {filtros.length > 1 && (
        <nav className="filtros" aria-label="Filtrar por tema" style={{ marginBottom: 14 }}>
          <Link href="/admin" className="chip" aria-current={!elegido ? "page" : undefined}>Todos ({todos.length})</Link>
          {filtros.map(([slug, nombre]) => (
            <Link key={slug} href={`/admin?tema=${slug}`} className="chip" aria-current={elegido === slug ? "page" : undefined}>
              {nombre} ({todos.filter((t) => t.categoria === slug).length})
            </Link>
          ))}
        </nav>
      )}
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
                    {t.tema?.nombre} · {t.estado === "publicado" ? `publicado el ${fechaLarga(t.publicado_en)}` : `editado el ${fechaLarga(t.actualizado_en)}`}
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
