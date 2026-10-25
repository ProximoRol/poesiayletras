import type { Metadata } from "next";
import Link from "next/link";
import { enlaceWhatsApp } from "@/lib/contacto";
import { UNIDADES } from "@/lib/correccion";
import { formatoCLP } from "@/lib/dinero";
import { perfil, serviciosVisibles } from "@/server/datos";
import { hayPagos } from "@/server/env";

export const revalidate = 300;
export const metadata: Metadata = {
  title: "Corrección literaria",
  description: "Corrección de cuentos y poemas: ortografía, gramática, ritmo y estilo, respetando siempre tu voz como autor.",
};

const CUIDADOS = [
  ["✏️", "Ortografía y gramática", "Corrección precisa de errores ortográficos y gramaticales que restan credibilidad a tu texto."],
  ["❯", "Puntuación y mayúsculas", "Uso adecuado de comas, puntos y mayúsculas para que el lector siga tu intención sin tropezar."],
  ["💧", "Fluidez y claridad", "Ajusto la redacción para que las ideas fluyan claras, sin perder profundidad."],
  ["✂️", "Repeticiones y redundancias", "Elimino lo que sobra para que cada palabra tenga peso y nada suene repetido."],
  ["🎵", "Ritmo y musicalidad", "Cuido el compás y la sonoridad, especialmente en poesía, donde el ritmo es parte del sentido."],
  ["🎨", "Sugerencias de estilo", "Propongo mejoras de estilo respetando siempre tu voz como autor. Tú tienes la última palabra."],
];

export default async function Correccion() {
  const [p, planes] = await Promise.all([perfil(), serviciosVisibles()]);
  const pagos = hayPagos();
  const wa = enlaceWhatsApp(p.whatsapp, `¡Hola ${p.nombre.split(" ")[0]}! Me interesa tu servicio de corrección literaria. Quisiera contarte sobre mi texto.`);

  return (
    <>
      <div className="cabecera-pagina">
        <div className="wrap">
          <span className="eyebrow">Corrección literaria · Cuentos y poemas</span>
          <h1 className="titulo-pagina">¿Escribes? <em>Te ayudo a que tu obra brille</em> sin perder tu esencia.</h1>
          <p>Cuido tu ortografía, tu ritmo y tu redacción con mano de poeta. Corrijo lo que distrae y conservo intacta tu voz.</p>
        </div>
      </div>

      <section className="fondo-suave">
        <div className="wrap">
          <div className="sec-head center">
            <span className="eyebrow">Qué trabajo en tu texto</span>
            <h2>Seis cuidados para que tu obra respire</h2>
          </div>
          <div className="feature-grid">
            {CUIDADOS.map(([ic, titulo, texto]) => (
              <div key={titulo} className="feature">
                <div className="ic" aria-hidden>{ic}</div>
                <h3>{titulo}</h3>
                <p>{texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="wrap">
          <div className="sec-head center">
            <span className="eyebrow">Antes y después</span>
            <h2>El mismo verso, sin el ruido</h2>
            <p>Corregir no es reescribir. Mira cómo cambia un fragmento cuando se limpia sin tocar su alma.</p>
          </div>
          <div className="ba">
            <div className="ba-card ba-antes">
              <span className="lbl">Antes</span>
              <p className="verse">
                «<span className="err">Aveces</span> el silencio grita mas fuerte,<br />y <span className="err">aya</span> donde nadie escucha,<br />mi corazon <span className="err">todavia</span> late <span className="err">,</span>esperando.»
              </p>
              <p className="ba-note">Errores: «a veces» junto, falta la tilde en «más», «allá» mal escrita, «corazón» y «todavía» sin tilde, coma mal ubicada.</p>
            </div>
            <div className="ba-card ba-despues">
              <span className="lbl">Después</span>
              <p className="verse">
                «<span className="fix">A veces</span> el silencio grita <span className="fix">más</span> fuerte,<br />y <span className="fix">allá</span> donde nadie escucha,<br />mi <span className="fix">corazón todavía</span> late, esperando.»
              </p>
              <p className="ba-note">La imagen y la voz del autor se mantienen intactas: solo desaparece lo que distraía al lector.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="fondo-suave" id="servicios">
        <div className="wrap">
          <div className="sec-head center">
            <span className="eyebrow">Servicios</span>
            <h2>Elige cómo quieres que cuide tu obra</h2>
            <p>Elige el plan, sube tu texto y paga en línea. Si tienes dudas, escríbeme antes.</p>
          </div>
          <div className="plans">
            {planes.map((pl) => {
              const consulta = enlaceWhatsApp(p.whatsapp, `¡Hola ${p.nombre.split(" ")[0]}! Me interesa la corrección «${pl.nombre}». Te cuento sobre mi texto:`);
              const clase = `btn ${pl.destacado ? "btn-primary" : "btn-ghost"}`;
              return (
                <div key={pl.id} className={`plan${pl.destacado ? " destacado" : ""}`}>
                  {pl.destacado && <span className="badge">Más elegido</span>}
                  <h3>{pl.nombre}</h3>
                  <p className="desc">{pl.descripcion}</p>
                  {pl.precio !== null ? (
                    <div className="price">{formatoCLP(pl.precio)} <small>{UNIDADES[pl.unidad].por}</small></div>
                  ) : (
                    <div className="price" style={{ fontSize: "2rem" }}>A convenir</div>
                  )}
                  {pl.nota && <div className="price-note">{pl.nota}</div>}
                  <ul>
                    {pl.incluye.map((i) => <li key={i}>{i}</li>)}
                  </ul>
                  {pl.precio !== null && pagos ? (
                    <Link href={`/correccion/contratar/${pl.id}`} className={clase} data-track="contratar" data-track-plan={pl.nombre}>Contratar y pagar</Link>
                  ) : consulta ? (
                    <a href={consulta} target="_blank" rel="noopener noreferrer" className={clase} data-track="whatsapp" data-track-donde="correccion_plan" data-track-plan={pl.nombre}>Consultar por WhatsApp</a>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section>
        <div className="wrap">
          <div className="cta">
            <h2>Tu obra ya tiene alma. Démosle claridad.</h2>
            <p>Envíame tu poema o cuento y recibe una muestra de corrección de las primeras líneas, sin compromiso.</p>
            {wa && (
              <div className="acciones">
                <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-wa" data-track="whatsapp" data-track-donde="correccion">Escríbeme por WhatsApp</a>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
