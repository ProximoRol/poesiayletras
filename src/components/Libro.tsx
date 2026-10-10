import { urlImagen } from "@/server/supabase";
import type { Libro } from "@/server/tipos";

export function VitrinaLibro({ libro }: { libro: Libro }) {
  const portada = urlImagen(libro.portada);
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
