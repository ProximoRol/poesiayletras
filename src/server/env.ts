import "server-only";

// Única puerta a las variables de entorno del servidor.

export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnon: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  // Solo para confirmar pagos (aviso de Mercado Pago y página de vuelta). Nunca en el panel.
  supabaseServicio: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  mpToken: process.env.MERCADOPAGO_ACCESS_TOKEN ?? "",
  mpSecreto: process.env.MERCADOPAGO_WEBHOOK_SECRET ?? "",
  // Solo para pruebas locales con un Mercado Pago simulado (scripts/mp-falso.mjs).
  mpApi: (process.env.MERCADOPAGO_API_URL ?? "https://api.mercadopago.com").replace(/\/$/, ""),
  sitio: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3110").replace(/\/$/, ""),
};

export const hayBase = () => Boolean(env.supabaseUrl && env.supabaseAnon);
/** Pagos activos: hace falta la cuenta de Mercado Pago y la clave para confirmar pedidos. */
export const hayPagos = () => Boolean(hayBase() && env.mpToken && env.supabaseServicio);

export function exigir(nombre: keyof typeof env): string {
  const valor = env[nombre];
  if (!valor) throw new Error(`Falta la variable de entorno para «${nombre}». Ver .env.example.`);
  return valor;
}
