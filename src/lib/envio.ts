// Envío del libro: gratis en Chile continental. A la Región de Magallanes (incluye la Antártica
// Chilena) y a Isla de Pascua va por pagar: lo paga quien recibe (decisión de Wagner, 26-oct).

export const ENVIO_GRATIS = "Envío gratis a todo Chile continental, excepto la Región de Magallanes.";
export const ENVIO_EXCEPCION = "A Magallanes e Isla de Pascua el envío es por pagar: lo pagas al recibirlo.";

const MAGALLANES = /magallanes|ant[aá]rtica/i;
const RAPA_NUI = /pascua|rapa\s*nui|hanga\s*roa/i;

/** ¿El envío a esta dirección lo paga quien recibe? */
export function envioPorPagar(region: string | null | undefined, comuna: string | null | undefined): boolean {
  return MAGALLANES.test(region ?? "") || RAPA_NUI.test(comuna ?? "");
}
