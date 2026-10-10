import type { Metadata } from "next";
import Link from "next/link";
import { BotonAgregar } from "@/components/Carrito";

export const metadata: Metadata = { title: "Tienda", description: "Su libro, plumas y tinta, cuadernos y kits para quien escribe." };

type Producto = { nombre: string; carrito?: string; desc: string; precio: number; ic: string; cinta?: string };
const BLOQUES: { clave: string; titulo: string; bajada: string; productos: Producto[] }[] = [
  {
    clave: "obra", titulo: "Su obra", bajada: "Poesía para leer y para regalar.",
    productos: [
      { nombre: "Libro de poemas (físico)", desc: "El poemario en edición impresa. Tapa cuidada, papel de lectura agradable.", precio: 15, ic: "📖", cinta: "Destacado" },
      { nombre: "eBook (PDF)", desc: "El mismo poemario en digital, para leer donde estés.", precio: 6, ic: "📱" },
      { nombre: "Edición firmada y numerada", desc: "Ejemplar firmado a mano por el autor, con número de tirada.", precio: 25, ic: "✍️", cinta: "Edición limitada" },
      { nombre: "Marcapáginas con versos", carrito: "Marcapáginas con versos (set de 3)", desc: "Set de 3 marcapáginas con fragmentos de sus poemas.", precio: 4, ic: "🔖" },
      { nombre: "Lámina con poema", desc: "Un poema en caligrafía, listo para enmarcar.", precio: 12, ic: "🖼️" },
      { nombre: "Postales de poesía", carrito: "Postales de poesía (pack de 5)", desc: "Pack de 5 postales con fragmentos, para enviar o coleccionar.", precio: 7, ic: "💌" },
    ],
  },
  {
    clave: "plumas", titulo: "Plumas y tinta", bajada: "Los instrumentos con los que escribe.",
    productos: [
      { nombre: "Pluma estilográfica · entrada", desc: "Ideal para empezar en la escritura con pluma.", precio: 18, ic: "🖋️" },
      { nombre: "Pluma estilográfica · premium", desc: "Plumín fino, cuerpo con peso y elegancia.", precio: 45, ic: "✒️", cinta: "Premium" },
      { nombre: "Tinta en botella", desc: "La tinta con la que escribe. Varios colores.", precio: 9, ic: "🫙" },
      { nombre: "Set de caligrafía", desc: "Pluma de caña, plumines y tinta para iniciarte.", precio: 22, ic: "🪶" },
    ],
  },
  {
    clave: "papel", titulo: "Papelería", bajada: "Buen papel para que las palabras se sientan en casa.",
    productos: [
      { nombre: "El cuaderno del poeta", desc: "Papel que no traspasa la tinta, con una cita en la portada.", precio: 14, ic: "📔", cinta: "Marca propia" },
      { nombre: "Diario de escritura", desc: "Con indicaciones suaves para escribir a diario.", precio: 11, ic: "📓" },
      { nombre: "Libretas de bolsillo", carrito: "Libretas de bolsillo (pack de 2)", desc: "Pack de 2 para no perder ninguna idea.", precio: 8, ic: "🗒️" },
      { nombre: "Plantillas de métrica", desc: "Guías imprimibles para trabajar la métrica de tus versos.", precio: 5, ic: "📐" },
    ],
  },
  {
    clave: "encargos", titulo: "Kits y encargos", bajada: "Regalos con alma y trabajos a tu medida.",
    productos: [
      { nombre: "Kit del poeta", desc: "Pluma, tinta, cuaderno y su libro en una caja para regalar.", precio: 55, ic: "🎁", cinta: "Regalo estrella" },
      { nombre: "Poema por encargo", desc: "Un poema original para una boda, aniversario o regalo especial.", precio: 30, ic: "🖊️", cinta: "A tu medida" },
      { nombre: "Taller de escritura", carrito: "Taller de escritura (online)", desc: "Sesión online para mejorar tu poesía o tus cuentos.", precio: 25, ic: "🎓" },
    ],
  },
];

export default async function Tienda({ searchParams }: { searchParams: Promise<{ cat?: string }> }) {
  const { cat } = await searchParams;
  const visibles = BLOQUES.filter((b) => !cat || b.clave === cat);

  return (
    <>
      <div className="cabecera-pagina">
        <div className="wrap">
          <span className="eyebrow">La tienda del poeta</span>
          <h1 className="titulo-pagina">Objetos para <em>quien escribe</em></h1>
          <p>Su libro, plumas y tinta, cuadernos de buen papel y kits para empezar.</p>
        </div>
      </div>
      <div className="wrap" style={{ paddingBottom: 60 }}>
        <nav className="filtros" aria-label="Categorías">
          <Link href="/tienda" className="chip" aria-current={!cat ? "page" : undefined}>Todo</Link>
          {BLOQUES.map((b) => (
            <Link key={b.clave} href={`/tienda?cat=${b.clave}`} className="chip" aria-current={cat === b.clave ? "page" : undefined}>{b.titulo}</Link>
          ))}
        </nav>
        {visibles.map((b) => (
          <div key={b.clave} className="bloque-tienda">
            <div className="cabeza">
              <h2>{b.titulo}</h2>
              <p className="muted">{b.bajada}</p>
            </div>
            <div className="grid-tienda">
              {b.productos.map((pr) => (
                <div key={pr.nombre} className="producto">
                  <div className="ph" aria-hidden>
                    {pr.cinta && <span className="ribbon">{pr.cinta}</span>}
                    {pr.ic}
                  </div>
                  <div className="cbody">
                    <h3>{pr.nombre}</h3>
                    <p className="cdesc">{pr.desc}</p>
                    <div className="crow">
                      <span className="cprice">${pr.precio}</span>
                      <BotonAgregar nombre={pr.carrito ?? pr.nombre} precio={pr.precio} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
