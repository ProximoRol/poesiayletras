"use client";

import { useEffect, useState } from "react";
import { idsVisita } from "@/lib/rastreo";

/** Campos ocultos con los ids de esta visita: el servidor une la venta a ella aunque no haya
 *  cookies (modo «No rastrear»). Vacíos para la familia. */
export function IdsVisita() {
  const [ids, setIds] = useState<{ vid: string; sid: string } | null>(null);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setIds(idsVisita()), []);
  if (!ids) return null;
  return (
    <>
      <input type="hidden" name="visita_vid" value={ids.vid} />
      <input type="hidden" name="visita_sid" value={ids.sid} />
    </>
  );
}

/** Empuja la compra a GA4 (dataLayer) una sola vez por pedido, aunque se recargue la página. */
export function EmpujarCompra({ id, valor, items }: { id: string; valor: number; items: { item_id: string; item_name: string; price: number; quantity: number }[] }) {
  useEffect(() => {
    const CLAVE = "compras_medidas";
    let hechas: string[] = [];
    try {
      hechas = JSON.parse(localStorage.getItem(CLAVE) ?? "[]");
    } catch {}
    if (hechas.includes(id)) return;
    void import("@/lib/rastreo").then(({ capaDatos }) => capaDatos("purchase", {}, { transaction_id: id, currency: "CLP", value: valor, items }));
    try {
      localStorage.setItem(CLAVE, JSON.stringify([...hechas, id].slice(-50)));
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  return null;
}
