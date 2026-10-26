"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { formatoCLP } from "@/lib/dinero";
import { ENVIO_GRATIS } from "@/lib/envio";
import { capaDatos, rastrear } from "@/lib/rastreo";

// Carrito del sitio. En el navegador solo se guarda qué productos y cuántos; nombre, precio y
// stock vienen siempre de la base (y al pagar, el precio lo vuelve a poner la base).

export type ProductoCarro = { id: string; nombre: string; precio: number; stock: number | null };
type Linea = { id: string; cantidad: number };
type Carro = {
  agregar: (id: string) => void;
  lineas: (ProductoCarro & { cantidad: number })[];
  total: number;
  vaciar: () => void;
  /** false hasta leer el carrito guardado en el navegador. */
  listo: boolean;
};

const CLAVE = "carrito_v2";
const Contexto = createContext<Carro>({ agregar: () => {}, lineas: [], total: 0, vaciar: () => {}, listo: false });
export const useCarrito = () => useContext(Contexto);

function leer(): Linea[] {
  try {
    const c = JSON.parse(localStorage.getItem(CLAVE) ?? "[]");
    return Array.isArray(c) ? c.filter((i) => typeof i?.id === "string" && Number.isInteger(i?.cantidad) && i.cantidad > 0) : [];
  } catch {
    return [];
  }
}

export function CarritoProvider({ productos, children }: { productos: ProductoCarro[]; children: React.ReactNode }) {
  const [guardado, setGuardado] = useState<Linea[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [listo, setListo] = useState(false);
  // En la compra y en el pedido el botón flotante sobra (y en celular tapa el formulario).
  const ruta = usePathname();
  const sinBoton = ruta === "/comprar" || ruta.startsWith("/pedido/");

  // El carrito guardado solo existe en el navegador: se lee después de hidratar.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGuardado(leer());
    setListo(true);
  }, []);
  useEffect(() => {
    if (!listo) return;
    try {
      localStorage.setItem(CLAVE, JSON.stringify(guardado));
    } catch {}
  }, [guardado, listo]);

  // Solo productos que siguen a la venta, con la cantidad limitada al stock.
  const lineas = useMemo(
    () =>
      guardado.flatMap((l) => {
        const p = productos.find((x) => x.id === l.id);
        if (!p || p.stock === 0) return [];
        return [{ ...p, cantidad: p.stock === null ? l.cantidad : Math.min(l.cantidad, p.stock) }];
      }),
    [guardado, productos],
  );
  const total = lineas.reduce((s, l) => s + l.precio * l.cantidad, 0);
  const cuenta = lineas.reduce((s, l) => s + l.cantidad, 0);

  function vaciar() {
    // También lo guardado: este efecto puede correr antes de que se lea el carrito al cargar.
    try {
      localStorage.removeItem(CLAVE);
    } catch {}
    setGuardado([]);
  }
  function agregar(id: string) {
    const p = productos.find((x) => x.id === id);
    rastrear("add_to_cart", { objeto: id, valor: p?.precio });
    if (p) capaDatos("add_to_cart", {}, { currency: "CLP", value: p.precio, items: [{ item_id: p.id, item_name: p.nombre, price: p.precio, quantity: 1 }] });
    setGuardado((prev) => (prev.some((l) => l.id === id) ? prev.map((l) => (l.id === id ? { ...l, cantidad: l.cantidad + 1 } : l)) : [...prev, { id, cantidad: 1 }]));
    setAbierto(true);
  }
  function cambiar(id: string, delta: number) {
    setGuardado((prev) => prev.flatMap((l) => (l.id !== id ? [l] : l.cantidad + delta > 0 ? [{ ...l, cantidad: Math.min(l.cantidad + delta, 20) }] : [])));
  }

  return (
    <Contexto.Provider value={{ agregar, lineas, total, vaciar, listo }}>
      {children}
      {cuenta > 0 && !abierto && !sinBoton && (
        <button type="button" className="btn btn-oscuro carrito-btn" onClick={() => { setAbierto(true); rastrear("cart_open"); }}>
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
              {!lineas.length && <p className="vacio">Tu carrito está vacío.</p>}
              {lineas.map((l) => (
                <div key={l.id} className="cart-item">
                  <div className="ci-body">
                    <h4>{l.nombre}</h4>
                    <div className="ci-price">{formatoCLP(l.precio)} c/u</div>
                    <div className="qty">
                      <button type="button" onClick={() => cambiar(l.id, -1)} aria-label="Quitar uno">−</button>
                      <span>{l.cantidad}</span>
                      <button type="button" onClick={() => cambiar(l.id, 1)} aria-label="Añadir uno" disabled={l.stock !== null && l.cantidad >= l.stock}>+</button>
                    </div>
                    <button type="button" className="ci-remove" onClick={() => cambiar(l.id, -l.cantidad)}>Quitar</button>
                  </div>
                  <div className="ci-price">{formatoCLP(l.precio * l.cantidad)}</div>
                </div>
              ))}
            </div>
            <div className="drawer-foot">
              <div className="cart-total"><span>Total</span><span>{formatoCLP(total)}</span></div>
              {lineas.length > 0 && (
                <Link href="/comprar" className="btn btn-primary" onClick={() => setAbierto(false)}>Comprar</Link>
              )}
              <small className="muted centro">Pago seguro con Flow. {ENVIO_GRATIS}</small>
            </div>
          </aside>
        </>
      )}
    </Contexto.Provider>
  );
}

export function BotonAgregar({ id, agotado, texto = "Añadir al carrito", clase = "btn btn-primary btn-chico" }: { id: string; agotado?: boolean; texto?: string; clase?: string }) {
  const { agregar } = useCarrito();
  if (agotado) return <span className="estado borrador">Agotado</span>;
  return (
    <button type="button" className={clase} onClick={() => agregar(id)}>
      {texto}
    </button>
  );
}

/** En la página del pedido: vacía el carrito una vez que el pedido existe. */
export function VaciarCarrito() {
  const { vaciar } = useCarrito();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => vaciar(), []);
  return null;
}
