"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { salir } from "@/server/panel/acciones";

const ITEMS = [
  { href: "/admin", texto: "Mis textos" },
  { href: "/admin/comentarios", texto: "Comentarios" },
  { href: "/admin/pedidos", texto: "Pedidos" },
  { href: "/admin/tienda", texto: "Tienda" },
  { href: "/admin/libros", texto: "Libros" },
  { href: "/admin/perfil", texto: "Mi perfil" },
];

export function MenuPanel({ comentarios, pedidos }: { comentarios: number; pedidos: number }) {
  const ruta = usePathname();
  const activo = (href: string) => (href === "/admin" ? ruta === "/admin" || ruta.startsWith("/admin/textos") : ruta.startsWith(href));

  return (
    <header className="panel-nav">
      <div className="wrap">
        <nav aria-label="Panel">
          {ITEMS.map((i) => (
            <Link key={i.href} href={i.href} aria-current={activo(i.href) ? "page" : undefined}>
              {i.texto}
              {i.href === "/admin/comentarios" && comentarios > 0 && <span className="contador">{comentarios}</span>}
              {i.href === "/admin/pedidos" && pedidos > 0 && <span className="contador">{pedidos}</span>}
            </Link>
          ))}
        </nav>
        <nav>
          <a href="/" target="_blank" rel="noopener">Ver mi página ↗</a>
          <form action={salir}>
            <button type="submit" className="boton-texto" style={{ color: "#e6d9c4" }}>Salir</button>
          </form>
        </nav>
      </div>
    </header>
  );
}
