import type { Metadata } from "next";
import Link from "next/link";
import { GrillaTextos } from "@/components/TarjetaTexto";
import { CATEGORIAS, esCategoria } from "@/domain/textos";
import { textosPublicados } from "@/server/datos";

export const metadata: Metadata = { title: "Textos", description: "Poemas, cuentos, ensayos y reflexiones." };

export default async function Textos({ searchParams }: { searchParams: Promise<{ tipo?: string }> }) {
  const { tipo } = await searchParams;
  const categoria = esCategoria(tipo) ? tipo : undefined;
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
          <nav className="filtros" aria-label="Filtrar por tipo">
            <Link href="/textos" className="chip" aria-current={!categoria ? "page" : undefined}>Todos</Link>
            {Object.entries(CATEGORIAS).map(([clave, nombre]) => (
              <Link key={clave} href={`/textos?tipo=${clave}`} className="chip" aria-current={categoria === clave ? "page" : undefined}>
                {nombre}
              </Link>
            ))}
          </nav>
          <GrillaTextos textos={textos} vacio={categoria ? "Todavía no hay textos de este tipo." : "Muy pronto, los primeros textos."} />
        </div>
      </section>
    </>
  );
}
