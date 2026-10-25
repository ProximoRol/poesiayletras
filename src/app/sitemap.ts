import type { MetadataRoute } from "next";
import { textosPublicados } from "@/server/datos";
import { env } from "@/server/env";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const textos = await textosPublicados();
  const fijas = ["", "/textos", "/libros", "/sobre-mi", "/correccion", "/tienda"].map((r) => ({ url: `${env.sitio}${r}` }));
  return [...fijas, ...textos.map((t) => ({ url: `${env.sitio}/textos/${t.slug}`, lastModified: t.actualizado_en }))];
}
