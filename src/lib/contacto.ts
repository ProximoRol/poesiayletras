/** Enlace de WhatsApp con mensaje listo. Sin número configurado devuelve null. */
export function enlaceWhatsApp(numero: string | null | undefined, mensaje: string): string | null {
  const limpio = (numero ?? "").replace(/[^\d]/g, "");
  if (!limpio) return null;
  return `https://wa.me/${limpio}?text=${encodeURIComponent(mensaje)}`;
}

export function fechaLarga(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Santiago" });
}
