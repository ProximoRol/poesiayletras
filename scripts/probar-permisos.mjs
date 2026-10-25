// Solo base LOCAL: comprueba que RLS bloquea a lectores anónimos y deja al autor. npm run local:permisos
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
const env = Object.fromEntries(readFileSync(".env.local","utf8").split(/\r?\n/).map(l=>l.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean).map(m=>[m[1],m[2]]));
if (!/^http:\/\/(127\.0\.0\.1|localhost)/.test(env.NEXT_PUBLIC_SUPABASE_URL)) throw new Error("Solo para la base local.");
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
const { data: t } = await anon.from("textos").select("id").limit(1).single();

const r2 = await anon.from("comentarios").update({ estado: "aprobado" }).neq("id", "00000000-0000-0000-0000-000000000000").select();
console.log("anon aprueba ->", (r2.data ?? []).length ? "PERMITIDO (mal)" : "BLOQUEADO");
const r3 = await anon.from("textos").insert({ slug: "x", titulo: "x" });
console.log("anon crea texto ->", r3.error ? "BLOQUEADO" : "PERMITIDO (mal)");
const r4 = await anon.from("admins").select("*");
console.log("anon lee admins ->", r4.error || !(r4.data??[]).length ? "BLOQUEADO" : "PERMITIDO (mal)");
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==","base64");
const r5 = await anon.storage.from("imagenes").upload("textos/anon.png", png, { contentType: "image/png" });
console.log("anon sube imagen ->", r5.error ? "BLOQUEADO" : "PERMITIDO (mal)");
// Tienda: el lector no ve pedidos ajenos, no crea productos, no marca pagos y no fija precios.
const r10 = await anon.from("pedidos").select("nombre, direccion");
console.log("anon lee pedidos ->", r10.error || !(r10.data ?? []).length ? "BLOQUEADO" : "PERMITIDO (mal)");
const r11 = await anon.from("productos").insert({ nombre: "x", precio: 1000 });
console.log("anon crea producto ->", r11.error ? "BLOQUEADO" : "PERMITIDO (mal)");
const r12 = await anon.rpc("confirmar_pago", { p_pedido: "00000000-0000-0000-0000-000000000000", p_pago: "1", p_monto: 1 });
console.log("anon confirma un pago ->", r12.error ? "BLOQUEADO" : "PERMITIDO (mal)");
const { data: prod } = await anon.from("productos").select("id, precio").limit(1).maybeSingle();
if (prod) {
  const datos = { nombre: "Prueba", correo: "p@p.cl", telefono: "12345678", direccion: "x 1", comuna: "xx", region: "Biobío" };
  const { data: ped } = await anon.rpc("crear_pedido", { p_items: [{ producto_id: prod.id, cantidad: 1, precio: 1 }], p_datos: datos }).single();
  console.log("anon fija el precio ->", ped?.total === prod.precio ? "BLOQUEADO" : "PERMITIDO (mal)");
}

const autor = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
await autor.auth.signInWithPassword({ email: env.LOCAL_ADMIN_EMAIL, password: env.LOCAL_ADMIN_PASSWORD });
// Con revisión activada, el estado que mande el lector se ignora: entra pendiente.
await autor.from("perfil").update({ moderar_comentarios: true }).eq("id", 1);
const marca = `prueba-${Date.now()}`;
await anon.from("comentarios").insert({ texto_id: t.id, nombre: "spam", cuerpo: marca, estado: "aprobado" });
const { data: c1 } = await autor.from("comentarios").select("estado").eq("cuerpo", marca).single();
console.log("anon se autoaprueba ->", c1?.estado === "pendiente" ? "BLOQUEADO" : "PERMITIDO (mal)");
await autor.from("perfil").update({ moderar_comentarios: false }).eq("id", 1);
await autor.from("comentarios").delete().eq("cuerpo", marca);
const r9 = await anon.from("comentarios").insert({ texto_id: t.id, nombre: "falso", cuerpo: "x" + marca, respuesta: "soy el autor" });
const { data: c2 } = await autor.from("comentarios").select("respuesta").eq("cuerpo", "x" + marca).maybeSingle();
console.log("anon escribe respuesta del autor ->", r9.error || !c2?.respuesta ? "BLOQUEADO" : "PERMITIDO (mal)");
await autor.from("comentarios").delete().eq("cuerpo", "x" + marca);
const r6 = await autor.storage.from("imagenes").upload(`textos/prueba-${Date.now()}.png`, png, { contentType: "image/png" });
console.log("autor sube imagen ->", r6.error ? "FALLA (mal): " + r6.error.message : "OK");
const r7 = await autor.from("textos").insert({ slug: `borrador-${Date.now()}`, titulo: "Borrador secreto" });
const r8 = await anon.from("textos").select("titulo").eq("titulo", "Borrador secreto");
console.log("anon ve borradores ->", (r8.data ?? []).length ? "PERMITIDO (mal)" : "BLOQUEADO", r7.error?.message ?? "");
await autor.from("textos").delete().eq("titulo", "Borrador secreto");
if (prod) await autor.from("pedidos").update({ estado: "cancelado" }).eq("nombre", "Prueba").eq("estado", "pendiente_pago");
