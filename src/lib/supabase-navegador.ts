"use client";

import { createBrowserClient } from "@supabase/ssr";

// Cliente del navegador: solo para el panel (login y subida directa de imágenes al bucket,
// así no pasan por el servidor ni chocan con su límite de tamaño).
export function supabaseNavegador() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "");
}
