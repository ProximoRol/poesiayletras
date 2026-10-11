import type { Metadata } from "next";
import { hayBase } from "@/server/env";
import { FormLogin } from "./FormLogin";

export const metadata: Metadata = { title: "Entrar al panel", robots: { index: false } };

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string; volver?: string }> }) {
  const { error, volver } = await searchParams;
  // Solo rutas del panel: nunca a otro sitio.
  const destino = volver && /^\/admin(\/[\w-]*)*$/.test(volver) ? volver : "/admin";
  return (
    <div className="panel">
      <div className="login">
        <span className="eyebrow">Tu página</span>
        <h1 className="serif" style={{ fontSize: "2.2rem", margin: "10px 0 24px" }}>Entrar para escribir</h1>
        <div className="caja">
          <FormLogin destino={destino} hayBase={hayBase()} noAdmin={error === "no_admin"} enlaceVencido={error === "enlace"} />
        </div>
      </div>
    </div>
  );
}
