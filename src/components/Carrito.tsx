"use client";

import { createContext, useContext, useEffect, useState } from "react";

// Carrito de la corrección y la tienda. Vive en el navegador (localStorage) y el pedido se
// envía por WhatsApp; el autor confirma el detalle y cobra. Si algún día se agrega un enlace de
// pago de Stripe, va en NEXT_PUBLIC_STRIPE_PAYMENT_LINK.

type Item = { nombre: string; precio: number; cantidad: number };
type Carro = { agregar: (nombre: string, precio: number) => void };

const CLAVE = "wagner_cart";
const Contexto = createContext<Carro>({ agregar: () => {} });
const dinero = (n: number) => `$${n.toFixed(0)}`;
const PAGO = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK ?? "";

function leer(): Item[] {
  try {
    const c = JSON.parse(localStorage.getItem(CLAVE) ?? "[]");
    return Array.isArray(c) ? c.filter((i) => typeof i?.nombre === "string").map((i) => ({ nombre: i.nombre, precio: Number(i.precio ?? i.price) || 0, cantidad: Number(i.cantidad ?? i.qty) || 1 })) : [];
  } catch {
    return [];
  }
}

export function CarritoProvider({ whatsapp, autor, children }: { whatsapp: string | null; autor: string; children: React.ReactNode }) {
  const [items, setItems] = useState<Item[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [listo, setListo] = useState(false);

  // El carrito guardado solo existe en el navegador: se lee después de hidratar.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(leer());
    setListo(true);
  }, []);
  useEffect(() => {
    if (!listo) return;
    try {
      localStorage.setItem(CLAVE, JSON.stringify(items));
    } catch {}
  }, [items, listo]);

  function agregar(nombre: string, precio: number) {
    setItems((prev) => {
      const ya = prev.find((i) => i.nombre === nombre);
      return ya ? prev.map((i) => (i === ya ? { ...i, cantidad: i.cantidad + 1 } : i)) : [...prev, { nombre, precio, cantidad: 1 }];
    });
    setAbierto(true);
  }
  function cambiar(idx: number, delta: number) {
    setItems((prev) => prev.flatMap((it, i) => (i !== idx ? [it] : it.cantidad + delta > 0 ? [{ ...it, cantidad: it.cantidad + delta }] : [])));
  }

  const total = items.reduce((s, i) => s + i.precio * i.cantidad, 0);
  const cuenta = items.reduce((s, i) => s + i.cantidad, 0);
  const numero = (whatsapp ?? "").replace(/[^\d]/g, "");

  function pedirWhatsApp() {
    let msg = `¡Hola ${autor}! Quiero encargar:\n\n`;
    for (const i of items) msg += `• ${i.nombre} x${i.cantidad} — ${dinero(i.precio * i.cantidad)}\n`;
    msg += `\nTotal aprox.: ${dinero(total)}`;
    window.open(`https://wa.me/${numero}?text=${encodeURIComponent(msg)}`, "_blank", "noopener");
  }

  return (
    <Contexto.Provider value={{ agregar }}>
      {children}
      {cuenta > 0 && !abierto && (
        <button type="button" className="btn btn-oscuro carrito-btn" onClick={() => setAbierto(true)}>
          Carrito ({cuenta})
        </button>
      )}
      {abierto && (
        <>
          <div className="overlay" onClick={() => setAbierto(false)} />
          <aside className="drawer" role="dialog" aria-label="Tu carrito">
            <div className="drawer-head">
              <h3>Tu carrito</h3>
              <button type="button" className="drawer-close" onClick={() => setAbierto(false)} aria-label="Cerrar">×</button>
            </div>
            <div className="drawer-body">
              {!items.length && <p className="vacio">Tu carrito está vacío.</p>}
              {items.map((i, idx) => (
                <div key={i.nombre} className="cart-item">
                  <div className="ci-body">
                    <h4>{i.nombre}</h4>
                    <div className="ci-price">{dinero(i.precio)} c/u</div>
                    <div className="qty">
                      <button type="button" onClick={() => cambiar(idx, -1)} aria-label="Quitar uno">−</button>
                      <span>{i.cantidad}</span>
                      <button type="button" onClick={() => cambiar(idx, 1)} aria-label="Añadir uno">+</button>
                    </div>
                    <button type="button" className="ci-remove" onClick={() => cambiar(idx, -i.cantidad)}>Quitar</button>
                  </div>
                  <div className="ci-price">{dinero(i.precio * i.cantidad)}</div>
                </div>
              ))}
            </div>
            <div className="drawer-foot">
              <div className="cart-total"><span>Total</span><span>{dinero(total)}</span></div>
              {PAGO && items.length > 0 && (
                <a className="btn btn-primary" href={PAGO} target="_blank" rel="noopener noreferrer">Pagar con tarjeta</a>
              )}
              {numero ? (
                <button type="button" className="btn btn-wa" disabled={!items.length} onClick={pedirWhatsApp}>Pedir por WhatsApp</button>
              ) : (
                <p className="aviso info">Pronto podrás hacer tu pedido desde aquí.</p>
              )}
              <small className="muted centro">Precios de referencia (USD). Confirmamos el detalle antes de cobrar.</small>
            </div>
          </aside>
        </>
      )}
    </Contexto.Provider>
  );
}

export function BotonAgregar({ nombre, precio, texto = "Añadir", clase = "btn btn-primary btn-chico" }: { nombre: string; precio: number; texto?: string; clase?: string }) {
  const { agregar } = useContext(Contexto);
  return (
    <button type="button" className={clase} onClick={() => agregar(nombre, precio)}>
      {texto}
    </button>
  );
}
