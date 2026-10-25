import "server-only";

import { revalidatePath } from "next/cache";
import { avisarEncargoPagado, avisarPedidoPagado, type PedidoCorreo } from "./avisos";
import { perfil } from "./datos";
import { leerEstado } from "./flow";
import { servicio } from "./supabase";
import type { Encargo } from "./tipos";

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

/** Para la página de vuelta del encargo: el id es un UUID imposible de adivinar. */
export async function encargoPorId(id: string): Promise<Encargo | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const { data } = await servicio().from("encargos").select("*").eq("id", id).maybeSingle();
  return data as Encargo | null;
}

/** A dónde vuelve el comprador: su pedido de la tienda o su encargo de corrección. */
export type ResultadoPago = { ruta: string; estado: "pagado" | "pendiente" | "rechazado" };

/**
 * Confirma un pago leyéndolo directo a Flow con el token (nunca se confía en lo que diga el
 * aviso o la URL). Si está pagado y cubre el total, marca pagado el pedido (y descuenta stock)
 * o el encargo de corrección (orden «E-<id>»), y avisa por correo — una sola vez aunque Flow
 * repita el aviso.
 */
export async function procesarPago(token: string): Promise<ResultadoPago> {
  const pago = await leerEstado(token);
  const esEncargo = pago.commerceOrder.startsWith("E-");
  const id = esEncargo ? pago.commerceOrder.slice(2) : pago.commerceOrder;
  const ruta = esEncargo ? `/encargo/${id}` : `/pedido/${id}`;
  if (pago.status === 3 || pago.status === 4) return { ruta, estado: "rechazado" };
  if (pago.status !== 2 || pago.currency !== "CLP") return { ruta, estado: "pendiente" };

  const monto = Math.floor(Number(pago.amount));
  const { data: primeraVez, error } = esEncargo
    ? await servicio().rpc("confirmar_pago_encargo", { p_encargo: id, p_pago: String(pago.flowOrder), p_monto: monto })
    : await servicio().rpc("confirmar_pago", { p_pedido: id, p_pago: String(pago.flowOrder), p_monto: monto });
  if (error) throw error;
  if (primeraVez) {
    const autor = (await perfil()).nombre;
    if (esEncargo) {
      const encargo = await encargoPorId(id);
      if (encargo) await avisarEncargoPagado(encargo, autor);
    } else {
      revalidatePath("/", "layout"); // stock nuevo en la tienda
      const pedido = await pedidoPorId(id);
      if (pedido) await avisarPedidoPagado(pedido, autor);
    }
  }
  return { ruta, estado: "pagado" };
}
