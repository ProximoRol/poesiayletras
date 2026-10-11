import { enlaceWhatsApp } from "@/lib/contacto";
import { urlImagen } from "@/server/supabase";
import type { Libro } from "@/server/tipos";

export function VitrinaLibro({ libro, whatsapp, autor }: { libro: Libro; whatsapp: string | null; autor: string }) {
  const portada = urlImagen(libro.portada);
  // Sin enlaces de compra (el libro no se vende por internet), se pide directo al autor.
  const pedir = libro.enlaces.length ? null : enlaceWhatsApp(whatsapp, `¡Hola ${autor}! Quiero un ejemplar de «${libro.titulo}».`);
  return (
    <article className="libro">
      {portada ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="tapa" src={portada} alt={`Portada de ${libro.titulo}`} />
      ) : (
        <div className="tapa ph" aria-hidden>{libro.titulo}</div>
      )}
      <div>
        <span className="eyebrow">{libro.anio ? `Libro · ${libro.anio}` : "Libro"}</span>
        <h3>{libro.titulo}</h3>
        {libro.subtitulo && <p className="subt">{libro.subtitulo}</p>}
        {libro.sinopsis && <p className="sinopsis">{libro.sinopsis}</p>}
        {pedir && (
          <div className="acciones">
            <a href={pedir} target="_blank" rel="noopener noreferrer" className="btn btn-wa">Pídelo por WhatsApp</a>
          </div>
        )}
        {libro.enlaces.length > 0 && (
          <div className="acciones">
            {libro.enlaces.map((e, i) => (
              <a key={e.url} href={e.url} target="_blank" rel="noopener noreferrer" className={`btn ${i === 0 ? "btn-primary" : "btn-ghost"}`}>
                Comprar en {e.tienda}
              </a>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
