import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Compartir } from "@/components/Compartir";
import { FormComentario } from "@/components/FormComentario";
import { Obra } from "@/components/Obra";
import { TarjetaTexto } from "@/components/TarjetaTexto";
import { minutosLectura, sinMarcas } from "@/domain/textos";
import { fechaLarga } from "@/lib/contacto";
import { comentariosAprobados, perfil, textoPublicado, textosPublicados } from "@/server/datos";
import { env } from "@/server/env";
import { urlImagen } from "@/server/supabase";

export const revalidate = 300;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const t = await textoPublicado(slug);
  if (!t) return {};
  const imagen = urlImagen(t.imagen);
  const descripcion = sinMarcas(t.extracto).replace(/\n/g, " / ");
  return {
    title: t.titulo,
    description: descripcion,
    alternates: { canonical: `/textos/${t.slug}` },
    openGraph: { type: "article", title: t.titulo, description: descripcion, publishedTime: t.publicado_en ?? undefined, images: imagen ? [imagen] : undefined },
  };
}

export default async function PaginaTexto({ params }: Props) {
  const { slug } = await params;
  const texto = await textoPublicado(slug);
  if (!texto) notFound();

  const [p, comentarios, recientes] = await Promise.all([perfil(), comentariosAprobados(texto.id), textosPublicados({ limite: 4 })]);
  const otros = recientes.filter((t) => t.id !== texto.id).slice(0, 3);
  const imagen = urlImagen(texto.imagen);
  const nombreCorto = p.nombre.split(" ")[0];

  return (
    <article className="lectura">
      <div className="estrecho">
        <header>
          <span className="eyebrow">{texto.tema?.nombre}</span>
          <h1>{texto.titulo}</h1>
          <p className="meta">
            {fechaLarga(texto.publicado_en)}
            {texto.tema?.formato !== "verso" && ` · ${minutosLectura(texto.cuerpo)} min de lectura`}
          </p>
        </header>
        {imagen && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="portada" src={imagen} alt="" />
        )}
        <Obra cuerpo={texto.cuerpo} formato={texto.tema?.formato ?? "prosa"} />
        <p className="firma">— {p.nombre}</p>

        <Compartir url={`${env.sitio}/textos/${texto.slug}`} titulo={texto.titulo} />

        <section className="comentarios" id="comentarios" style={{ padding: 0 }}>
          <h2>{comentarios.length ? `Comentarios (${comentarios.length})` : "Comentarios"}</h2>
          {!comentarios.length && <p className="muted">Sé la primera persona en comentar.</p>}
          {comentarios.map((c) => (
            <div key={c.id} className="comentario">
              <span className="quien">{c.nombre}</span>
              <span className="cuando">{fechaLarga(c.creado_en)}</span>
              <p>{c.cuerpo}</p>
              {c.respuesta && (
                <div className="respuesta">
                  <span className="quien">{nombreCorto} responde</span>
                  <p>{c.respuesta}</p>
                </div>
              )}
            </div>
          ))}
          <FormComentario textoId={texto.id} autor={nombreCorto} />
        </section>
      </div>

      {otros.length > 0 && (
        <div className="wrap otros">
          <div className="sec-head center">
            <span className="eyebrow">Sigue leyendo</span>
          </div>
          <div className="textos-grid">
            {otros.map((t) => (
              <TarjetaTexto key={t.id} texto={t} />
            ))}
          </div>
          <div className="sec-pie">
            <Link href="/textos" className="btn btn-ghost">Todos los textos</Link>
          </div>
        </div>
      )}
    </article>
  );
}
