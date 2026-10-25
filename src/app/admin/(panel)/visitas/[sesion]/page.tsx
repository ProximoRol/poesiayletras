import Link from "next/link";
import { notFound } from "next/navigation";
import { formatoCLP } from "@/lib/dinero";
import { usuario } from "@/server/supabase";

// Recorrido de una visita, paso a paso (analitica_recorrido).

type Paso = {
  ocurrido_en: string;
  tipo: string;
  ruta: string | null;
  objeto: string | null;
  valor: number | null;
  referente: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_term: string | null;
  pais: string | null;
  dispositivo: string | null;
  navegador: string | null;
  datos: Record<string, unknown> | null;
};

const pesos = (v: number | null) => (v ? ` (${formatoCLP(v)})` : "");

function describir(p: Paso, titulos: Map<string, string>): string | null {
  const d = p.datos ?? {};
  const titulo = `«${titulos.get(p.objeto ?? "") ?? p.objeto}»`;
  switch (p.tipo) {
    case "page_view": return `Abrió ${p.ruta}`;
    case "text_view": return `Empezó a leer ${titulo}`;
    case "text_read": return `Llegó al final de ${titulo}`;
    case "scroll": return `Bajó ${d.pct} %`;
    case "engagement": return `Estuvo ${Math.round(Number(d.ms) / 1000)} s en ${p.ruta}`;
    case "interaction": return `Tocó: ${[d.accion, d.donde, d.red, d.plan].filter(Boolean).join(" · ")}`;
    case "comment_sent": return "Dejó un comentario";
    case "add_to_cart": return `Agregó al carro${pesos(p.valor)}`;
    case "cart_open": return "Abrió el carro";
    case "checkout_start": return `Se fue a pagar la compra${pesos(p.valor)}`;
    case "service_view": return "Abrió un plan de corrección";
    case "service_start": return `Se fue a pagar una corrección${pesos(p.valor)}`;
    case "purchase": return `✅ Pagó${pesos(p.valor)} · ${d.tipo === "encargo" ? "corrección" : "tienda"}`;
    case "js_error": return `Error en la página: ${d.mensaje}`;
    default: return null; // web_vital: detalle técnico, no se muestra
  }
}

export default async function Recorrido({ params }: { params: Promise<{ sesion: string }> }) {
  const { sesion } = await params;
  if (!/^[A-Za-z0-9]{8,40}$/.test(sesion)) notFound();
  const db = await usuario();
  const [{ data }, { data: textosData }] = await Promise.all([db.rpc("analitica_recorrido", { p_sesion: sesion }), db.from("textos").select("slug, titulo")]);
  const pasos = (data ?? []) as Paso[];
  if (!pasos.length) notFound();
  const titulos = new Map((textosData ?? []).map((t) => [t.slug as string, t.titulo as string]));
  const primero = pasos[0];
  const origen = pasos.find((p) => p.utm_source || p.referente);
  const llego = origen ? [origen.utm_source ?? origen.referente, origen.utm_medium, origen.utm_term && `«${origen.utm_term}»`].filter(Boolean).join(" · ") : "directo";

  return (
    <>
      <div className="panel-cabeza">
        <div>
          <Link href="/admin/visitas" className="enlace">← Visitas</Link>
          <h1 style={{ marginTop: 8 }}>Recorrido de una visita</h1>
          <p className="muted">
            {new Date(primero.ocurrido_en).toLocaleString("es-CL", { timeZone: "America/Santiago" })} · {primero.dispositivo ?? "?"} · {primero.navegador ?? "?"} · {primero.pais ?? "?"} · llegó desde {llego}
          </p>
        </div>
      </div>
      <div className="caja">
        <ul className="lista-admin">
          {pasos.map((p, i) => {
            const texto = describir(p, titulos);
            return texto ? (
              <li key={i}>
                <small className="muted" style={{ minWidth: 70 }}>{new Date(p.ocurrido_en).toLocaleTimeString("es-CL", { timeZone: "America/Santiago" })}</small>
                <span>{texto}</span>
              </li>
            ) : null;
          })}
        </ul>
      </div>
    </>
  );
}
