import Link from "next/link";
import { CarritoProvider } from "@/components/Carrito";
import { Menu } from "@/components/Menu";
import { SECCIONES } from "@/lib/secciones";
import { enlaceWhatsApp } from "@/lib/contacto";
import { perfil, productosVisibles } from "@/server/datos";

export default async function LayoutSitio({ children }: { children: React.ReactNode }) {
  const [p, productos] = await Promise.all([perfil(), productosVisibles()]);
  const wa = enlaceWhatsApp(p.whatsapp, `¡Hola ${p.nombre.split(" ")[0]}! Te escribo desde tu página.`);

  return (
    <CarritoProvider productos={productos.map(({ id, nombre, precio, stock }) => ({ id, nombre, precio, stock }))}>
      <Menu nombre={p.nombre} />
      <main>{children}</main>
      <footer className="pie">
        <div className="wrap">
          <div className="pie-grid">
            <div>
              <Link href="/" className="brand">
                <span className="mark" aria-hidden>{p.nombre.charAt(0)}</span> {p.nombre}
              </Link>
              <p>{p.frase}</p>
            </div>
            <div className="pie-col">
              <h4>Navegar</h4>
              {SECCIONES.map((s) => (
                <Link key={s.href} href={s.href}>{s.texto}</Link>
              ))}
            </div>
            <div className="pie-col">
              <h4>Contacto</h4>
              {p.instagram && <a href={p.instagram} target="_blank" rel="noopener noreferrer">Instagram</a>}
              {p.facebook && <a href={p.facebook} target="_blank" rel="noopener noreferrer">Facebook</a>}
              {wa && <a href={wa} target="_blank" rel="noopener noreferrer">WhatsApp</a>}
              {p.correo && <a href={`mailto:${p.correo}`}>{p.correo}</a>}
            </div>
          </div>
          <div className="pie-final">
            <span>© {new Date().getFullYear()} {p.nombre}</span>
            <span>Los textos de este sitio pertenecen a su autor.</span>
          </div>
        </div>
      </footer>
      {wa && (
        <a href={wa} className="wa-float" target="_blank" rel="noopener noreferrer" aria-label="Escribir por WhatsApp" title="Escribir por WhatsApp">
          <IconoWhatsApp />
        </a>
      )}
    </CarritoProvider>
  );
}

function IconoWhatsApp() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.8.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.5-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6l.4-.5c.2-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3.1 4.9 4.3 2.4.9 2.9.8 3.4.7.5-.1 1.7-.7 2-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3zM12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.5 0-3-.4-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2z" />
    </svg>
  );
}
