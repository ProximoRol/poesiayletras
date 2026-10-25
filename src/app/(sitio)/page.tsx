import Link from "next/link";
import { VitrinaLibro } from "@/components/Libro";
import { GrillaTextos } from "@/components/TarjetaTexto";
import { librosVisibles, perfil, productosVisibles, temasConTextos, textosPublicados } from "@/server/datos";
import { urlImagen } from "@/server/supabase";

export const revalidate = 300;

export default async function Portada() {
  const [p, textos, libros, productos, conTextos] = await Promise.all([perfil(), textosPublicados({ limite: 6 }), librosVisibles(), productosVisibles(), temasConTextos()]);
  const foto = urlImagen(p.foto);
  const [nombre, ...apellidos] = p.nombre.split(" ");
  const verso = textos.find((t) => t.tema?.formato === "verso")?.extracto.split("\n")[0];

  return (
    <>
      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <span className="eyebrow">{conTextos.map((t) => t.nombre).join(" · ") || "Poesía"}</span>
            <h1>
              {nombre} <em>{apellidos.join(" ")}</em>
            </h1>
            <p className="lead">{p.presentacion || p.frase}</p>
            <div className="acciones">
              <Link href="/textos" className="btn btn-primary" data-track="portada_leer">Leer mis textos</Link>
              {libros.length > 0 && <Link href="/libros" className="btn btn-ghost" data-track="portada_libro">Conoce mi libro</Link>}
            </div>
          </div>
          <div className="retrato">
            {foto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={foto} alt={p.nombre} />
            ) : (
              <div className="foto-ph" aria-hidden>{nombre.charAt(0)}</div>
            )}
            {verso && <div className="cita">«{verso.replace(/[…,;:.\s]+$/, "")}»</div>}
          </div>
        </div>
      </section>

      <section className="fondo-suave">
        <div className="wrap">
          <div className="sec-head center">
            <span className="eyebrow">Lo último que escribí</span>
            <h2>Textos recientes</h2>
            <p>Léelos con calma. Al final de cada uno puedes dejarme tu comentario.</p>
          </div>
          <GrillaTextos textos={textos} vacio="Muy pronto, los primeros textos." />
          {textos.length > 0 && (
            <div className="sec-pie">
              <Link href="/textos" className="btn btn-ghost">Ver todos los textos</Link>
            </div>
          )}
        </div>
      </section>

      {libros.length > 0 && (
        <section>
          <div className="wrap">
            <div className="sec-head center">
              <span className="eyebrow">{libros.length > 1 ? "Mis libros" : "Mi libro"}</span>
              <h2>Para tenerlo en las manos</h2>
            </div>
            <VitrinaLibro libro={libros[0]} producto={productos.find((x) => x.libro_id === libros[0].id)} whatsapp={p.whatsapp} autor={nombre} />
            {libros.length > 1 && (
              <div className="sec-pie">
                <Link href="/libros" className="btn btn-ghost">Ver todos mis libros</Link>
              </div>
            )}
          </div>
        </section>
      )}

      <section>
        <div className="wrap">
          <div className="cta">
            <h2>¿También escribes?</h2>
            <p>Corrijo cuentos y poemas cuidando tu ortografía, tu ritmo y tu estilo, sin borrar tu voz.</p>
            <div className="acciones">
              <Link href="/correccion" className="btn btn-crema">Ver corrección literaria</Link>
              <Link href="/sobre-mi" className="btn btn-ghost" style={{ color: "#fff", borderColor: "rgba(255,255,255,.35)" }}>Quién soy</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
