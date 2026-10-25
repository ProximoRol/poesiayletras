"use client";

/** Botón de envío que pide confirmación antes (para borrar). `accion` reemplaza la del formulario. */
export function BotonConfirmar({ pregunta, children, accion, clase = "boton-texto" }: {
  pregunta: string;
  children: React.ReactNode;
  accion?: (form: FormData) => void | Promise<void>;
  clase?: string;
}) {
  return (
    <button type="submit" className={clase} formAction={accion} onClick={(e) => { if (!confirm(pregunta)) e.preventDefault(); }}>
      {children}
    </button>
  );
}
