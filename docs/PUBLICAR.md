# Publicar la página de Wagner

Next.js en Vercel + una base Supabase propia (no la de Ugen). Costo: $0 en los planes gratis;
solo se paga el dominio (~USD 12 al año).

## 1. Base de datos (Supabase)

1. Crear un proyecto nuevo en supabase.com (nombre: `poesiayletras`, región São Paulo).
2. SQL Editor → correr, en orden, `supabase/migrations/0001_pagina_de_autor.sql`,
   `0002_comentarios_al_instante.sql` y después `supabase/contenido-inicial.sql` (su bio,
   Instagram y el libro).
3. Dar acceso al autor (SQL Editor), con el correo de Wagner:
   ```sql
   insert into public.admins (email) values ('<correo de Wagner>');
   ```
4. Authentication → URL Configuration:
   - Site URL: `https://<dominio>`
   - Redirect URLs: `https://<dominio>/admin/auth/confirmar`
5. Authentication → Users → **Invite user** con ese mismo correo. Le llega un enlace, lo abre,
   elige su contraseña y queda dentro del panel.
6. Authentication → Sign In / Providers → desactivar «Allow new users to sign up» (solo entra
   quien se invita).

## 2. Sitio (Vercel)

1. Importar el repo `ProximoRol/poesiayletras`.
2. Variables de entorno (Project Settings → API de Supabase):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL` = `https://<dominio>` (sin barra final)
   - Opcional: `NEXT_PUBLIC_STRIPE_PAYMENT_LINK` para cobrar con tarjeta en el carrito.
3. Dominio: Settings → Domains → agregar `<dominio>` y `www.<dominio>`.
4. Aviso por correo de comentarios nuevos (opcional, recomendado): en Resend agregar y verificar
   `<dominio>` (registros DNS), crear una API key y poner en Vercel `RESEND_API_KEY`,
   `CORREO_AVISOS` (correo de Wagner) y `CORREO_REMITENTE` (`Tu página <avisos@<dominio>>`).
   El correo trae un botón que lo lleva directo a aprobar el comentario.

No hace falta la clave de servicio de Supabase: todo pasa por los permisos (RLS) de la base.

## 3. Primeros pasos de Wagner

En `https://<dominio>/admin`:

0. Subir las fotos (están en `contenido/`, fuera de git): «Mi perfil» → Tu foto, y «Libros» →
   portada de «Cincuenta poemas del silencio». Cargar su WhatsApp en «Mi perfil».
1. **Mi perfil**: foto, presentación, «Sobre mí», WhatsApp (con código de país, ej. 56912345678),
   Instagram.
2. **Libros**: agregar el libro con su portada y los enlaces de compra.
3. **Mis textos → Escribir un texto nuevo**: escribir como en un cuaderno (Enter = verso, línea
   en blanco = estrofa), «Ver cómo queda» y **Publicar**.
4. **Comentarios**: los lectores comentan sin cuenta y se publican al instante (así lo pidió);
   él puede responder o borrar. En «Mi perfil» puede activar revisarlos antes.

## Desarrollo local

```bash
npm install
npm run local:arrancar      # Supabase en Docker, puertos 563xx (Ugen usa 553xx)
npm run local:admin         # autor de prueba + textos de ejemplo (credenciales en .env.local)
npm run dev                 # http://localhost:3110
npm run local:permisos      # comprueba que RLS bloquea a los anónimos
npm run check               # tipos, lint y pruebas
```
