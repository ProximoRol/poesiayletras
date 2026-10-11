"use client";

import { useActionState } from "react";
import { guardarProducto, type Resultado } from "@/server/panel/acciones";
import type { Producto } from "@/server/tipos";
import { SubirImagen } from "./SubirImagen";

export function FormProducto({ producto, libros, urlBase }: { producto: Producto | null; libros: { id: string; titulo: string }[]; urlBase: string }) {
  const [estado, enviar, guardando] = useActionState<Resultado, FormData>(guardarProducto, null);

  return (
    <form action={enviar} className="form-panel">
      {producto && <input type="hidden" name="id" value={producto.id} />}
      <div className="caja form-panel">
        <label className="campo">
          <span>Nombre</span>
          <input type="text" name="nombre" required maxLength={120} defaultValue={producto?.nombre} placeholder="Ej.: Cincuenta poemas del silencio" />
        </label>
        <div className="dos-col">
          <label className="campo">
            <span>Precio en pesos</span>
            <input type="text" inputMode="numeric" name="precio" required defaultValue={producto?.precio ?? ""} placeholder="15000" />
          </label>
          <label className="campo">
            <span>¿Cuántos tienes? <small>· déjalo vacío si no hay límite</small></span>
            <input type="text" inputMode="numeric" name="stock" defaultValue={producto?.stock ?? ""} />
          </label>
        </div>
        <label className="campo">
          <span>Descripción <small>· opcional</small></span>
          <textarea name="descripcion" rows={3} defaultValue={producto?.descripcion} />
        </label>
        {libros.length > 0 && (
          <label className="campo">
            <span>¿Es uno de tus libros? <small>· así aparece el botón «Comprar» junto al libro</small></span>
            <select name="libro_id" defaultValue={producto?.libro_id ?? ""}>
              <option value="">No</option>
              {libros.map((l) => <option key={l.id} value={l.id}>{l.titulo}</option>)}
            </select>
          </label>
        )}
        <SubirImagen nombre="foto" inicial={producto?.foto ?? null} urlBase={urlBase} carpeta="productos" etiqueta="Foto" ayuda="opcional" />
      </div>

      <div className="barra-guardar">
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="checkbox" name="visible" defaultChecked={producto?.visible ?? true} style={{ width: 20, height: 20 }} /> A la venta
        </label>
        <button type="submit" className="btn btn-primary" disabled={guardando}>{guardando ? "Guardando…" : "Guardar"}</button>
        {estado?.ok && estado.aviso && <span className="aviso exito">{estado.aviso}</span>}
        {estado && !estado.ok && <span className="aviso error">{estado.error}</span>}
      </div>
    </form>
  );
}
