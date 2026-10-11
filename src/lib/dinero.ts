/** Pesos chilenos sin decimales: 15000 → «$15.000». */
export function formatoCLP(n: number): string {
  return "$" + Math.round(n).toLocaleString("es-CL");
}

export const REGIONES = [
  "Arica y Parinacota",
  "Tarapacá",
  "Antofagasta",
  "Atacama",
  "Coquimbo",
  "Valparaíso",
  "Metropolitana de Santiago",
  "Libertador General Bernardo O'Higgins",
  "Maule",
  "Ñuble",
  "Biobío",
  "La Araucanía",
  "Los Ríos",
  "Los Lagos",
  "Aysén",
  "Magallanes y Antártica Chilena",
];
