"use client";

import { useActionState, useState } from "react";
import { esUnidad, type Unidad } from "@/lib/correccion";
import { guardarServicio, type Resultado } from "@/server/panel/acciones";
import type { Servicio } from "@/server/tipos";

export function FormServicio({ plan }: { plan: Servicio | null }) {
  const [estado, enviar, guardando] = useActionState<Resultado, FormData>(guardarServicio, null);
  const [unidad, setUnidad] = useState<Unidad>(plan?.unidad ?? "poema");

  return (
    <form action={enviar} className="form-panel">
      {plan && <input type="hidden" name="id" value={plan.id} />}
      <div className="caja form-panel">
        <label className="campo">
          <span>Nombre del plan</span>
          <input type="text" name="nombre" required maxLength={80} defaultValue={plan?.nombre} placeholder="Ej.: Poema suelto" />
        </label>
        <label className="campo">
          <span>Descripción corta</span>
          <textarea name="descripcion" rows={2} maxLength={400} defaultValue={plan?.descripcion} />
        </label>
        <label className="campo">
          <span>Qué incluye <small>· una cosa por línea</small></span>
          <textarea name="incluye" rows={5} defaultValue={plan?.incluye.join("\n")} />
        </label>
      </div>

      <div className="caja form-panel">
        <div className="dos-col">
          <label className="campo">
            <span>¿Cómo se cobra?</span>
            <select name="unidad" value={unidad} onChange={(e) => esUnidad(e.target.value) && setUnidad(e.target.value)}>
              <option value="poema">Por poema</option>
              <option value="pagina">Por página</option>
              <option value="fijo">Precio fijo</option>
            </select>
          </label>
          <label className="campo">
            <span>Precio en pesos <small>· vacío = se consulta por WhatsApp</small></span>
            <input type="text" name="precio" inputMode="numeric" defaultValue={plan?.precio ?? ""} placeholder="Ej.: 5000" />
          </label>
        </div>
        {unidad !== "fijo" && (
          <label className="campo" style={{ maxWidth: 260 }}>
            <span>Mínimo de {unidad === "poema" ? "poemas" : "páginas"}</span>
            <input type="number" name="minimo" min={1} max={500} defaultValue={plan?.minimo ?? 1} />
          </label>
        )}
        <label className="campo">
          <span>Nota bajo el precio <small>· opcional, ej. «Hasta 40 versos»</small></span>
          <input type="text" name="nota" maxLength={120} defaultValue={plan?.nota} />
        </label>
      </div>

      <div className="barra-guardar">
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="checkbox" name="visible" defaultChecked={plan?.visible ?? true} /> Mostrar en mi página
        </label>
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="checkbox" name="destacado" defaultChecked={plan?.destacado ?? false} /> Marcar como «Más elegido»
        </label>
        <button type="submit" className="btn btn-primary" disabled={guardando}>{guardando ? "Guardando…" : "Guardar plan"}</button>
        {estado?.ok && estado.aviso && <span className="aviso exito">{estado.aviso}</span>}
        {estado && !estado.ok && <span className="aviso error">{estado.error}</span>}
      </div>
    </form>
  );
}
