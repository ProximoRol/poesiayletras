"use client";

import { useReportWebVitals } from "next/web-vitals";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { capaDatos, esEquipo, rastrear } from "@/lib/rastreo";

// Medición de la página (rastrear() deja fuera a la familia y a los bots):
//  · page_view en cada cambio de ruta (la navegación de Next no recarga)
//  · scroll 25/50/75/100 % por página, cada umbral una sola vez
//  · tiempo real con la pestaña visible por página (engagement), anotado en ESA página
//  · clics en elementos con data-track="accion" (+ data-track-xxx como detalles)
//  · Web Vitals y errores de JavaScript
//  · Microsoft Clarity si hay NEXT_PUBLIC_CLARITY_ID (nunca para la familia)
//
// Para medir un clic nuevo NO hace falta tocar este archivo: basta con poner
// data-track="nombre_accion" (y data-track-detalle="valor") en el elemento.

const UMBRALES = [25, 50, 75, 100];

function reportarVital(m: { name: string; value: number; rating?: string }) {
  rastrear("web_vital", { datos: { nombre: m.name, valor: Math.round(m.value * 1000) / 1000, nota: m.rating ?? null } });
}

export function Instrumentacion({ clarityId }: { clarityId: string | null }) {
  const ruta = usePathname();
  useReportWebVitals(reportarVital);
  const [clarity, setClarity] = useState(false);

  // ── Visita, scroll y tiempo visible, reiniciados en cada página ─────────
  const alcanzado = useRef(new Set<number>());
  const visibleDesde = useRef<number | null>(null);
  const acumulado = useRef(0);

  useEffect(() => {
    rastrear("page_view");
    // GA4 vía GTM: 150 ms después, para que el título ya sea el de la página nueva.
    const t0 = setTimeout(() => capaDatos("page_view", { page_path: ruta, page_title: document.title }), 150);
    alcanzado.current = new Set();
    acumulado.current = 0;
    visibleDesde.current = document.visibilityState === "visible" ? performance.now() : null;

    const medirScroll = () => {
      const alto = document.documentElement.scrollHeight - window.innerHeight;
      const pct = alto <= 0 ? 100 : Math.round((window.scrollY / alto) * 100);
      for (const u of UMBRALES) {
        if (pct >= u && !alcanzado.current.has(u)) {
          alcanzado.current.add(u);
          rastrear("scroll", { datos: { pct: u } });
        }
      }
    };
    const cerrarTramo = () => {
      if (visibleDesde.current !== null) {
        acumulado.current += performance.now() - visibleDesde.current;
        visibleDesde.current = null;
      }
    };
    const enviarTiempo = () => {
      cerrarTramo();
      const ms = Math.round(acumulado.current);
      // Con la ruta de ESTA página: al navegar dentro de la app esto corre cuando la URL ya es la
      // siguiente (en Ugen el tiempo quedaba anotado en la página equivocada).
      if (ms >= 1000) rastrear("engagement", { ruta, datos: { ms: Math.min(ms, 30 * 60 * 1000) } });
      acumulado.current = 0;
    };
    const alCambiarVisibilidad = () => {
      if (document.visibilityState === "hidden") enviarTiempo();
      else visibleDesde.current = performance.now();
    };

    window.addEventListener("scroll", medirScroll, { passive: true });
    document.addEventListener("visibilitychange", alCambiarVisibilidad);
    window.addEventListener("pagehide", enviarTiempo);
    const t = setTimeout(medirScroll, 1500); // páginas cortas: ya están «leídas» enteras
    return () => {
      clearTimeout(t0);
      clearTimeout(t);
      window.removeEventListener("scroll", medirScroll);
      document.removeEventListener("visibilitychange", alCambiarVisibilidad);
      window.removeEventListener("pagehide", enviarTiempo);
      enviarTiempo(); // cambio de página dentro de la app
    };
  }, [ruta]);

  // ── Clics marcados y errores ──────────────────────────────────────────────
  useEffect(() => {
    // La cookie de la familia solo se puede leer en el navegador: se decide después de hidratar.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setClarity(Boolean(clarityId) && !esEquipo());
    const alClic = (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-track]");
      if (!el) return;
      const datos: Record<string, unknown> = { accion: el.dataset.track };
      for (const [k, v] of Object.entries(el.dataset)) {
        if (k.startsWith("track") && k !== "track") datos[k.slice(5, 6).toLowerCase() + k.slice(6)] = v;
      }
      rastrear("interaction", { datos });
      // Contacto por WhatsApp = un posible cliente: GA4 lo llama generate_lead.
      capaDatos(el.dataset.track === "whatsapp" ? "generate_lead" : "cta_click", { accion: el.dataset.track, ...datos });
    };
    const alError = (e: ErrorEvent) => rastrear("js_error", { datos: { mensaje: e.message, origen: `${e.filename}:${e.lineno}` } });
    const alRechazo = (e: PromiseRejectionEvent) => rastrear("js_error", { datos: { mensaje: String(e.reason?.message ?? e.reason) } });
    document.addEventListener("click", alClic, { capture: true });
    window.addEventListener("error", alError);
    window.addEventListener("unhandledrejection", alRechazo);
    return () => {
      document.removeEventListener("click", alClic, { capture: true });
      window.removeEventListener("error", alError);
      window.removeEventListener("unhandledrejection", alRechazo);
    };
  }, [clarityId]);

  // El <Script> NO puede llamarse id="clarity": el navegador expondría ese elemento como
  // window.clarity y el código de Clarity creería que ya está cargado (lección de Ugen).
  return clarity && clarityId ? (
    <Script id="pagina-clarity" strategy="afterInteractive">
      {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script",${JSON.stringify(clarityId)});`}
    </Script>
  ) : null;
}

/** Marca un evento al montarse (ver un texto, abrir un plan…), una sola vez por objeto. */
export function RastrearAlVer({ tipo, objeto, valor, capa }: { tipo: "text_view" | "service_view"; objeto: string; valor?: number; capa?: { evento: string; params?: Record<string, unknown>; ecommerce?: Record<string, unknown> } }) {
  useEffect(() => {
    rastrear(tipo, { objeto, valor });
    if (capa) capaDatos(capa.evento, capa.params, capa.ecommerce);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo, objeto]);
  return null;
}

/** Llegó al final del texto (el marcador entra en pantalla): text_read, una vez. */
export function FinDelTexto({ slug }: { slug: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) return;
    const obs = new IntersectionObserver((entradas) => {
      if (entradas.some((e) => e.isIntersecting)) {
        rastrear("text_read", { objeto: slug });
        capaDatos("text_read", { text_slug: slug });
        obs.disconnect();
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [slug]);
  return <span ref={ref} aria-hidden style={{ display: "block", height: 1 }} />;
}
