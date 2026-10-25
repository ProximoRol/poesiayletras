import "server-only";

import { cantidadTexto } from "@/lib/correccion";
import { formatoCLP } from "@/lib/dinero";
import { env } from "./env";
import type { Encargo } from "./tipos";

// Correos (API de Resend, sin dependencias):
//  · al autor: comentario nuevo y pedido pagado, con un botón directo al panel;
//  · al comprador: pedido confirmado y pedido enviado.
// Sin RESEND_API_KEY no se manda nada; un correo que falla nunca rompe el comentario o el pago.

const escapar = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const remitente = () => process.env.CORREO_REMITENTE ?? "Tu página <avisos@resend.dev>";
const correoAutor = () => (process.env.CORREO_AVISOS ?? "").split(",").map((s) => s.trim()).filter(Boolean);

async function enviar(para: string[], asunto: string, cuerpoHtml: string, responderA?: string): Promise<void> {
  const clave = process.env.RESEND_API_KEY;
  if (!clave || !para.length) return;
  const html = `<div style="font-family:Georgia,serif;max-width:540px;margin:0 auto;color:#2e2620;font-size:18px;line-height:1.6">${cuerpoHtml}</div>`;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${clave}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: remitente(), to: para, subject: asunto, html, ...(responderA ? { reply_to: responderA } : {}) }),
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    // Un aviso que falla no debe romper nada.
  }
}

const boton = (url: string, texto: string) =>
  `<p style="margin:24px 0 28px"><a href="${url}" style="display:inline-block;background:#b8622f;color:#fff;text-decoration:none;padding:16px 28px;border-radius:100px;font-family:Arial,sans-serif;font-size:18px">${texto}</a></p>`;
const cita = (t: string) =>
  `<blockquote style="margin:0 0 8px;padding:14px 18px;background:#f6efe3;border-left:4px solid #b8622f;white-space:pre-line">${t}</blockquote>`;

// ── Comentarios ─────────────────────────────────────────────────────────────

export async function avisarComentario(c: { nombre: string; cuerpo: string; tituloTexto: string; publicado: boolean }): Promise<void> {
  await enviar(
    correoAutor(),
    `${c.nombre} comentó «${c.tituloTexto}»`,
    `<p style="font-size:22px;margin:0 0 16px">Tienes un comentario nuevo 💬</p>
     <p style="margin:0 0 6px"><b>${escapar(c.nombre)}</b> comentó en <i>«${escapar(c.tituloTexto)}»</i>:</p>
     ${cita(escapar(c.cuerpo))}
     ${boton(`${env.sitio}/admin/comentarios`, c.publicado ? "Responder o borrar" : "Ver y aprobar el comentario")}
     <p style="color:#5b4f45;font-size:15px">${c.publicado ? "Ya está publicado en tu página. Si no te gusta, puedes borrarlo." : "No aparecerá en tu página hasta que lo apruebes."}</p>`,
  );
}

// ── Pedidos ─────────────────────────────────────────────────────────────────

export interface PedidoCorreo {
  id: string;
  numero: number;
  nombre: string;
  correo: string;
  telefono: string;
  rut: string | null;
  direccion: string;
  comuna: string;
  region: string;
  notas: string;
  items: { nombre: string; precio: number; cantidad: number }[];
  total: number;
  seguimiento?: string | null;
}

const lineas = (p: PedidoCorreo) =>
  p.items.map((i) => `${i.cantidad} × ${escapar(i.nombre)} — ${formatoCLP(i.precio * i.cantidad)}`).join("<br>") +
  `<br><b>Total pagado: ${formatoCLP(p.total)}</b>`;
const direccion = (p: PedidoCorreo) =>
  `${escapar(p.nombre)}${p.rut ? ` · RUT ${escapar(p.rut)}` : ""}<br>${escapar(p.direccion)}<br>${escapar(p.comuna)}, ${escapar(p.region)}<br>Tel. ${escapar(p.telefono)} · ${escapar(p.correo)}`;

