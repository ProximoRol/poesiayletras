import Link from "next/link";
import { fechaLarga } from "@/lib/contacto";
import { formatoCLP } from "@/lib/dinero";
import { usuario } from "@/server/supabase";
import { ESTADOS } from "@/lib/pedidos";
import type { Pedido } from "@/server/tipos";

export default async function Pedidos({ searchParams }: { searchParams: Promise<{ ver?: string }> }) {
  const { ver } = await searchParams;
  const todos = ver === "todos";
  const db = await usuario();
  let q = db.from("pedidos").select("*").order("creado_en", { ascending: false }).limit(200);
  // Por defecto, lo que importa: pagados por enviar y enviados. Los «sin pagar» son compras que
  // alguien empezó y no terminó.
  if (!todos) q = q.in("estado", ["pagado", "enviado"]);
  const { data } = await q;
  const pedidos = (data ?? []) as Pedido[];

  return (
    <>
      <div className="panel-cabeza">
        <div>
          <h1>Pedidos</h1>
          <p className="muted">Cuando un pedido está pagado, despáchalo y márcalo como enviado. Cada pedido dice si el envío es gratis o por pagar.</p>
        </div>
        <nav className="filtros" style={{ margin: 0 }}>
          <Link href="/admin/pedidos" className="chip" aria-current={!todos ? "page" : undefined}>Pagados</Link>
          <Link href="/admin/pedidos?ver=todos" className="chip" aria-current={todos ? "page" : undefined}>Todos</Link>
        </nav>
      </div>
      <div className="caja">
        {!pedidos.length ? (
          <p className="muted centro" style={{ padding: 30 }}>Todavía no hay pedidos.</p>
        ) : (
          <ul className="lista-admin">
            {pedidos.map((p) => (
              <li key={p.id}>
                <div className="titulo">
                  <Link href={`/admin/pedidos/${p.id}`}>#{p.numero} · {p.nombre}</Link>
                  <small>
                    {fechaLarga(p.creado_en)} · {p.items.reduce((s, i) => s + i.cantidad, 0)} producto(s) · {formatoCLP(p.total)} · {p.comuna}
                  </small>
                </div>
                <span className={`estado ${ESTADOS[p.estado].clase}`}>{ESTADOS[p.estado].texto}</span>
                <Link href={`/admin/pedidos/${p.id}`} className="btn btn-ghost btn-chico">Ver</Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
