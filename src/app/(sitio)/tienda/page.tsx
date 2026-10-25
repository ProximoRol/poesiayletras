import type { Metadata } from "next";
import { BotonAgregar } from "@/components/Carrito";
import { enlaceWhatsApp } from "@/lib/contacto";
import { formatoCLP } from "@/lib/dinero";
import { perfil, productosVisibles } from "@/server/datos";
import { urlImagen } from "@/server/supabase";

export const revalidate = 300;
export const metadata: Metadata = { title: "Tienda", description: "Sus libros y más, con envío a todo Chile." };

export default async function Tienda() {
  const [productos, p] = await Promise.all([productosVisibles(), perfil()]);
  const wa = enlaceWhatsApp(p.whatsapp, `¡Hola ${p.nombre.split(" ")[0]}! Tengo una consulta sobre la tienda.`);

  return (
    <>
      <div className="cabecera-pagina">
        <div className="wrap">
          <span className="eyebrow">Tienda</span>
          <h1 className="titulo-pagina">Para tener en las <em>manos</em></h1>
          <p>Pago seguro con Flow: tarjeta de débito, crédito o transferencia. Envío a todo Chile por pagar: el envío se paga al recibirlo.</p>
        </div>
      </div>
      <div className="wrap" style={{ paddingBottom: 70 }}>
        {!productos.length ? (
          <p className="vacio">Muy pronto.</p>
        ) : (
          <div className="grid-tienda">
            {productos.map((pr) => {
              const foto = urlImagen(pr.foto);
              return (
                <div key={pr.id} className="producto">
                  {foto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="ph" src={foto} alt={pr.nombre} style={{ objectFit: "cover", width: "100%" }} />
                  ) : (
                    <div className="ph" aria-hidden>📖</div>
                  )}
                  <div className="cbody">
                    <h3>{pr.nombre}</h3>
                    <p className="cdesc">{pr.descripcion}</p>
                    <div className="crow">
                      <span className="cprice">{formatoCLP(pr.precio)}</span>
                      <BotonAgregar id={pr.id} agotado={pr.stock === 0} texto="Añadir" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {wa && (
          <div className="shop-note cta" style={{ marginTop: 50 }}>
            <h2>¿Buscas algo especial?</h2>
            <p>Un ejemplar dedicado, varios para regalar o un pedido para tu librería: escríbeme.</p>
            <div className="acciones">
              <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-wa">Escríbeme por WhatsApp</a>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
