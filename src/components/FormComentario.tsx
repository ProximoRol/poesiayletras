"use client";

import { useActionState, useState } from "react";
import { comentar, type EstadoComentario } from "@/server/comentar";

export function FormComentario({ textoId, autor }: { textoId: string; autor: string }) {
  const [estado, enviar, enviando] = useActionState<EstadoComentario, FormData>(comentar, null);
  // Hora en que se abrió la página: si el envío llega demasiado rápido, es un robot.
  const [abierto] = useState(() => Date.now());

  if (estado?.ok) {
    return (
      <div className="form-comentario">
        <p className="aviso exito">
          {estado.publicado
            ? `¡Gracias por tu comentario! Ya está publicado y ${autor} lo va a leer.`
            : `¡Gracias por tu comentario! ${autor} lo leerá y aparecerá aquí cuando lo apruebe.`}
        </p>
      </div>
    );
  }

  return (
    <form action={enviar} className="form-comentario">
      <h3 className="serif" style={{ fontSize: "1.3rem" }}>Déjame tu comentario</h3>
      <input type="hidden" name="texto_id" value={textoId} />
      <input type="hidden" name="abierto" value={abierto} />
      <div className="trampa" aria-hidden>
        <label>
          Tu sitio web
          <input type="text" name="sitio" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <label className="campo">
        <span>Tu nombre</span>
        <input type="text" name="nombre" required maxLength={80} autoComplete="name" />
      </label>
      <label className="campo">
        <span>Comentario</span>
        <textarea name="cuerpo" required minLength={2} maxLength={3000} rows={4} />
      </label>
      {estado && !estado.ok && <p className="aviso error">{estado.error}</p>}
      <div>
        <button type="submit" className="btn btn-primary" disabled={enviando}>
          {enviando ? "Enviando…" : "Enviar comentario"}
        </button>
      </div>
      <small className="muted">No pedimos correo ni que crees una cuenta.</small>
    </form>
  );
}
