// Corrección literaria: unidades de cobro, archivos aceptados y estados de los encargos.
// Sin dependencias de servidor: lo usan la página pública, el formulario y el panel.

export type Unidad = "poema" | "pagina" | "fijo";
export const esUnidad = (v: unknown): v is Unidad => v === "poema" || v === "pagina" || v === "fijo";

export const UNIDADES: Record<Unidad, { por: string; uno: string; varios: string; pregunta: string }> = {
  poema: { por: "/ poema", uno: "poema", varios: "poemas", pregunta: "¿Cuántos poemas son?" },
  pagina: { por: "/ página", uno: "página", varios: "páginas", pregunta: "¿Cuántas páginas son?" },
  fijo: { por: "", uno: "", varios: "", pregunta: "" },
};

export const cantidadTexto = (unidad: Unidad, n: number) =>
  unidad === "fijo" ? "" : `${n} ${n === 1 ? UNIDADES[unidad].uno : UNIDADES[unidad].varios}`;

/** Archivos que se aceptan del cliente (Word, PDF, OpenOffice, texto). Máximo 4 MB: el
 *  servidor de Vercel no recibe más de 4,5 MB por envío. */
export const ARCHIVO_MAX = 4 * 1024 * 1024;
export const EXTENSIONES = [".doc", ".docx", ".pdf", ".odt", ".rtf", ".txt"];

export const ESTADOS_ENCARGO = {
  pendiente_pago: { texto: "Sin pagar", clase: "borrador" },
  pagado: { texto: "Por corregir", clase: "pendiente" },
  entregado: { texto: "Entregado", clase: "publicado" },
  cancelado: { texto: "Cancelado", clase: "borrador" },
} as const;
export type EstadoEncargo = keyof typeof ESTADOS_ENCARGO;
