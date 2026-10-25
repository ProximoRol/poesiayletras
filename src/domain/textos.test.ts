import { describe, expect, it } from "vitest";
import { aSlug, bloques, extracto, slugLibre, tramos } from "./textos";

describe("aSlug", () => {
  it("quita tildes, eñes y signos", () => {
    expect(aSlug("¿Canción del árbol? ¡Otra vez, niño!")).toBe("cancion-del-arbol-otra-vez-nino");
  });
  it("nunca queda vacío", () => expect(aSlug("¡¿?!")).toBe("texto"));
});

describe("slugLibre", () => {
  it("numera si ya existe", () => {
    expect(slugLibre("mar", [])).toBe("mar");
    expect(slugLibre("mar", ["mar", "mar-2"])).toBe("mar-3");
  });
});

describe("formato", () => {
  it("separa estrofas por línea en blanco y versos por salto", () => {
    const b = bloques("Uno\nDos\n\n\nTres\r\n");
    expect(b).toHaveLength(2);
    expect(b[0]).toHaveLength(2);
    expect(b[1][0]).toEqual([{ t: "Tres" }]);
  });
  it("cursiva y negrita", () => {
    expect(tramos("el *mar* y **la sal**")).toEqual([
      { t: "el " },
      { t: "mar", cursiva: true },
      { t: " y " },
      { t: "la sal", negrita: true },
    ]);
  });
  it("un asterisco suelto queda tal cual", () => expect(tramos("3 * 4")).toEqual([{ t: "3 * 4" }]));
});

describe("extracto", () => {
  it("en poesía guarda los primeros versos", () => {
    expect(extracto("a\nb\nc\nd\ne", "verso")).toBe("a\nb\nc\nd…");
  });
  it("en prosa corta por palabra", () => {
    const e = extracto("palabra ".repeat(60), "prosa", 50);
    expect(e.endsWith("…")).toBe(true);
    expect(e.length).toBeLessThanOrEqual(51);
  });
});
