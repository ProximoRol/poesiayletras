"use client";

import { useActionState, useEffect, useState } from "react";
import { Obra } from "@/components/Obra";
import { NUEVO_TEMA, type Formato, type Tema } from "@/domain/textos";
import { guardarTexto, type Resultado } from "@/server/panel/acciones";
import type { Texto } from "@/server/tipos";
import { SubirImagen } from "./SubirImagen";

export function EditorTexto({ texto, temas, urlBase, avisoInicial }: { texto: Texto | null; temas: Tema[]; urlBase: string; avisoInicial?: string }) {
  const [estado, enviar, guardando] = useActionState<Resultado, FormData>(guardarTexto, avisoInicial ? { ok: true, aviso: avisoInicial } : null);
  const [titulo, setTitulo] = useState(texto?.titulo ?? "");
  const [categoria, setCategoria] = useState(texto?.categoria ?? temas[0]?.slug ?? NUEVO_TEMA);
  const [formatoNuevo, setFormatoNuevo] = useState<Formato>("verso");
  const nuevo = categoria === NUEVO_TEMA;
  const formato: Formato = nuevo ? formatoNuevo : (temas.find((t) => t.slug === categoria)?.formato ?? "prosa");
  const [cuerpo, setCuerpo] = useState(texto?.cuerpo ?? "");
  const [vista, setVista] = useState(false);
  const [sucio, setSucio] = useState(false);
  const publicado = texto?.estado === "publicado";

  // Aviso al cerrar la pestaña con cambios sin guardar.
  useEffect(() => {
    if (!sucio) return;
    const avisar = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [sucio]);

  const marcar = () => setSucio(true);

  return (
    <form action={enviar} className="form-panel" onSubmit={() => setSucio(false)}>
      {texto && <input type="hidden" name="id" value={texto.id} />}

      <div className="caja form-panel">
        <label className="campo">
          <span>Título</span>
          <input className="input-titulo" type="text" name="titulo" required maxLength={200} value={titulo} onChange={(e) => { setTitulo(e.target.value); marcar(); }} placeholder="El título de tu texto" />
        </label>
        <label className="campo" style={{ maxWidth: 280 }}>
          <span>Tema</span>
          <select name="categoria" value={categoria} onChange={(e) => { setCategoria(e.target.value); marcar(); }}>
            {temas.map((t) => <option key={t.slug} value={t.slug}>{t.nombre}</option>)}
            <option value={NUEVO_TEMA}>＋ Otro tema…</option>
          </select>
        </label>
        {nuevo && (
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <label className="campo" style={{ flex: "1 1 220px", maxWidth: 320 }}>
              <span>Nombre del tema nuevo</span>
              <input type="text" name="tema_nombre" required maxLength={40} placeholder="Ej.: Crónica, Haiku, Memorias" onChange={marcar} />
            </label>
            <label className="campo" style={{ flex: "1 1 200px", maxWidth: 280 }}>
              <span>¿Cómo se escribe?</span>
              <select name="tema_formato" value={formatoNuevo} onChange={(e) => { setFormatoNuevo(e.target.value as Formato); marcar(); }}>
                <option value="verso">En versos (como un poema)</option>
                <option value="prosa">En párrafos (como un cuento)</option>
              </select>
            </label>
          </div>
        )}
      </div>

      <div className="caja form-panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontWeight: 600, fontSize: ".88rem" }}>{vista ? "Así lo verán tus lectores" : "Tu texto"}</span>
          <button type="button" className="btn btn-ghost btn-chico" onClick={() => setVista((v) => !v)}>
            {vista ? "← Volver a escribir" : "Ver cómo queda"}
          </button>
        </div>
        {/* El textarea sigue en el formulario aunque se muestre la vista previa. */}
        <textarea
          name="cuerpo"
          className="editor-texto"
          value={cuerpo}
          onChange={(e) => { setCuerpo(e.target.value); marcar(); }}
          placeholder={"Escribe aquí como en tu cuaderno.\n\nCada Enter es un verso nuevo.\nUna línea en blanco separa las estrofas."}
          hidden={vista}
        />
        {vista && (
          <div style={{ padding: "20px 0" }}>
            <h2 className="centro" style={{ fontSize: "2rem", marginBottom: 28 }}>{titulo || "Sin título"}</h2>
            {cuerpo.trim() ? <Obra cuerpo={cuerpo} formato={formato} /> : <p className="muted centro">Todavía no hay texto.</p>}
          </div>
        )}
        {!vista && (
          <p className="ayuda">
            <b>Consejos:</b> Enter = verso nuevo · línea en blanco = estrofa o párrafo nuevo · para <i>cursiva</i> escribe *así* · para <b>negrita</b>, **así**.
          </p>
        )}
      </div>

      <div className="caja">
        <SubirImagen nombre="imagen" inicial={texto?.imagen ?? null} urlBase={urlBase} carpeta="textos" etiqueta="Imagen (opcional)" ayuda="aparece arriba del texto y al compartirlo" onCambio={marcar} />
      </div>

      <div className="barra-guardar">
        {publicado ? (
          <>
            <button type="submit" name="accion" value="publicar" className="btn btn-primary" disabled={guardando}>{guardando ? "Guardando…" : "Guardar cambios"}</button>
            <a href={`/textos/${texto!.slug}`} target="_blank" rel="noopener" className="btn btn-ghost">Ver en mi página ↗</a>
            <button type="submit" name="accion" value="borrador" className="boton-texto" disabled={guardando}>Retirar de la página</button>
          </>
        ) : (
          <>
            <button type="submit" name="accion" value="publicar" className="btn btn-primary" disabled={guardando}>{guardando ? "Guardando…" : "Publicar"}</button>
            <button type="submit" name="accion" value="borrador" className="btn btn-ghost" disabled={guardando}>Guardar borrador</button>
          </>
        )}
        {sucio && !guardando && <span className="muted" style={{ fontSize: ".86rem" }}>Hay cambios sin guardar</span>}
        {!sucio && estado?.ok && estado.aviso && <span className="aviso exito">{estado.aviso}</span>}
        {estado && !estado.ok && <span className="aviso error">{estado.error}</span>}
      </div>
    </form>
  );
}
