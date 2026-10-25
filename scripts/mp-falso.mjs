// SOLO PRUEBAS LOCALES: imita las 3 llamadas de Mercado Pago que usa la página.
//   POST /checkout/preferences  → crea la preferencia (link de pago)
//   GET  /pagar/:id             → «paga» (aprueba o rechaza con ?rechazar=1) y vuelve a la página
//   GET  /v1/payments/:id       → estado del pago
// Uso: node scripts/mp-falso.mjs  y en .env.local MERCADOPAGO_API_URL=http://localhost:56399
import { createServer } from "node:http";

const PUERTO = 56399;
const preferencias = new Map();
const pagos = new Map();
let siguiente = 9000001;

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PUERTO}`);
  const json = (codigo, cuerpo) => { res.writeHead(codigo, { "Content-Type": "application/json" }); res.end(JSON.stringify(cuerpo)); };
  let cuerpo = "";
  for await (const trozo of req) cuerpo += trozo;

  if (req.method === "POST" && url.pathname === "/checkout/preferences") {
    if (!req.headers.authorization?.startsWith("Bearer ")) return json(401, { message: "sin token" });
    const pref = JSON.parse(cuerpo);
    const id = `pref-${preferencias.size + 1}`;
    preferencias.set(id, pref);
    console.log("[mp-falso] preferencia", id, pref.items.map((i) => `${i.quantity}×${i.title} $${i.unit_price} ${i.currency_id}`).join(", "));
    return json(201, { id, init_point: `http://localhost:${PUERTO}/pagar/${id}` });
  }
  const pagar = url.pathname.match(/^\/pagar\/(.+)$/);
  if (req.method === "GET" && pagar) {
    const pref = preferencias.get(pagar[1]);
    if (!pref) return json(404, {});
    const rechazado = url.searchParams.get("rechazar") === "1";
    const id = siguiente++;
    const monto = pref.items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
    pagos.set(String(id), { id, status: rechazado ? "rejected" : "approved", external_reference: pref.external_reference, transaction_amount: monto, currency_id: "CLP" });
    console.log("[mp-falso] pago", id, rechazado ? "RECHAZADO" : "APROBADO", monto);
    const vuelta = new URL(rechazado ? pref.back_urls.failure : pref.back_urls.success);
    vuelta.searchParams.set("payment_id", String(id));
    vuelta.searchParams.set("status", rechazado ? "rejected" : "approved");
    vuelta.searchParams.set("external_reference", pref.external_reference);
    res.writeHead(302, { Location: vuelta.toString() });
    return res.end();
  }
  const pago = url.pathname.match(/^\/v1\/payments\/(\d+)$/);
  if (req.method === "GET" && pago) {
    if (!req.headers.authorization?.startsWith("Bearer ")) return json(401, { message: "sin token" });
    return pagos.has(pago[1]) ? json(200, pagos.get(pago[1])) : json(404, {});
  }
  json(404, {});
}).listen(PUERTO, () => console.log(`[mp-falso] escuchando en http://localhost:${PUERTO}`));
