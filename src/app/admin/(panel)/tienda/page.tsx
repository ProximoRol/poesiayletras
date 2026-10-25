import Link from "next/link";
import { formatoCLP } from "@/lib/dinero";
import { usuario } from "@/server/supabase";
import type { Producto } from "@/server/tipos";

export default async function TiendaPanel({ searchParams }: { searchParams: Promise<{ aviso?: string }> }) {
  const { aviso } = await searchParams;
  const db = await usuario();
  const { data } = await db.from("productos").select("*").order("orden").order("creado_en");
  const productos = (data ?? []) as Producto[];

  return (
    <>
      <div className="panel-cabeza">
        <div>
          <h1>Mi tienda</h1>
          <p className="muted">Lo que vendes en tu página. Se paga con Flow (tarjeta o transferencia) y el envío es por pagar.</p>
        </div>
        <Link href="/admin/tienda/nuevo" className="btn btn-primary">+ Agregar un producto</Link>
      </div>
      {aviso && <p className="aviso exito" style={{ marginBottom: 18 }}>{aviso}</p>}
      <div className="caja">
        {!productos.length ? (
          <p className="muted centro" style={{ padding: 30 }}>Todavía no hay productos. Agrega tu libro para empezar a venderlo.</p>
        ) : (
          <ul className="lista-admin">
            {productos.map((p) => (
              <li key={p.id}>
                <div className="titulo">
                  <Link href={`/admin/tienda/${p.id}`}>{p.nombre}</Link>
                  <small>{formatoCLP(p.precio)} · {p.stock === null ? "sin límite" : p.stock === 0 ? "agotado" : `quedan ${p.stock}`}</small>
                </div>
                <span className={`estado ${p.visible && p.stock !== 0 ? "publicado" : "borrador"}`}>{!p.visible ? "Oculto" : p.stock === 0 ? "Agotado" : "A la venta"}</span>
                <Link href={`/admin/tienda/${p.id}`} className="btn btn-ghost btn-chico">Editar</Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
