"use client";

import { useActionState } from "react";
import { guardarPerfil, type Resultado } from "@/server/panel/acciones";
import type { Perfil } from "@/server/tipos";
import { SubirImagen } from "./SubirImagen";

export function FormPerfil({ perfil, urlBase }: { perfil: Perfil; urlBase: string }) {
  const [estado, enviar, guardando] = useActionState<Resultado, FormData>(guardarPerfil, null);

  return (
    <form action={enviar} className="form-panel">
      <div className="caja form-panel">
        <SubirImagen nombre="foto" inicial={perfil.foto} urlBase={urlBase} carpeta="perfil" etiqueta="Tu foto" ayuda="aparece en la portada y en «Sobre mí»" />
        <label className="campo">
          <span>Tu nombre de autor</span>
          <input type="text" name="nombre" required defaultValue={perfil.nombre} />
        </label>
        <label className="campo">
          <span>Frase corta <small>· aparece al pie de la página</small></span>
          <input type="text" name="frase" maxLength={160} defaultValue={perfil.frase} />
        </label>
        <label className="campo">
          <span>Presentación <small>· 1 o 2 líneas, en la portada junto a tu nombre</small></span>
          <textarea name="presentacion" rows={3} defaultValue={perfil.presentacion} />
        </label>
        <label className="campo">
          <span>Sobre mí <small>· tu historia, para la página «Sobre mí». Línea en blanco = párrafo nuevo</small></span>
          <textarea name="biografia" rows={8} defaultValue={perfil.biografia} />
        </label>
      </div>

      <div className="caja form-panel">
        <span style={{ fontWeight: 600, fontSize: ".88rem" }}>Contacto y redes <small className="muted">· deja vacío lo que no uses</small></span>
        <div className="dos-col">
          <label className="campo">
            <span>WhatsApp <small>· con código de país, ej. 56912345678</small></span>
            <input type="tel" name="whatsapp" defaultValue={perfil.whatsapp ?? ""} />
          </label>
          <label className="campo">
            <span>Correo</span>
            <input type="email" name="correo" defaultValue={perfil.correo ?? ""} />
          </label>
          <label className="campo">
            <span>Instagram <small>· enlace completo</small></span>
            <input type="url" name="instagram" placeholder="https://www.instagram.com/…" defaultValue={perfil.instagram ?? ""} />
          </label>
          <label className="campo">
            <span>Facebook <small>· enlace completo</small></span>
            <input type="url" name="facebook" placeholder="https://www.facebook.com/…" defaultValue={perfil.facebook ?? ""} />
          </label>
        </div>
      </div>

      <div className="caja">
        <label style={{ display: "flex", gap: 12, alignItems: "flex-start", cursor: "pointer" }}>
          <input type="checkbox" name="moderar_comentarios" defaultChecked={perfil.moderar_comentarios} style={{ width: 22, height: 22, marginTop: 4 }} />
          <span>
            <b>Revisar los comentarios antes de que se publiquen</b>
            <br />
            <small className="muted">Si lo dejas sin marcar, los comentarios aparecen al instante y tú puedes borrar los que no te gusten.</small>
          </span>
        </label>
      </div>

      <div className="barra-guardar">
        <button type="submit" className="btn btn-primary" disabled={guardando}>{guardando ? "Guardando…" : "Guardar"}</button>
        {estado?.ok && estado.aviso && <span className="aviso exito">{estado.aviso}</span>}
        {estado && !estado.ok && <span className="aviso error">{estado.error}</span>}
      </div>
    </form>
  );
}
