import "server-only";

// Única puerta a las variables de entorno del servidor.

export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnon: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  sitio: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3110").replace(/\/$/, ""),
};

export const hayBase = () => Boolean(env.supabaseUrl && env.supabaseAnon);

export function exigir(nombre: keyof typeof env): string {
  const valor = env[nombre];
  if (!valor) throw new Error(`Falta la variable de entorno para «${nombre}». Ver .env.example.`);
  return valor;
}
