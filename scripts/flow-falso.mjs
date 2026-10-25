// SOLO PRUEBAS LOCALES: imita las llamadas de Flow que usa la página, firmas incluidas.
//   POST /payment/create      → crea la orden y devuelve el link de pago
//   GET  /pagar?token=…       → «paga» (o rechaza con &rechazar=1), avisa a urlConfirmation
//                               y devuelve al comprador a urlReturn por POST, como Flow
//   GET  /payment/getStatus   → estado de la orden
// Uso: node scripts/flow-falso.mjs  y en .env.local FLOW_API_URL=http://localhost:56399,
// FLOW_API_KEY=local y FLOW_SECRET_KEY=secreto-local
import { createHmac, randomBytes } from "node:crypto";
import { createServer } from "node:http";

const PUERTO = 56399;
const SECRETO = process.env.FLOW_SECRET_KEY ?? "secreto-local";
const ordenes = new Map();
let siguiente = 7000001;

const firmar = (p) => createHmac("sha256", SECRETO).update(Object.keys(p).sort().map((k) => k + p[k]).join("")).digest("hex");
function firmaOk(params) {
  const { s, ...resto } = params;
  return Boolean(s) && s === firmar(resto);
}

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PUERTO}`);
  const json = (codigo, cuerpo) => { res.writeHead(codigo, { "Content-Type": "application/json" }); res.end(JSON.stringify(cuerpo)); };
  let cuerpo = "";
  for await (const trozo of req) cuerpo += trozo;

  if (req.method === "POST" && url.pathname === "/payment/create") {
    const p = Object.fromEntries(new URLSearchParams(cuerpo));
    if (!firmaOk(p)) return json(401, { code: 108, message: "firma inválida" });
    const token = randomBytes(20).toString("hex");
    const orden = { flowOrder: siguiente++, commerceOrder: p.commerceOrder, status: 1, amount: Number(p.amount), currency: p.currency ?? "CLP", urlConfirmation: p.urlConfirmation, urlReturn: p.urlReturn };
    ordenes.set(token, orden);
    console.log("[flow-falso] orden", orden.flowOrder, p.subject, `$${p.amount} ${orden.currency}`, p.email);
    return json(200, { url: `http://localhost:${PUERTO}/pagar`, token, flowOrder: orden.flowOrder });
  }

  if (req.method === "GET" && url.pathname === "/pagar") {
    const token = url.searchParams.get("token") ?? "";
    const orden = ordenes.get(token);
    if (!orden) return json(404, {});
    orden.status = url.searchParams.get("rechazar") ? 3 : 2;
    console.log("[flow-falso]", orden.status === 2 ? "pagada" : "rechazada", orden.flowOrder);
    // Aviso servidor a servidor (como Flow), sin esperar a que termine.
    fetch(orden.urlConfirmation, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ token }) })
      .then((r) => console.log("[flow-falso] aviso →", r.status))
      .catch((e) => console.log("[flow-falso] aviso falló", e.message));
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    return res.end(`<form id="f" method="post" action="${orden.urlReturn}"><input type="hidden" name="token" value="${token}"></form><script>document.getElementById("f").submit()</script>`);
  }

  if (req.method === "GET" && url.pathname === "/payment/getStatus") {
    const p = Object.fromEntries(url.searchParams);
    if (!firmaOk(p)) return json(401, { code: 108, message: "firma inválida" });
    const orden = ordenes.get(p.token);
    if (!orden) return json(400, { code: 105, message: "token no existe" });
    const { flowOrder, commerceOrder, status, amount, currency } = orden;
    return json(200, { flowOrder, commerceOrder, status, amount, currency });
  }

  json(404, {});
}).listen(PUERTO, () => console.log(`[flow-falso] escuchando en http://localhost:${PUERTO}`));
