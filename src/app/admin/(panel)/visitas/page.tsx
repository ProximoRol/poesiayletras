import Link from "next/link";
import { canalDe, contarPorSesion, embudo, NOMBRE_GRUPO, porCanal, reboto, resumenSesiones, type Sesion } from "@/domain/analitica";
import { formatoCLP } from "@/lib/dinero";
import { usuario } from "@/server/supabase";

// Visitas de la página: cuántas, de dónde llegan, qué leen y si terminan comprando. Todo sale de
// la medición propia (eventos → analitica_sesiones); las visitas de la familia no se cuentan.

const RANGOS = { hoy: "Hoy", "7d": "7 días", "30d": "30 días", "90d": "90 días" } as const;
type Rango = keyof typeof RANGOS;
const DIAS: Record<Rango, number> = { hoy: 0, "7d": 6, "30d": 29, "90d": 89 };

const pct = (x: number) => `${Math.round(x * 100)} %`;
function duracion(ms: number) {
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min${s % 60 ? ` ${s % 60} s` : ""}`;
}
const hora = (iso: string) => new Date(iso).toLocaleString("es-CL", { timeZone: "America/Santiago", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/** Medianoche de Chile de hace `dias` días, como instante UTC. */
function desdeChile(dias: number, ahora = new Date()): Date {
  const enChile = new Date(ahora.toLocaleString("en-US", { timeZone: "America/Santiago" }));
  const desfase = ahora.getTime() - enChile.getTime();
  return new Date(new Date(enChile.getFullYear(), enChile.getMonth(), enChile.getDate() - dias).getTime() + desfase);
}

function Lista({ titulo, filas }: { titulo: string; filas: [string, number][] }) {
  return (
    <>
      <h3 style={{ margin: "0 0 8px" }}>{titulo}</h3>
      {filas.length ? (
        filas.map(([k, n]) => (
          <p key={k} style={{ display: "flex", justifyContent: "space-between", gap: 10, margin: "4px 0" }}>
            <span>{k}</span>
            <b>{n}</b>
          </p>
        ))
      ) : (
        <p className="muted">—</p>
      )}
    </>
  );
}

export default async function Visitas({ searchParams }: { searchParams: Promise<{ rango?: string }> }) {
  const { rango: r } = await searchParams;
  const rango: Rango = r && r in RANGOS ? (r as Rango) : "30d";
  const ahora = new Date();

  const db = await usuario();
  const [{ data, error }, { data: textosData }] = await Promise.all([
    db.rpc("analitica_sesiones", { desde: desdeChile(DIAS[rango], ahora).toISOString(), hasta: new Date(ahora.getTime() + 60_000).toISOString() }),
    db.from("textos").select("slug, titulo"),
  ]);
  const sesiones = (error ? [] : (data ?? [])) as Sesion[];
  const titulos = new Map((textosData ?? []).map((t) => [t.slug as string, t.titulo as string]));
  const r0 = resumenSesiones(sesiones);
  const pasos = embudo(sesiones);
  const canales = porCanal(sesiones);
  const leidos = contarPorSesion(sesiones, (s) => s.textos);
  const enteros = new Map(contarPorSesion(sesiones, (s) => s.textos_enteros));
  const palabras = contarPorSesion(sesiones, (s) => [s.palabra_clave]).slice(0, 10);

  return (
    <>
      <div className="panel-cabeza">
        <div>
          <h1>Visitas</h1>
          <p className="muted">Quién entra a tu página, de dónde llega, qué lee y si termina comprando. Tus visitas y las de la familia no se cuentan.</p>
        </div>
        <nav className="filtros" style={{ margin: 0 }}>
          {(Object.keys(RANGOS) as Rango[]).map((k) => (
            <Link key={k} href={`/admin/visitas?rango=${k}`} className="chip" aria-current={k === rango ? "page" : undefined}>
              {RANGOS[k]}
            </Link>
          ))}
        </nav>
      </div>
      {error && <p className="aviso error" style={{ marginBottom: 18 }}>No se pudieron leer las visitas. Si es la primera vez, falta correr la migración 0007.</p>}

      <div className="kpis">
        <div className="kpi"><b>{r0.sesiones}</b><span>visitas</span></div>
        <div className="kpi"><b>{r0.personas}</b><span>personas distintas</span></div>
        <div className="kpi"><b>{sesiones.length ? pct(r0.rebote) : "—"}</b><span>se fueron enseguida (rebote)</span></div>
        <div className="kpi"><b>{r0.tiempoMediano ? duracion(r0.tiempoMediano) : "—"}</b><span>tiempo típico de quienes se quedan</span></div>
        <div className="kpi"><b>{r0.paginasPorSesion ? r0.paginasPorSesion.toFixed(1) : "—"}</b><span>páginas por visita</span></div>
        <div className="kpi"><b>{r0.comentaron}</b><span>visitas que comentaron</span></div>
        <div className="kpi"><b>{r0.whatsapp}</b><span>te escribieron por WhatsApp</span></div>
        <div className="kpi"><b>{r0.compras}</b><span>ventas · {formatoCLP(r0.ingresos)}</span></div>
      </div>

      <h2 style={{ margin: "0 0 10px" }}>Del primer clic a la compra</h2>
      <div className="caja" style={{ marginBottom: 28 }}>
        {pasos.map((p) => (
          <div key={p.clave} className="paso-embudo">
            <span>{p.nombre}</span>
            <span className="barra"><i style={{ width: `${Math.round(p.delTotal * 100)}%` }} /></span>
            <span className="muted" style={{ fontSize: ".9rem", whiteSpace: "nowrap" }}>
              <b style={{ color: "var(--tinta)" }}>{p.n}</b> · {pct(p.delTotal)}
              {p.clave !== "entraron" && ` · ${pct(p.delPrevio)} del paso anterior`}
            </span>
          </div>
        ))}
        <p className="muted" style={{ fontSize: ".85rem", marginTop: 8 }}>
          Una visita cuenta en cada paso que hizo, aunque se haya saltado alguno. Rebote = una sola página, menos de 10 segundos y sin tocar nada.
        </p>
      </div>

      <h2 style={{ margin: "0 0 10px" }}>De dónde llegan</h2>
      <div className="caja desplazable" style={{ marginBottom: 28 }}>
        {!canales.length ? (
          <p className="muted">Todavía no hay visitas en este periodo.</p>
        ) : (
          <table className="tabla-visitas">
            <thead>
              <tr>
                <th>Canal</th>
                <th className="num">Visitas</th>
                <th className="num">Rebote</th>
                <th className="num">Tiempo típico</th>
                <th className="num">Abrieron un texto</th>
                <th className="num">WhatsApp</th>
                <th className="num">Ventas</th>
              </tr>
            </thead>
            <tbody>
              {canales.map((c) => (
                <tr key={c.grupo}>
                  <td>
                    <b>{NOMBRE_GRUPO[c.grupo]}</b>
                    <br />
                    <small className="muted">{c.fuentes.slice(0, 4).map(([f, n]) => `${f} (${n})`).join(" · ")}</small>
                  </td>
                  <td className="num">{c.sesiones}</td>
                  <td className="num">{pct(c.rebote)}</td>
                  <td className="num">{c.tiempoMediano ? duracion(c.tiempoMediano) : "—"}</td>
                  <td className="num">{c.leyeron}</td>
                  <td className="num">{c.whatsapp}</td>
                  <td className="num">{c.compras ? `${c.compras} · ${formatoCLP(c.ingresos)}` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {palabras.length > 0 && (
          <p className="muted" style={{ fontSize: ".88rem", marginTop: 10 }}>Palabras de los anuncios: {palabras.map(([p, n]) => `«${p}» (${n})`).join(" · ")}</p>
        )}
      </div>

      <h2 style={{ margin: "0 0 10px" }}>Qué leen</h2>
      <div className="caja desplazable" style={{ marginBottom: 28 }}>
        {!leidos.length ? (
          <p className="muted">Nadie abrió un texto en este periodo.</p>
        ) : (
          <table className="tabla-visitas">
            <thead>
              <tr>
                <th>Texto</th>
                <th className="num">Lo abrieron</th>
                <th className="num">Llegaron al final</th>
              </tr>
            </thead>
            <tbody>
              {leidos.map(([slug, n]) => (
                <tr key={slug}>
                  <td><a className="enlace" href={`/textos/${slug}`} target="_blank" rel="noopener">{titulos.get(slug) ?? slug}</a></td>
                  <td className="num">{n}</td>
                  <td className="num">{enteros.get(slug) ?? 0} · {pct((enteros.get(slug) ?? 0) / n)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="dos-col" style={{ marginBottom: 28, alignItems: "start" }}>
        <div className="caja"><Lista titulo="Por dónde entran" filas={contarPorSesion(sesiones, (s) => [s.entrada]).slice(0, 10)} /></div>
        <div className="caja"><Lista titulo="Qué tocan" filas={contarPorSesion(sesiones, (s) => s.acciones).slice(0, 12)} /></div>
        <div className="caja"><Lista titulo="Dispositivo" filas={contarPorSesion(sesiones, (s) => [s.dispositivo])} /></div>
        <div className="caja"><Lista titulo="País" filas={contarPorSesion(sesiones, (s) => [s.pais]).slice(0, 8)} /></div>
      </div>

      <h2 style={{ margin: "0 0 10px" }}>Últimas visitas</h2>
      <div className="caja desplazable">
        {!sesiones.length ? (
          <p className="muted">Todavía no hay visitas.</p>
        ) : (
          <table className="tabla-visitas">
            <thead>
              <tr>
                <th>Cuándo</th>
                <th>De dónde</th>
                <th>Entró por</th>
                <th className="num">Páginas</th>
                <th className="num">Tiempo</th>
                <th>Qué hizo</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sesiones.slice(0, 80).map((s) => {
                const hizo = [s.leyo && `leyó ${s.textos.length}`, s.comento && "comentó", s.whatsapp && "WhatsApp", s.quiso && "quiso comprar", s.fue_a_pagar && "fue a pagar", s.compra && "compró"]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <tr key={s.sesion_id}>
                    <td style={{ whiteSpace: "nowrap" }}>{hora(s.inicio)}</td>
                    <td>
                      {canalDe(s).fuente}
                      {s.campana ? <small className="muted"> · {s.campana}</small> : null}
                    </td>
                    <td>{s.entrada}</td>
                    <td className="num">{s.paginas}</td>
                    <td className="num">{s.ms ? duracion(s.ms) : "—"}</td>
                    <td>{hizo || <span className="muted">{reboto(s) ? "se fue enseguida" : "miró"}</span>}</td>
                    <td><Link href={`/admin/visitas/${s.sesion_id}`} className="enlace">Ver</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