export async function avisarPedidoPagado(p: PedidoCorreo, autor: string): Promise<void> {
  await Promise.all([
    enviar(
      correoAutor(),
      `Nuevo pedido pagado #${p.numero} — ${p.nombre}`,
      `<p style="font-size:22px;margin:0 0 16px">¡Vendiste! 📚 Pedido #${p.numero}</p>
       <p style="margin:0 0 6px">Ya está pagado. Hay que enviarlo <b>por pagar</b> (Starken o Blue Express) a:</p>
       ${cita(direccion(p))}
       <p style="margin:16px 0 6px">${lineas(p)}</p>
       ${p.notas ? `<p style="margin:16px 0 6px">Nota del comprador:</p>${cita(escapar(p.notas))}` : ""}
       ${boton(`${env.sitio}/admin/pedidos/${p.id}`, "Ver el pedido")}
       <p style="color:#5b4f45;font-size:15px">Cuando lo despaches, aprieta «Marcar como enviado» y le avisamos al comprador.</p>`,
      p.correo,
    ),
    enviar(
      [p.correo],
      `Recibimos tu pedido #${p.numero}`,
      `<p style="font-size:22px;margin:0 0 16px">¡Gracias por tu compra, ${escapar(p.nombre.split(" ")[0])}!</p>
       <p>Tu pago fue recibido. ${escapar(autor)} preparará tu pedido y te lo enviará <b>por pagar</b> (el envío se paga al recibirlo) a:</p>
       ${cita(direccion(p))}
       <p style="margin:16px 0">${lineas(p)}</p>
       <p style="color:#5b4f45;font-size:15px">Te escribiremos cuando vaya en camino. Si tienes dudas, responde este correo.</p>`,
      correoAutor()[0],
    ),
  ]);
}

export async function avisarPedidoEnviado(p: PedidoCorreo, autor: string): Promise<void> {
  await enviar(
    [p.correo],
    `Tu pedido #${p.numero} va en camino`,
    `<p style="font-size:22px;margin:0 0 16px">Tu pedido va en camino 📦</p>
     <p>${escapar(autor)} despachó tu pedido #${p.numero}. Recuerda que el envío se paga al recibirlo.</p>
     ${p.seguimiento ? `<p>Número de seguimiento:</p>${cita(escapar(p.seguimiento))}` : ""}
     <p style="color:#5b4f45;font-size:15px">¡Que lo disfrutes!</p>`,
    correoAutor()[0],
  );
}

// ── Corrección literaria ────────────────────────────────────────────────────

export async function avisarEncargoPagado(e: Encargo, autor: string): Promise<void> {
  const detalle = `${escapar(e.servicio)}${e.unidad === "fijo" ? "" : ` · ${cantidadTexto(e.unidad, e.cantidad)}`} — <b>${formatoCLP(e.total)}</b>`;
  await Promise.all([
    enviar(
      correoAutor(),
      `Nueva corrección pagada #${e.numero} — ${e.nombre}`,
      `<p style="font-size:22px;margin:0 0 16px">Te encargaron una corrección ✍️ #${e.numero}</p>
       <p style="margin:0 0 6px">${detalle}</p>
       ${cita(`${escapar(e.nombre)}<br>${escapar(e.correo)} · Tel. ${escapar(e.telefono)}`)}
       ${e.notas ? `<p style="margin:16px 0 6px">Lo que te cuenta:</p>${cita(escapar(e.notas))}` : ""}
       ${boton(`${env.sitio}/admin/correccion`, "Ver el encargo y descargar el texto")}
       <p style="color:#5b4f45;font-size:15px">Cuando le devuelvas el texto corregido (respondiendo este correo), aprieta «Marcar como entregado».</p>`,
      e.correo,
    ),
    enviar(
      [e.correo],
      `Recibimos tu encargo de corrección #${e.numero}`,
      `<p style="font-size:22px;margin:0 0 16px">¡Gracias, ${escapar(e.nombre.split(" ")[0])}!</p>
       <p>Tu pago fue recibido. ${escapar(autor)} ya tiene tu texto y te lo devolverá corregido a este correo.</p>
       <p style="margin:16px 0">${detalle}</p>
       <p style="color:#5b4f45;font-size:15px">Si quieres agregar algo, responde este correo.</p>`,
      correoAutor()[0],
    ),
  ]);
}
