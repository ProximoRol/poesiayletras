import "server-only";

import { revalidatePath } from "next/cache";
import { avisarPedidoPagado, type PedidoCorreo } from "./avisos";
import { perfil } from "./datos";
import { leerEstado } from "./flow";
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

export type ResultadoPago = { pedidoId: string; estado: "pagado" | "pendiente" | "rechazado" };

/**
 * Confirma un pago leyéndolo directo a Flow con el token (nunca se confía en lo que diga el
 * aviso o la URL). Si está pagado y cubre el total, marca el pedido pagado, descuenta stock y
 * avisa por correo — una sola vez aunque Flow repita el aviso.
 */
export async function procesarPago(token: string): Promise<ResultadoPago> {
  const pago = await leerEstado(token);
  const pedidoId = pago.commerceOrder;
  if (pago.status === 3 || pago.status === 4) return { pedidoId, estado: "rechazado" };
  if (pago.status !== 2 || pago.currency !== "CLP") return { pedidoId, estado: "pendiente" };

  const { data: primeraVez, error } = await servicio().rpc("confirmar_pago", {
    p_pedido: pedidoId,
    p_pago: String(pago.flowOrder),
    p_monto: Math.floor(Number(pago.amount)),
  });
  if (error) throw error;
  if (primeraVez) {
    revalidatePath("/", "layout"); // stock nuevo en la tienda
    const pedido = await pedidoPorId(pedidoId);
    if (pedido) await avisarPedidoPagado(pedido, (await perfil()).nombre);
  }
  return { pedidoId, estado: "pagado" };
}
