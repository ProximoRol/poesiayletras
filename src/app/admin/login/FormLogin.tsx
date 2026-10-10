"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabaseNavegador } from "@/lib/supabase-navegador";

export function FormLogin({ noAdmin, enlaceVencido, hayBase }: { noAdmin: boolean; enlaceVencido: boolean; hayBase: boolean }) {
  const router = useRouter();
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState<string | null>(
    noAdmin ? "Esa cuenta no tiene acceso al panel." : enlaceVencido ? "El enlace venció o ya se usó. Pide uno nuevo con «Olvidé mi contraseña»." : null,
  );
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (!hayBase) return <p className="aviso info">Falta conectar la base de datos. Ver docs/PUBLICAR.md.</p>;

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    const { error } = await supabaseNavegador().auth.signInWithPassword({ email: correo.trim(), password: clave });
    if (error) {
      setError("Correo o contraseña incorrectos.");
      setEnviando(false);
      return;
    }
    router.replace("/admin");
    router.refresh();
  }

  async function recuperar() {
    if (!correo.trim()) return setError("Escribe tu correo primero.");
    setError(null);
    await supabaseNavegador().auth.resetPasswordForEmail(correo.trim(), { redirectTo: `${location.origin}/admin/auth/confirmar` });
    setAviso("Si el correo tiene acceso, te llegó un enlace para crear una contraseña nueva. Revisa también la carpeta de spam.");
  }

  return (
    <form onSubmit={entrar} className="form-panel">
      <label className="campo">
        <span>Correo</span>
        <input type="email" autoComplete="email" required value={correo} onChange={(e) => setCorreo(e.target.value)} />
      </label>
      <label className="campo">
        <span>Contraseña</span>
        <input type="password" autoComplete="current-password" required value={clave} onChange={(e) => setClave(e.target.value)} />
      </label>
      {error && <p className="aviso error">{error}</p>}
      {aviso && <p className="aviso exito">{aviso}</p>}
      <button type="submit" className="btn btn-primary" disabled={enviando}>{enviando ? "Entrando…" : "Entrar"}</button>
      <button type="button" onClick={recuperar} className="boton-texto" style={{ color: "var(--tinta-suave)" }}>Olvidé mi contraseña</button>
    </form>
  );
}
