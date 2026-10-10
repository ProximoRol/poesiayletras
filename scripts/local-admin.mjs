// Solo para la base LOCAL (Docker): crea el usuario autor de prueba, lo marca como admin y
// carga dos textos y un libro de ejemplo. Las credenciales salen de .env.local
// (LOCAL_ADMIN_EMAIL / LOCAL_ADMIN_PASSWORD). Nunca apuntar esto a producción.
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const estado = Object.fromEntries(
  execSync("npx supabase status -o env", { encoding: "utf8" })
    .split(/\r?\n/)
    .map((l) => l.match(/^([A-Z_]+)="?(.*?)"?$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2]]),
);
const local = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .map((l) => l.match(/^([A-Z_]+)=(.*)$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2]]),
);

const url = estado.API_URL;
if (!/^http:\/\/(127\.0\.0\.1|localhost)/.test(url)) throw new Error("Esto es solo para la base local.");
const email = local.LOCAL_ADMIN_EMAIL;
const password = local.LOCAL_ADMIN_PASSWORD;
if (!email || !password) throw new Error("Faltan LOCAL_ADMIN_EMAIL / LOCAL_ADMIN_PASSWORD en .env.local");

const db = createClient(url, estado.SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const { error: errUsuario } = await db.auth.admin.createUser({ email, password, email_confirm: true });
if (errUsuario && !/already/i.test(errUsuario.message)) throw errUsuario;
await db.from("admins").upsert({ email });

await db.from("perfil").update({
  presentacion: "Escribo para entender lo que el silencio dice.\nAquí comparto mis poemas, cuentos y reflexiones.",
  biografia:
    "Soy poeta y corrector literario. Llevo años escribiendo sobre la memoria, el paso del tiempo y las cosas pequeñas que sostienen la vida.\n\nEste es mi rincón: aquí publico lo que escribo y converso con quienes me leen.",
}).eq("id", 1);

const { count } = await db.from("textos").select("id", { count: "exact", head: true });
if (!count) {
  const ahora = Date.now();
  await db.from("textos").insert([
    {
      slug: "a-veces-el-silencio",
      titulo: "A veces el silencio",
      categoria: "poesia",
      cuerpo: "A veces el silencio grita más fuerte,\ny allá donde nadie escucha,\nmi corazón todavía late, esperando.\n\nEspera una voz, *una sola*,\nque diga mi nombre despacio,\ncomo se dice el nombre de las cosas\nque uno no quiere perder.",
      extracto: "A veces el silencio grita más fuerte,\ny allá donde nadie escucha,\nmi corazón todavía late, esperando.\nEspera una voz, una sola,…",
      estado: "publicado",
      publicado_en: new Date(ahora - 86400000).toISOString(),
    },
    {
      slug: "la-casa-de-la-abuela",
      titulo: "La casa de la abuela",
      categoria: "cuento",
      cuerpo: "La casa olía a pan y a lluvia vieja. Nadie la había abierto en diez años, pero la llave seguía debajo de la maceta, como si la abuela supiera que alguien iba a volver.\n\nEntré despacio. El reloj de la cocina estaba detenido a las cuatro y cuarto.",
      extracto: "La casa olía a pan y a lluvia vieja. Nadie la había abierto en diez años, pero la llave seguía debajo de la maceta…",
      estado: "publicado",
      publicado_en: new Date(ahora).toISOString(),
    },
  ]);
  await db.from("libros").insert({
    titulo: "Lo que el silencio dice",
    subtitulo: "Poemas",
    anio: 2024,
    sinopsis: "Un poemario sobre la memoria, la espera y las cosas pequeñas.",
    enlaces: [{ tienda: "Amazon", url: "https://www.amazon.com/" }],
  });
}
console.log(`Listo. Autor local: ${email} (contraseña en .env.local)`);
