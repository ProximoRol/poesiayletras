import Link from "next/link";
import { minutosLectura } from "@/domain/textos";
import { fechaLarga } from "@/lib/contacto";
import { urlImagen } from "@/server/supabase";
import type { Texto } from "@/server/tipos";

export function TarjetaTexto({ texto }: { texto: Texto }) {
  const imagen = urlImagen(texto.imagen);
  const verso = texto.tema?.formato === "verso";
  return (
    <Link href={`/textos/${texto.slug}`} className="tarjeta">
      {imagen && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="thumb" src={imagen} alt="" loading="lazy" />
      )}
      <div className="cuerpo">
        <span className="cat">{texto.tema?.nombre}</span>
        <h3>{texto.titulo}</h3>
        <p className={`extracto${verso ? " verso" : ""}`}>{texto.extracto}</p>
        <div className="pie">
          <span>{fechaLarga(texto.publicado_en)}</span>
          <b>{verso ? "Leer poema →" : `${minutosLectura(texto.cuerpo)} min →`}</b>
        </div>
      </div>
    </Link>
  );
}

export function GrillaTextos({ textos, vacio }: { textos: Texto[]; vacio: string }) {
  if (!textos.length) return <p className="vacio">{vacio}</p>;
  return (
    <div className="textos-grid">
      {textos.map((t) => (
        <TarjetaTexto key={t.id} texto={t} />
      ))}
    </div>
  );
}
