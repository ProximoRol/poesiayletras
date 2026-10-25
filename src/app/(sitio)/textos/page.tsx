import type { Metadata } from "next";
import Link from "next/link";
import { GrillaTextos } from "@/components/TarjetaTexto";
import { temasConTextos, textosPublicados } from "@/server/datos";

export const metadata: Metadata = { title: "Textos", description: "Poemas, cuentos, ensayos y reflexiones." };

export default async function Textos({ searchParams }: { searchParams: Promise<{ tipo?: string }> }) {
  const { tipo } = await searchParams;
  const filtros = await temasConTextos();
  const categoria = filtros.find((t) => t.slug === tipo)?.slug;
  const textos = await textosPublicados({ categoria });

  return (
    <>
      <div className="cabecera-pagina">
        <div className="wrap">
          <span className="eyebrow">El cuaderno</span>
          <h1 className="titulo-pagina">Lo que <em>escribo</em></h1>
          <p>Poemas, cuentos y reflexiones. Los más nuevos, primero.</p>
        </div>
      </div>
      <section style={{ paddingTop: 20 }}>
        <div className="wrap">
          {filtros.length > 0 && (
            <nav className="filtros" aria-label="Filtrar por tema">
              <Link href="/textos" className="chip" aria-current={!categoria ? "page" : undefined}>Todos</Link>
              {filtros.map((t) => (
                <Link key={t.slug} href={`/textos?tipo=${t.slug}`} className="chip" aria-current={categoria === t.slug ? "page" : undefined}>
                  {t.nombre}
                </Link>
              ))}
            </nav>
          )}
          <GrillaTextos textos={textos} vacio={categoria ? "Todavía no hay textos de este tipo." : "Muy pronto, los primeros textos."} />
        </div>
      </section>
    </>
  );
}
