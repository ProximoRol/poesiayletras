import "server-only";

// Única puerta a las variables de entorno del servidor.

export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnon: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  // Solo para confirmar pagos (aviso de Flow y vuelta del pago). Nunca en el panel.
  supabaseServicio: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  // Cuenta de Flow del autor (flow.cl → Integración → Credenciales).
  flowApiKey: process.env.FLOW_API_KEY ?? "",
  flowSecreto: process.env.FLOW_SECRET_KEY ?? "",
  // https://sandbox.flow.cl/api para pruebas; en local, el Flow simulado (scripts/flow-falso.mjs).
  flowApi: (process.env.FLOW_API_URL ?? "https://www.flow.cl/api").replace(/\/$/, ""),
  sitio: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3110").replace(/\/$/, ""),
};

export const hayBase = () => Boolean(env.supabaseUrl && env.supabaseAnon);
/** Pagos activos: hace falta la cuenta de Flow y la clave para confirmar pedidos. */
export const hayPagos = () => Boolean(hayBase() && env.flowApiKey && env.flowSecreto && env.supabaseServicio);

export function exigir(nombre: keyof typeof env): string {
  const valor = env[nombre];
  if (!valor) throw new Error(`Falta la variable de entorno para «${nombre}». Ver .env.example.`);
  return valor;
}
