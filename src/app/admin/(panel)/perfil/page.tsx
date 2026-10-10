import { FormPerfil } from "@/components/panel/FormPerfil";
import { PERFIL_VACIO } from "@/server/datos";
import { env } from "@/server/env";
import { usuario } from "@/server/supabase";
import type { Perfil } from "@/server/tipos";

export default async function PerfilPanel() {
  const db = await usuario();
  const { data } = await db.from("perfil").select("*").eq("id", 1).maybeSingle();
  return (
    <>
      <div className="panel-cabeza">
        <div>
          <h1>Mi perfil</h1>
          <p className="muted">Tu foto, tu presentación y cómo te pueden contactar.</p>
        </div>
      </div>
      <FormPerfil perfil={(data as Perfil | null) ?? PERFIL_VACIO} urlBase={env.supabaseUrl} />
    </>
  );
}
