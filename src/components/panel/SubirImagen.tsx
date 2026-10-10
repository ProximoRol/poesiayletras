"use client";

import { useState } from "react";
import { supabaseNavegador } from "@/lib/supabase-navegador";

// Sube la imagen directo del navegador al bucket «imagenes» y guarda la ruta en un campo oculto
// del formulario. La imagen queda asociada recién cuando se guarda el formulario.

const MAX_MB = 8;

export function SubirImagen({ nombre, inicial, urlBase, carpeta, etiqueta, ayuda, onCambio }: {
  nombre: string;
  inicial: string | null;
  urlBase: string;
  carpeta: string;
  etiqueta: string;
  ayuda?: string;
  onCambio?: () => void;
}) {
  const [ruta, setRuta] = useState(inicial ?? "");
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const vista = ruta ? (/^https?:\/\//.test(ruta) ? ruta : `${urlBase}/storage/v1/object/public/imagenes/${ruta}`) : null;

  async function elegir(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;
    setError(null);
    if (!/^image\/(jpeg|png|webp)$/.test(archivo.type)) return setError("Usa una foto JPG, PNG o WEBP.");
    if (archivo.size > MAX_MB * 1024 * 1024) return setError(`La imagen pesa más de ${MAX_MB} MB.`);
    setSubiendo(true);
    const ext = archivo.type === "image/png" ? "png" : archivo.type === "image/webp" ? "webp" : "jpg";
    const destino = `${carpeta}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabaseNavegador().storage.from("imagenes").upload(destino, archivo, { contentType: archivo.type, cacheControl: "31536000" });
    setSubiendo(false);
    if (error) return setError("No se pudo subir la imagen. Inténtalo de nuevo.");
    setRuta(destino);
    onCambio?.();
  }

  return (
    <div className="campo">
      <span>{etiqueta} {ayuda && <small>· {ayuda}</small>}</span>
      <input type="hidden" name={nombre} value={ruta} />
      <div className="subir">
        {vista && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={vista} alt="" />
        )}
        <label className="btn btn-ghost btn-chico" style={{ cursor: "pointer" }}>
          {subiendo ? "Subiendo…" : vista ? "Cambiar imagen" : "Elegir imagen"}
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={elegir} hidden disabled={subiendo} />
        </label>
        {vista && (
          <button type="button" className="boton-texto" onClick={() => { setRuta(""); onCambio?.(); }}>
            Quitar
          </button>
        )}
      </div>
      {error && <p className="aviso error">{error}</p>}
    </div>
  );
}
