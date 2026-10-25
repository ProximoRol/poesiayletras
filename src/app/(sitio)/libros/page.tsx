import type { Metadata } from "next";
import { VitrinaLibro } from "@/components/Libro";
import { librosVisibles, perfil, productosVisibles } from "@/server/datos";

export const revalidate = 300;
export const metadata: Metadata = { title: "Libros", description: "Los libros publicados y dónde comprarlos." };

export default async function Libros() {
  const [libros, p, productos] = await Promise.all([librosVisibles(), perfil(), productosVisibles()]);
  return (
    <>
      <div className="cabecera-pagina">
        <div className="wrap">
          <span className="eyebrow">Obra publicada</span>
          <h1 className="titulo-pagina">Mis <em>libros</em></h1>
          <p>Para leer en papel, regalar o tener cerca.</p>
        </div>
      </div>
      <section style={{ paddingTop: 10 }}>
        <div className="wrap">
          {libros.length ? libros.map((l) => <VitrinaLibro key={l.id} libro={l} producto={productos.find((x) => x.libro_id === l.id)} whatsapp={p.whatsapp} autor={p.nombre.split(" ")[0]} />) : <p className="vacio">Muy pronto.</p>}
        </div>
      </section>
    </>
  );
}
