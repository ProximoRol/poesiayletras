import type { Pedido } from "@/server/tipos";

export const ESTADOS: Record<Pedido["estado"], { texto: string; clase: string }> = {
  pagado: { texto: "Por enviar", clase: "pendiente" },
  enviado: { texto: "Enviado", clase: "publicado" },
  pendiente_pago: { texto: "Sin pagar", clase: "borrador" },
  cancelado: { texto: "Cancelado", clase: "borrador" },
};
