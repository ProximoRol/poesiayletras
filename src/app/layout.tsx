import type { Metadata } from "next";
import { Cormorant_Garamond, Fraunces, Inter } from "next/font/google";
import { env } from "@/server/env";
import "./globals.css";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--fuente-fraunces", weight: ["400", "500", "600"] });
const cormorant = Cormorant_Garamond({ subsets: ["latin"], variable: "--fuente-cormorant", weight: ["400", "500", "600"], style: ["normal", "italic"] });
const inter = Inter({ subsets: ["latin"], variable: "--fuente-inter" });

export const metadata: Metadata = {
  metadataBase: new URL(env.sitio),
  title: { default: "Wagner Pérez Eulufí · Poesía", template: "%s · Wagner Pérez Eulufí" },
  description: "Poemas, cuentos y reflexiones de Wagner Pérez Eulufí. Lee, comenta y conoce sus libros.",
  openGraph: { type: "website", locale: "es_CL", siteName: "Wagner Pérez Eulufí" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${fraunces.variable} ${cormorant.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
