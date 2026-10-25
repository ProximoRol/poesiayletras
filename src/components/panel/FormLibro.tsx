"use client";

import { useActionState, useState } from "react";
import { guardarLibro, type Resultado } from "@/server/panel/acciones";
import type { EnlaceCompra, Libro } from "@/server/tipos";
import { SubirImagen } from "./SubirImagen";

const SUGERIDAS = ["Amazon", "Buscalibre", "Mercado Libre", "Google Play Libros", "Librería"];

export function FormLibro({ libro, urlBase }: { libro: Libro | null; urlBase: string }) {
  const [estado, enviar, guardando] = useActionState<Resultado, FormData>(guardarLibro, null);
  const [enlaces, setEnlaces] = useState<EnlaceCompra[]>(libro?.enlaces.length ? libro.enlaces : [{ tienda: "Amazon", url: "" }]);

  return (
    <form action={enviar} className="form-panel">
      {libro && <input type="hidden" name="id" value={libro.id} />}
      <div className="caja form-panel">
        <div className="dos-col">
          <label className="campo">
            <span>Título del libro</span>
            <input type="text" name="titulo" required defaultValue={libro?.titulo} />
          </label>
          <label className="campo">
            <span>Subtítulo <small>· opcional, ej. «Poemas»</small></span>
            <input type="text" name="subtitulo" defaultValue={libro?.subtitulo} />
          </label>
        </div>
        <label className="campo" style={{ maxWidth: 160 }}>
          <span>Año</span>
          <input type="number" name="anio" min={1900} max={2100} defaultValue={libro?.anio ?? ""} />
        </label>
        <label className="campo">
          <span>De qué trata</span>
          <textarea name="sinopsis" rows={5} defaultValue={libro?.sinopsis} />
        </label>
        <SubirImagen nombre="portada" inicial={libro?.portada ?? null} urlBase={urlBase} carpeta="libros" etiqueta="Portada" ayuda="foto vertical de la tapa" />
      </div>

      <div className="caja form-panel">
        <span style={{ fontWeight: 600, fontSize: ".88rem" }}>Dónde comprarlo</span>
        <datalist id="tiendas">{SUGERIDAS.map((s) => <option key={s} value={s} />)}</datalist>
        {enlaces.map((e, i) => (
          <div key={i} className="dos-col" style={{ gridTemplateColumns: "200px 1fr auto", alignItems: "end" }}>
            <label className="campo">
              <span>Tienda</span>
              <input type="text" name="enlace_tienda" list="tiendas" defaultValue={e.tienda} />
            </label>
            <label className="campo">
              <span>Enlace</span>
              <input type="url" name="enlace_url" placeholder="https://…" defaultValue={e.url} />
            </label>
            <button type="button" className="boton-texto" style={{ paddingBottom: 12 }} onClick={() => setEnlaces((l) => l.filter((_, j) => j !== i))}>Quitar</button>
          </div>
        ))}
        <div>
          <button type="button" className="btn btn-ghost btn-chico" onClick={() => setEnlaces((l) => [...l, { tienda: "", url: "" }])}>+ Agregar otra tienda</button>
        </div>
      </div>

      <div className="barra-guardar">
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="checkbox" name="visible" defaultChecked={libro?.visible ?? true} /> Mostrar en mi página
        </label>
        <button type="submit" className="btn btn-primary" disabled={guardando}>{guardando ? "Guardando…" : "Guardar libro"}</button>
        {estado?.ok && estado.aviso && <span className="aviso exito">{estado.aviso}</span>}
        {estado && !estado.ok && <span className="aviso error">{estado.error}</span>}
      </div>
    </form>
  );
}
