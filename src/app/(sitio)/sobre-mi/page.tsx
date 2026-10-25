import type { Metadata } from "next";
import Link from "next/link";
import { enlaceWhatsApp } from "@/lib/contacto";
import { perfil } from "@/server/datos";
import { urlImagen } from "@/server/supabase";

export const revalidate = 300;
export const metadata: Metadata = { title: "Sobre mí" };

export default async function SobreMi() {
  const p = await perfil();
  const foto = urlImagen(p.foto);
  const wa = enlaceWhatsApp(p.whatsapp, `¡Hola ${p.nombre.split(" ")[0]}! Leí tu página y quería escribirte.`);

  return (
    <section>
      <div className="wrap sobre-grid">
        {foto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="foto" src={foto} alt={p.nombre} />
        ) : (
          <div className="foto foto-ph" aria-hidden>{p.nombre.charAt(0)}</div>
        )}
        <div className="sobre-texto">
          <span className="eyebrow">Sobre mí</span>
          <h2>{p.nombre}</h2>
          {(p.biografia || p.presentacion || p.frase).split(/\n\s*\n/).map((parrafo, i) => (
            <p key={i}>{parrafo}</p>
          ))}
          <div className="acciones" style={{ marginTop: 24 }}>
            <Link href="/textos" className="btn btn-primary">Leer mis textos</Link>
            {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-wa" data-track="whatsapp" data-track-donde="sobre_mi">Escríbeme por WhatsApp</a>}
            {p.instagram && <a href={p.instagram} target="_blank" rel="noopener noreferrer" className="btn btn-ghost" data-track="instagram" data-track-donde="sobre_mi">Instagram</a>}
          </div>
        </div>
      </div>
    </section>
  );
}
