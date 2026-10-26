import { describe, expect, it } from "vitest";
import { envioPorPagar } from "./envio";

describe("envío", () => {
  it("gratis en Chile continental", () => {
    expect(envioPorPagar("Maule", "Talca")).toBe(false);
    expect(envioPorPagar("Los Lagos", "Castro")).toBe(false);
    expect(envioPorPagar("Valparaíso", "Viña del Mar")).toBe(false);
  });
  it("por pagar a Magallanes e Isla de Pascua", () => {
    expect(envioPorPagar("Magallanes y Antártica Chilena", "Punta Arenas")).toBe(true);
    expect(envioPorPagar("Valparaíso", "Isla de Pascua")).toBe(true);
    expect(envioPorPagar("Valparaíso", "Hanga Roa")).toBe(true);
    expect(envioPorPagar("Valparaíso", "rapa nui")).toBe(true);
  });
});
