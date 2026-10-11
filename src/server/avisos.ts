import "server-only";

import { env } from "./env";

// Correo al autor cuando llega un comentario, con un botón que lo lleva directo a revisarlo.
// Usa la API de Resend sin dependencias. Sin RESEND_API_KEY o sin CORREO_AVISOS no hace nada:
// el comentario se guarda igual y aparece en el panel.

const escapar = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export async function avisarComentario(c: { nombre: string; cuerpo: string; tituloTexto: string }): Promise<void> {
  const clave = process.env.RESEND_API_KEY;
  const para = process.env.CORREO_AVISOS;
  const de = process.env.CORREO_REMITENTE ?? "Tu página <avisos@resend.dev>";
  if (!clave || !para) return;

  const enlace = `${env.sitio}/admin/comentarios`;
  const html = `
    <div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;color:#2e2620;font-size:18px;line-height:1.6">
      <p style="font-size:22px;margin:0 0 16px">Tienes un comentario nuevo 💬</p>
      <p style="margin:0 0 6px"><b>${escapar(c.nombre)}</b> comentó en <i>«${escapar(c.tituloTexto)}»</i>:</p>
      <blockquote style="margin:0 0 24px;padding:14px 18px;background:#f6efe3;border-left:4px solid #b8622f;white-space:pre-line">${escapar(c.cuerpo)}</blockquote>
      <p style="margin:0 0 28px">
        <a href="${enlace}" style="display:inline-block;background:#b8622f;color:#fff;text-decoration:none;padding:16px 28px;border-radius:100px;font-family:Arial,sans-serif;font-size:18px">Ver y aprobar el comentario</a>
      </p>
      <p style="color:#5b4f45;font-size:15px">No aparecerá en tu página hasta que lo apruebes.</p>
    </div>`;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${clave}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: de,
        to: para.split(",").map((s) => s.trim()).filter(Boolean),
        subject: `${c.nombre} comentó «${c.tituloTexto}»`,
        html,
      }),
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    // Un aviso que falla no debe impedir el comentario.
  }
}
