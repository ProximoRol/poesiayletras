import { describe, expect, it } from "vitest";
import { dominioReferente, embudo, grupoCanal, porCanal, reboto, resumenSesiones, utmDesdeClic, type Sesion } from "./analitica";

const sesion = (extra: Partial<Sesion> = {}): Sesion => ({
  sesion_id: "s1", visitante_id: "v1", inicio: "2026-10-25T10:00:00Z", fin: "2026-10-25T10:01:00Z",
  utm_source: null, utm_medium: null, campana: null, palabra_clave: null, referente: null, entrada: "/", pais: "CL",
  dispositivo: "movil", nuevo: true, paginas: 1, rutas: 1, ms: 0, scroll: 0, textos: [], textos_enteros: [], leyo: false, leyo_entero: false,
  vio_oferta: false, interactuo: false, whatsapp: false, comento: false, quiso: false, fue_a_pagar: false, compra: false,
  pedidos: 0, ingresos: 0, acciones: [], ...extra,
});

describe("canales", () => {
  it("clasifica por referente y por utm", () => {
    expect(grupoCanal("l.instagram.com", null)).toEqual({ fuente: "Instagram", grupo: "redes" });
    expect(grupoCanal("google.cl", null).grupo).toBe("organico");
    expect(grupoCanal("google", "cpc").grupo).toBe("anuncios");
    expect(grupoCanal("chatgpt.com", null).grupo).toBe("ia");
    expect(grupoCanal(null, null)).toEqual({ fuente: "Directo", grupo: "directo" });
    expect(grupoCanal("revistaliteraria.cl", null).grupo).toBe("referido");
  });

  it("un gclid sin utm cuenta como anuncio de Google; fbclid no", () => {
    expect(utmDesdeClic(new URLSearchParams("gclid=abc"))).toEqual({ utm_source: "google", utm_medium: "cpc" });
    expect(utmDesdeClic(new URLSearchParams("fbclid=abc"))).toBeNull();
    expect(utmDesdeClic(new URLSearchParams("gclid=abc&utm_source=x"))).toBeNull();
  });

  it("guarda solo el dominio del referente, y nada si es la propia página", () => {
    expect(dominioReferente("https://www.google.com/search?q=wagner", "wagnerperezeulufi.com")).toBe("google.com");
    expect(dominioReferente("https://wagnerperezeulufi.com/textos", "wagnerperezeulufi.com")).toBeNull();
    expect(dominioReferente("no es url", "x.com")).toBeNull();
  });
});

describe("sesiones", () => {
  it("rebote: una página, menos de 10 s y sin tocar nada", () => {
    expect(reboto(sesion({ ms: 4000 }))).toBe(true);
    expect(reboto(sesion({ ms: 15000 }))).toBe(false);
    expect(reboto(sesion({ ms: 2000, interactuo: true }))).toBe(false);
    expect(reboto(sesion({ ms: 2000, rutas: 2 }))).toBe(false);
  });

  it("embudo abierto con porcentajes del total y del paso anterior", () => {
    const lista = [sesion({ ms: 60000, leyo: true }), sesion({ ms: 1000 }), sesion({ ms: 90000, leyo: true, vio_oferta: true, quiso: true, fue_a_pagar: true, compra: true })];
    const pasos = embudo(lista);
    expect(pasos[0].n).toBe(3);
    expect(pasos.find((p) => p.clave === "quedaron")!.n).toBe(2);
    expect(pasos.find((p) => p.clave === "leyeron")!.delPrevio).toBe(1);
    expect(pasos.at(-1)!.n).toBe(1);
  });

  it("tiempo: mediana solo de las visitas que no rebotaron; personas distintas", () => {
    const r = resumenSesiones([sesion({ ms: 20000 }), sesion({ ms: 40000, visitante_id: "v2" }), sesion({ ms: 1000 })]);
    expect(r.tiempoMediano).toBe(30000);
    expect(r.personas).toBe(2);
    expect(r.rebote).toBeCloseTo(1 / 3);
  });

  it("agrupa por canal con sus fuentes", () => {
    const g = porCanal([sesion({ referente: "instagram.com" }), sesion({ referente: "l.instagram.com" }), sesion()]);
    expect(g.map((x) => x.grupo)).toEqual(["redes", "directo"]);
    expect(g[0].fuentes).toEqual([["Instagram", 2]]);
  });
});
