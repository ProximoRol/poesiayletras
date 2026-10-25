import Link from "next/link";
import { notFound } from "next/navigation";
import { BotonConfirmar } from "@/components/panel/BotonConfirmar";
import { FormServicio } from "@/components/panel/FormServicio";
import { borrarServicio } from "@/server/panel/acciones";
import { usuario } from "@/server/supabase";
import type { Servicio } from "@/server/tipos";

export default async function EditarPlan({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let plan: Servicio | null = null;
  if (id !== "nuevo") {
    if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
    const db = await usuario();
    const { data } = await db.from("servicios").select("*").eq("id", id).maybeSingle();
    if (!data) notFound();
    plan = data as Servicio;
  }

  return (
    <>
      <div className="panel-cabeza">
        <div>
          <Link href="/admin/correccion" className="enlace">← Corrección</Link>
          <h1 style={{ marginTop: 8 }}>{plan ? plan.nombre : "Plan nuevo"}</h1>
        </div>
      </div>
      <FormServicio plan={plan} />
      {plan && (
        <form action={borrarServicio} style={{ marginTop: 40, textAlign: "right" }}>
          <input type="hidden" name="id" value={plan.id} />
          <BotonConfirmar pregunta="¿Borrar este plan? Deja de aparecer en tu página (los encargos ya pagados no se pierden).">Borrar este plan</BotonConfirmar>
        </form>
      )}
    </>
  );
}
