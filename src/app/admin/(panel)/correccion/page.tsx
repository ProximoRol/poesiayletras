import Link from "next/link";
import { fechaLarga } from "@/lib/contacto";
import { cantidadTexto, ESTADOS_ENCARGO, UNIDADES } from "@/lib/correccion";
import { formatoCLP } from "@/lib/dinero";
import { marcarEntregado } from "@/server/panel/acciones";
import { usuario } from "@/server/supabase";
import type { Encargo, Servicio } from "@/server/tipos";

// Corrección literaria: los encargos pagados (descargar el texto, marcar entregado) y los
// planes que se ofrecen en la página.

export default async function CorreccionPanel({ searchParams }: { searchParams: Promise<{ ver?: string; aviso?: string }> }) {
  const { ver, aviso } = await searchParams;
  const todos = ver === "todos";
  const db = await usuario();
  let q = db.from("encargos").select("*").order("creado_en", { ascending: false }).limit(200);
  // Por defecto, lo que importa: por corregir y entregados. Los «sin pagar» son encargos que
  // alguien empezó y no pagó.
  if (!todos) q = q.in("estado", ["pagado", "entregado"]);
  const [{ data }, { data: planesData }] = await Promise.all([q, db.from("servicios").select("*").order("orden").order("creado_en")]);
  const encargos = (data ?? []) as Encargo[];
  const planes = (planesData ?? []) as Servicio[];

  return (
    <>
      <div className="panel-cabeza">
        <div>
          <h1>Corrección</h1>
          <p className="muted">Cuando te pagan una corrección, descarga el texto, corrígelo y devuélvelo por correo al cliente.</p>
        </div>
        <nav className="filtros" style={{ margin: 0 }}>
          <Link href="/admin/correccion" className="chip" aria-current={!todos ? "page" : undefined}>Pagados</Link>
          <Link href="/admin/correccion?ver=todos" className="chip" aria-current={todos ? "page" : undefined}>Todos</Link>
        </nav>
      </div>
      {aviso && <p className="aviso exito" style={{ marginBottom: 18 }}>{aviso}</p>}

      <div className="caja">
        {!encargos.length ? (
          <p className="muted centro" style={{ padding: 30 }}>Todavía no te encargan correcciones.</p>
        ) : (
          <ul className="lista-admin">
            {encargos.map((e) => (
              <li key={e.id} style={{ flexWrap: "wrap" }}>
                <div className="titulo">
                  <span style={{ fontWeight: 600 }}>#{e.numero} · {e.nombre}</span>
                  <small>
                    {fechaLarga(e.pagado_en ?? e.creado_en)} · {e.servicio}{e.unidad !== "fijo" && ` · ${cantidadTexto(e.unidad, e.cantidad)}`} · {formatoCLP(e.total)}
                  </small>
                  <small>
                    <a className="enlace" href={`mailto:${e.correo}?subject=${encodeURIComponent(`Tu corrección #${e.numero}`)}`}>{e.correo}</a> · {e.telefono}
                  </small>
                  {e.notas && <small style={{ whiteSpace: "pre-line" }}>«{e.notas}»</small>}
                </div>
                <span className={`estado ${ESTADOS_ENCARGO[e.estado].clase}`}>{ESTADOS_ENCARGO[e.estado].texto}</span>
                {e.archivo && e.estado !== "pendiente_pago" && (
                  <a href={`/admin/correccion/archivo/${e.id}`} className="btn btn-ghost btn-chico">Descargar texto</a>
                )}
                {e.estado === "pagado" && (
                  <form action={marcarEntregado}>
                    <input type="hidden" name="id" value={e.id} />
                    <button type="submit" className="btn btn-primary btn-chico">Marcar como entregado</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="panel-cabeza" style={{ margin: "40px 0 14px" }}>
        <div>
          <h2>Tus planes</h2>
          <p className="muted">Lo que ofreces en «Corrección literaria». Con precio se paga al tiro; sin precio, se consulta por WhatsApp.</p>
        </div>
        <Link href="/admin/correccion/planes/nuevo" className="btn btn-primary">+ Agregar un plan</Link>
      </div>
      <div className="caja">
        <ul className="lista-admin">
          {planes.map((pl) => (
            <li key={pl.id}>
              <div className="titulo">
                <Link href={`/admin/correccion/planes/${pl.id}`}>{pl.nombre}</Link>
                <small>{pl.precio === null ? "A convenir (WhatsApp)" : `${formatoCLP(pl.precio)} ${UNIDADES[pl.unidad].por}`}{pl.minimo > 1 && ` · mínimo ${pl.minimo}`}</small>
              </div>
              <span className={`estado ${pl.visible ? "publicado" : "borrador"}`}>{pl.visible ? "Visible" : "Oculto"}</span>
              <Link href={`/admin/correccion/planes/${pl.id}`} className="btn btn-ghost btn-chico">Editar</Link>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
