"use client";

import { useState } from "react";

export function Compartir({ url, titulo }: { url: string; titulo: string }) {
  const [copiado, setCopiado] = useState(false);
  const wa = `https://wa.me/?text=${encodeURIComponent(`${titulo} — ${url}`)}`;
  const fb = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      prompt("Copia este enlace:", url);
    }
  }

  return (
    <div className="compartir">
      <span>¿Te gustó? Compártelo:</span>
      <a className="btn btn-wa btn-chico" href={wa} target="_blank" rel="noopener noreferrer" data-track="compartir" data-track-red="whatsapp">WhatsApp</a>
      <a className="btn btn-ghost btn-chico" href={fb} target="_blank" rel="noopener noreferrer" data-track="compartir" data-track-red="facebook">Facebook</a>
      <button type="button" className="btn btn-ghost btn-chico" onClick={copiar} data-track="compartir" data-track-red="copiar_enlace">{copiado ? "¡Enlace copiado!" : "Copiar enlace"}</button>
    </div>
  );
}
