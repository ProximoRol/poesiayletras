"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { SECCIONES } from "@/lib/secciones";

export function Menu({ nombre }: { nombre: string }) {
  const ruta = usePathname();
  const [abierto, setAbierto] = useState(false);
  const inicial = nombre.trim().charAt(0).toUpperCase() || "W";

  return (
    <header className="nav">
      <div className="wrap nav-inner">
        <Link href="/" className="brand" onClick={() => setAbierto(false)}>
          <span className="mark" aria-hidden>{inicial}</span> {nombre}
        </Link>
        <nav className={`nav-links${abierto ? " abierto" : ""}`} id="menu" aria-label="Principal">
          {SECCIONES.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              aria-current={ruta === s.href || ruta.startsWith(s.href + "/") ? "page" : undefined}
              onClick={() => setAbierto(false)}
            >
              {s.texto}
            </Link>
          ))}
        </nav>
        <button className="nav-toggle" aria-controls="menu" aria-expanded={abierto} aria-label="Abrir menú" onClick={() => setAbierto((v) => !v)}>
          ☰
        </button>
      </div>
    </header>
  );
}
