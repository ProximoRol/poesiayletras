"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabaseNavegador } from "@/lib/supabase-navegador";

export default function ElegirClave() {
  const router = useRouter();
  const [clave, setClave] = useState("");
  const [repetir, setRepetir] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (clave.length < 8) return setError("Usa al menos 8 caracteres.");
    if (clave !== repetir) return setError("Las dos contraseñas no coinciden.");
    setEnviando(true);
    const { error } = await supabaseNavegador().auth.updateUser({ password: clave });
    if (error) {
      setError("No se pudo guardar. Pide un enlace nuevo desde «Olvidé mi contraseña».");
      setEnviando(false);
      return;
    }
    router.replace("/admin");
    router.refresh();
  }

  return (
    <div className="panel">
      <div className="login">
        <span className="eyebrow">Bienvenido</span>
        <h1 className="serif" style={{ fontSize: "2.2rem", margin: "10px 0 24px" }}>Elige tu contraseña</h1>
        <form onSubmit={guardar} className="caja form-panel">
          <label className="campo">
            <span>Contraseña nueva</span>
            <input type="password" autoComplete="new-password" required value={clave} onChange={(e) => setClave(e.target.value)} />
          </label>
          <label className="campo">
            <span>Repítela</span>
            <input type="password" autoComplete="new-password" required value={repetir} onChange={(e) => setRepetir(e.target.value)} />
          </label>
          {error && <p className="aviso error">{error}</p>}
          <button type="submit" className="btn btn-primary" disabled={enviando}>{enviando ? "Guardando…" : "Guardar y entrar"}</button>
        </form>
      </div>
    </div>
  );
}
