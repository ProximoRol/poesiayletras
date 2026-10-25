import "server-only";

import { revalidatePath } from "next/cache";
import { avisarPedidoPagado, type PedidoCorreo } from "./avisos";
import { perfil } from "./datos";
import { leerPago } from "./mercadopago";
import { servicio } from "./supabase";

export interface PedidoPublico extends PedidoCorreo {
  estado: "pendiente_pago" | "pagado" | "enviado" | "cancelado";
}

const CAMPOS = "id, numero, estado, nombre, correo, telefono, rut, direccion, comuna, region, notas, items, total, seguimiento";

/** Para la página de vuelta del pago: el id es un UUID imposible de adivinar. */
export async function pedidoPorId(id: string): Promise<PedidoPublico | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const { data } = await servicio().from("pedidos").select(CAMPOS).eq("id", id).maybeSingle();
  return data as PedidoPublico | null;
}

/**
 * Confirma un pago leyéndolo directo a Mercado Pago (nunca se confía en lo que diga el aviso o
 * la URL). Si está aprobado y cubre el total, marca el pedido pagado, descuenta stock y avisa
 * por correo — una sola vez aunque Mercado Pago repita el aviso.
 */
export async function procesarPago(pagoId: string, { revalidar = true } = {}): Promise<void> {
  const pago = await leerPago(pagoId);
  if (pago.status !== "approved" || !pago.external_reference || pago.currency_id !== "CLP") return;

  const { data: primeraVez, error } = await servicio().rpc("confirmar_pago", {
    p_pedido: pago.external_reference,
    p_pago: String(pago.id),
    p_monto: Math.floor(pago.transaction_amount),
  });
  if (error) throw error;
  if (!primeraVez) return;

  // Stock nuevo en la tienda. No se puede revalidar mientras se dibuja una página (la de vuelta
  // del pago): ahí se actualiza sola en ≤5 min o con el aviso de Mercado Pago.
  if (revalidar) revalidatePath("/", "layout");
  const pedido = await pedidoPorId(pago.external_reference);
  if (pedido) await avisarPedidoPagado(pedido, (await perfil()).nombre);
}
