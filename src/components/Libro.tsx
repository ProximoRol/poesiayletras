import { enlaceWhatsApp } from "@/lib/contacto";
import { formatoCLP } from "@/lib/dinero";
import { BotonAgregar } from "./Carrito";
import { urlImagen } from "@/server/supabase";
import type { Libro, Producto } from "@/server/tipos";

export function VitrinaLibro({ libro, producto, whatsapp, autor }: { libro: Libro; producto?: Producto; whatsapp: string | null; autor: string }) {
  const portada = urlImagen(libro.portada);
  // Se compra en la tienda propia si hay un producto para este libro; si no, con los enlaces
  // de otras tiendas; y si no hay ninguno, se pide al autor por WhatsApp.
  const pedir = producto || libro.enlaces.length ? null : enlaceWhatsApp(whatsapp, `¡Hola ${autor}! Quiero un ejemplar de «${libro.titulo}».`);
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
        {producto && (
          <div className="acciones" style={{ alignItems: "center" }}>
            <span className="serif" style={{ fontSize: "1.8rem" }}>{formatoCLP(producto.precio)}</span>
            <BotonAgregar id={producto.id} agotado={producto.stock === 0} texto="Comprar" clase="btn btn-primary" />
            <small className="muted" style={{ flexBasis: "100%" }}>Pago con tarjeta o transferencia · envío a todo Chile por pagar</small>
          </div>
        )}
        {pedir && (
          <div className="acciones">
            <a href={pedir} target="_blank" rel="noopener noreferrer" className="btn btn-wa" data-track="whatsapp" data-track-donde="libro">Pídelo por WhatsApp</a>
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
