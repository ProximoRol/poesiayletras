"use server";

import { redirect } from "next/navigation";
import { REGIONES } from "@/lib/dinero";
import { visitaDelPago } from "./analitica";
import { perfil } from "./datos";
import { hayPagos } from "./env";
import { crearCobro, type ItemCobro } from "./flow";
import { publico, servicio } from "./supabase";

export type EstadoCompra = { ok: false; error: string } | null;

const ERRORES: Record<string, string> = {
  carro_invalido: "Tu carrito está vacío.",
  cantidad_invalida: "Revisa las cantidades del carrito.",
  producto_no_disponible: "Un producto de tu carrito ya no está disponible. Quítalo e inténtalo de nuevo.",
};

export async function comprar(_previo: EstadoCompra, form: FormData): Promise<EstadoCompra> {
  if (!hayPagos()) return { ok: false, error: "El pago en línea todavía no está activo. Escríbenos por WhatsApp." };

  const t = (c: string) => String(form.get(c) ?? "").trim();
  const datos = {
    nombre: t("nombre"),
    correo: t("correo"),
    telefono: t("telefono"),
    rut: t("rut"),
    direccion: t("direccion"),
    comuna: t("comuna"),
    region: t("region"),
    notas: t("notas").slice(0, 1000),
  };
  if (datos.nombre.length < 2) return { ok: false, error: "Escribe tu nombre completo." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(datos.correo)) return { ok: false, error: "Revisa tu correo: ahí te llega la confirmación." };
  if (datos.telefono.replace(/\D/g, "").length < 8) return { ok: false, error: "Escribe un teléfono de contacto." };
  if (datos.direccion.length < 3 || datos.comuna.length < 2) return { ok: false, error: "Escribe la dirección y la comuna de envío." };
  if (!REGIONES.includes(datos.region)) return { ok: false, error: "Elige la región." };

  let carro: { producto_id: string; cantidad: number }[];
  try {
    carro = JSON.parse(t("carro"));
    if (!Array.isArray(carro)) throw new Error();
  } catch {
    return { ok: false, error: "Tu carrito está vacío." };
  }

  const { data, error } = await publico().rpc("crear_pedido", { p_items: carro, p_datos: datos }).single<{ id: string; numero: number; total: number; items: ItemCobro[] }>();
  if (error || !data) {
    const clave = error?.message ?? "";
    if (clave.startsWith("sin_stock:")) return { ok: false, error: `No queda stock suficiente de «${clave.slice(10)}».` };
    return { ok: false, error: ERRORES[clave] ?? "No pudimos crear tu pedido. Inténtalo de nuevo." };
  }

  let url: string;
  try {
    const cobro = await crearCobro({ orden: data.id, asunto: `Pedido #${data.numero} · ${(await perfil()).nombre}`, total: data.total, correo: datos.correo });
    const visita = await visitaDelPago(form);
    await servicio().from("pedidos").update({ pago_token: cobro.token, visitante_id: visita.vid, sesion_id: visita.sid }).eq("id", data.id);
    url = cobro.url;
  } catch (e) {
    console.error("[comprar] Flow no respondió", e);
    return { ok: false, error: "No pudimos conectar con el sistema de pago. Inténtalo de nuevo en un momento." };
  }
  redirect(url);
}
