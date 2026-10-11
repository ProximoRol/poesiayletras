import Link from "next/link";
import { notFound } from "next/navigation";
import { BotonConfirmar } from "@/components/panel/BotonConfirmar";
import { FormProducto } from "@/components/panel/FormProducto";
import { env } from "@/server/env";
import { borrarProducto } from "@/server/panel/acciones";
import { usuario } from "@/server/supabase";
import type { Producto } from "@/server/tipos";

export default async function EditarProducto({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await usuario();
  let producto: Producto | null = null;
  if (id !== "nuevo") {
    if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
    const { data } = await db.from("productos").select("*").eq("id", id).maybeSingle();
    if (!data) notFound();
    producto = data as Producto;
  }
  const { data: libros } = await db.from("libros").select("id, titulo").order("orden");

  return (
    <>
      <div className="panel-cabeza">
        <div>
          <Link href="/admin/tienda" className="enlace">← Mi tienda</Link>
          <h1 style={{ marginTop: 8 }}>{producto ? producto.nombre : "Producto nuevo"}</h1>
        </div>
      </div>
      <FormProducto key={producto?.id ?? "nuevo"} producto={producto} libros={libros ?? []} urlBase={env.supabaseUrl} />
      {producto && (
        <form action={borrarProducto} style={{ marginTop: 40, textAlign: "right" }}>
          <input type="hidden" name="id" value={producto.id} />
          <BotonConfirmar pregunta="¿Borrar este producto de tu tienda? Los pedidos anteriores no se borran.">Borrar este producto</BotonConfirmar>
        </form>
      )}
    </>
  );
}
