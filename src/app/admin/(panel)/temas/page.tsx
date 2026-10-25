import Link from "next/link";
import { BotonConfirmar } from "@/components/panel/BotonConfirmar";
import { temas } from "@/server/datos";
import { borrarTema, crearTema, guardarTema, moverTema } from "@/server/panel/acciones";
import { usuario } from "@/server/supabase";

// Los temas de sus textos (Poesía, Cuento…): el autor los renombra, ordena, agrega y borra.
// El orden es el de los filtros de la página «Textos».

export default async function Temas({ searchParams }: { searchParams: Promise<{ aviso?: string; error?: string }> }) {
  const { aviso, error } = await searchParams;
  const db = await usuario();
  const [lista, { data }] = await Promise.all([temas(), db.from("textos").select("categoria")]);
  const cuantos = (slug: string) => (data ?? []).filter((t) => t.categoria === slug).length;

  return (
    <>
      <div className="panel-cabeza">
        <div>
          <Link href="/admin" className="enlace">← Mis textos</Link>
          <h1 style={{ marginTop: 8 }}>Mis temas</h1>
          <p className="muted">Son los filtros de tu página («Todos», «Poesía»…). Solo se muestran los temas que tienen textos publicados.</p>
        </div>
      </div>
      {aviso && <p className="aviso exito" style={{ marginBottom: 18 }}>{aviso}</p>}
      {error && <p className="aviso error" style={{ marginBottom: 18 }}>{error}</p>}

      <div className="caja">
        <ul className="lista-admin">
          {lista.map((t, i) => {
            const n = cuantos(t.slug);
            return (
              <li key={t.slug} style={{ flexWrap: "wrap" }}>
                <form action={guardarTema} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", flex: "1 1 420px" }}>
                  <input type="hidden" name="slug" value={t.slug} />
                  <input type="text" name="nombre" defaultValue={t.nombre} required maxLength={40} aria-label="Nombre del tema" style={{ flex: "1 1 160px", maxWidth: 240 }} />
                  <select name="formato" defaultValue={t.formato} aria-label="Cómo se escribe">
                    <option value="verso">En versos</option>
                    <option value="prosa">En párrafos</option>
                  </select>
                  <button type="submit" className="btn btn-ghost btn-chico">Guardar</button>
                  <small className="muted">{n === 0 ? "sin textos" : n === 1 ? "1 texto" : `${n} textos`}</small>
                </form>
                <form action={moverTema} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <input type="hidden" name="slug" value={t.slug} />
                  <button type="submit" name="hacia" value="arriba" className="btn btn-ghost btn-chico" disabled={i === 0} aria-label={`Subir ${t.nombre}`}>↑</button>
                  <button type="submit" name="hacia" value="abajo" className="btn btn-ghost btn-chico" disabled={i === lista.length - 1} aria-label={`Bajar ${t.nombre}`}>↓</button>
                  {n === 0 && (
                    <BotonConfirmar pregunta={`¿Borrar el tema «${t.nombre}»?`} accion={borrarTema}>Borrar</BotonConfirmar>
                  )}
                </form>
              </li>
            );
          })}
        </ul>
      </div>

      <h2 style={{ margin: "36px 0 12px" }}>Agregar un tema</h2>
      <form action={crearTema} className="caja form-panel">
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
          <label className="campo" style={{ flex: "1 1 220px", maxWidth: 320 }}>
            <span>Nombre</span>
            <input type="text" name="nombre" required maxLength={40} placeholder="Ej.: Crónica, Haiku, Memorias" />
          </label>
          <label className="campo" style={{ flex: "1 1 200px", maxWidth: 280 }}>
            <span>¿Cómo se escribe?</span>
            <select name="formato" defaultValue="verso">
              <option value="verso">En versos (como un poema)</option>
              <option value="prosa">En párrafos (como un cuento)</option>
            </select>
          </label>
          <button type="submit" className="btn btn-primary">Agregar</button>
        </div>
        <p className="ayuda">Un tema con textos no se puede borrar: primero cambia esos textos de tema.</p>
      </form>
    </>
  );
}
