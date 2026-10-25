# Medición de la página

Copiada de Ugen con sus correcciones ya hechas. Tres capas, de la más importante a la opcional:

## 1. Medición propia (siempre activa)

- El navegador junta eventos (`src/lib/rastreo.ts`) y los manda en lote a `/api/track` (al ocultar
  la página, cada 15 s o al llegar a 25), que los guarda en la tabla `eventos` (migración 0007).
- Ids al azar en cookies propias: `vid` (visitante, 1 año) y `sid` (sesión, 30 min sin actividad).
  Con «No rastrear» activado en el navegador, ids solo en memoria (no se guarda nada).
- No se guarda la IP, ni la URL completa del referente (solo el dominio), ni datos personales.
- Las ventas (pedidos de la tienda y encargos de corrección) guardan `visitante_id`/`sesion_id`; al
  confirmarse el pago, el servidor anota el evento `purchase` en esa visita.
- **Familia fuera**: quien entra al panel queda marcado (cookie `equipo=1`, la pone `src/proxy.ts`).
  Para marcar un celular sin entrar al panel: `https://wagnerperezeulufi.com/equipo?clave=t61bxhOz3cfp`.

Eventos (`src/domain/analitica.ts`): `page_view`, `text_view`, `text_read` (llegó al final del texto),
`comment_sent`, `add_to_cart`, `cart_open`, `checkout_start`, `service_view`, `service_start`,
`purchase`, `scroll` (25/50/75/100), `engagement` (tiempo con la pestaña visible), `interaction`
(clics marcados), `web_vital`, `js_error`.

**Medir un clic nuevo**: poner `data-track="accion"` (y `data-track-detalle="valor"`) en el elemento.
No hace falta tocar código de medición. Hoy: `whatsapp` (con `donde`), `instagram`, `compartir` (con
`red`), `contratar` (con `plan`), `portada_leer`, `portada_libro`.

**Panel › Visitas**: visitas, personas, rebote (una página, < 10 s y sin tocar nada), tiempo típico
(mediana de quienes no rebotaron), embudo por sesiones, canales (anuncios, IA, Google, redes,
correo, otras webs, directo), textos leídos y leídos hasta el final, y el recorrido de cada visita.

## 2. Google Tag Manager / GA4 (opcional)

- Se carga solo en producción y solo si existe `NEXT_PUBLIC_GTM_ID` en Vercel.
- El `dataLayer` se empuja siempre (dos pushes por evento: primero se limpia `event_params` y
  `ecommerce`, si no GTM arrastra valores del evento anterior). `user.internal = true` para la familia.
- Eventos: `page_view`, `text_view`, `text_read`, `comment_sent`, `cta_click`, `generate_lead`
  (WhatsApp), `add_to_cart`, `view_item` (plan de corrección), `begin_checkout`, `purchase` (una vez
  por pedido; `transaction_id` = id del pedido o encargo, `currency` CLP, IVA incluido).
- Anuncios de Google: poner en el sufijo de URL final `utm_term={keyword}` para ver la palabra
  clave en el panel. Un `gclid` sin utm ya cuenta como anuncio de Google.

## 3. Microsoft Clarity (opcional)

Grabaciones y mapas de calor. Se carga solo si existe `NEXT_PUBLIC_CLARITY_ID` y nunca para la familia.
