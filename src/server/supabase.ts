import "server-only";

import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { env, exigir } from "./env";

// Dos clientes. No hay clave de servicio: todo pasa por RLS.
//  · publico()  — anónimo, sin cookies: lo que ve cualquier lector (cacheable).
//  · usuario()  — con la sesión del autor: el panel.

let _publico: SupabaseClient | null = null;
export function publico(): SupabaseClient {
  _publico ??= createClient(exigir("supabaseUrl"), exigir("supabaseAnon"), {
    auth: { persistSession: false },
  });
  return _publico;
}

export async function usuario(): Promise<SupabaseClient> {
  const almacen = await cookies();
  return createServerClient(exigir("supabaseUrl"), exigir("supabaseAnon"), {
    cookies: {
      getAll: () => almacen.getAll(),
      setAll: (lista) => {
        try {
          for (const { name, value, options } of lista) almacen.set(name, value, options);
        } catch {
          // Llamado desde un Server Component: el proxy ya refresca la sesión.
        }
      },
    },
  });
}

/** URL pública de una imagen del bucket «imagenes» (o la URL tal cual si ya es completa). */
export function urlImagen(ruta: string | null | undefined): string | null {
  if (!ruta) return null;
  if (/^https?:\/\//.test(ruta) || ruta.startsWith("/")) return ruta;
  return `${env.supabaseUrl}/storage/v1/object/public/imagenes/${ruta}`;
}
