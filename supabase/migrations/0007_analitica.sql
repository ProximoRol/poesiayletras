-- Medición propia, sin terceros (copiada de Ugen con sus correcciones ya hechas).
--  · eventos: lo que pasa en la página (visitas, lectura, clics, carro, pagos). La escribe solo
--    el servidor (/api/track y la confirmación de pagos); la lee solo el autor.
--  · No se guarda la IP, ni la URL completa del referente (solo su dominio), ni datos personales.
--  · Las sesiones no tienen tabla: se arman con analitica_sesiones() desde los eventos.
-- Idempotente.

create table if not exists public.eventos (
  id bigint generated always as identity primary key,
  ocurrido_en timestamptz not null default now(),
  visitante_id text not null,
  sesion_id text not null,
  tipo text not null,
  ruta text,
  objeto text,            -- qué se vio o tocó: slug del texto, id del producto o del plan
  valor integer,          -- pesos (carro, pago)
  referente text,         -- solo el dominio, y solo en el primer evento de la sesión
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,          -- palabra clave del anuncio (sufijo de URL «utm_term={keyword}»)
  pais text,
  dispositivo text,       -- movil | tablet | escritorio
  navegador text,
  so text,
  pantalla text,
  idioma text,
  nuevo boolean,          -- no tenía id de visitante al empezar la sesión (null en modo anónimo)
  entrada text,           -- primera página de la sesión
  datos jsonb
);
create index if not exists eventos_por_fecha on public.eventos (ocurrido_en desc);
create index if not exists eventos_por_sesion on public.eventos (sesion_id, ocurrido_en);
create index if not exists eventos_por_tipo on public.eventos (tipo, ocurrido_en desc);

alter table public.eventos enable row level security;
drop policy if exists "eventos: autor lee" on public.eventos;
create policy "eventos: autor lee" on public.eventos for select using (public.es_admin());
revoke all on public.eventos from anon, authenticated;
grant select on public.eventos to authenticated;

-- Une cada venta a la visita que la hizo (la compra cuenta en el embudo de esa sesión).
alter table public.pedidos add column if not exists visitante_id text;
alter table public.pedidos add column if not exists sesion_id text;
alter table public.encargos add column if not exists visitante_id text;
alter table public.encargos add column if not exists sesion_id text;

-- ── Sesiones ────────────────────────────────────────────────────────────────
-- Una fila por sesión. La fuente es el PRIMER utm o referente de cualquier evento de la sesión
-- (no solo del primer page_view), para que un clic de anuncio nunca quede como «directo».
create or replace function public.analitica_sesiones(desde timestamptz, hasta timestamptz)
returns json language sql stable security invoker set search_path = public as $$
  with e as (
    select * from eventos where ocurrido_en >= desde and ocurrido_en < hasta
  ),
  s as (
    select sesion_id,
           min(visitante_id) as visitante_id,
           min(ocurrido_en) as inicio,
           max(ocurrido_en) as fin,
           (array_agg(lower(utm_source) order by ocurrido_en) filter (where nullif(utm_source, '') is not null))[1] as utm_source,
           (array_agg(lower(utm_medium) order by ocurrido_en) filter (where nullif(utm_medium, '') is not null))[1] as utm_medium,
           (array_agg(utm_campaign order by ocurrido_en) filter (where nullif(utm_campaign, '') is not null))[1] as campana,
           (array_agg(lower(utm_term) order by ocurrido_en) filter (where nullif(utm_term, '') is not null))[1] as palabra_clave,
           (array_agg(lower(referente) order by ocurrido_en) filter (where nullif(referente, '') is not null))[1] as referente,
           (array_agg(coalesce(entrada, ruta) order by ocurrido_en) filter (where coalesce(entrada, ruta) is not null))[1] as entrada,
           (array_agg(pais order by ocurrido_en) filter (where pais is not null))[1] as pais,
           (array_agg(dispositivo order by ocurrido_en) filter (where dispositivo is not null))[1] as dispositivo,
           bool_or(nuevo) as nuevo,
           count(*) filter (where tipo = 'page_view') as paginas,
           count(distinct ruta) as rutas,
           coalesce(sum((datos->>'ms')::numeric) filter (where tipo = 'engagement' and datos->>'ms' ~ '^[0-9]+(\.[0-9]+)?$'), 0)::bigint as ms,
           coalesce(max((datos->>'pct')::int) filter (where tipo = 'scroll' and datos->>'pct' ~ '^[0-9]+$'), 0) as scroll,
           coalesce(array_agg(distinct objeto) filter (where tipo = 'text_view' and objeto is not null), '{}') as textos,
           coalesce(array_agg(distinct objeto) filter (where tipo = 'text_read' and objeto is not null), '{}') as textos_enteros,
           bool_or(tipo = 'text_view') as leyo,
           bool_or(tipo = 'text_read') as leyo_entero,
           bool_or(tipo = 'page_view' and ruta ~ '^/(libros|tienda|correccion|comprar)') as vio_oferta,
           bool_or(tipo = 'interaction') as interactuo,
           bool_or(tipo = 'interaction' and datos->>'accion' = 'whatsapp') as whatsapp,
           bool_or(tipo = 'comment_sent') as comento,
           bool_or(tipo in ('add_to_cart', 'service_view')) as quiso,
           bool_or(tipo in ('checkout_start', 'service_start')) as fue_a_pagar,
           bool_or(tipo = 'purchase') as compra_evento,
           coalesce(array_agg(distinct datos->>'accion') filter (where tipo = 'interaction' and datos->>'accion' is not null), '{}') as acciones
      from e
     group by sesion_id
  ),
  ventas as (
    select sesion_id, count(*) as pedidos, sum(total) as ingresos from (
      select sesion_id, total from pedidos
       where creado_en >= desde and creado_en < hasta and sesion_id is not null and estado in ('pagado', 'enviado')
      union all
      select sesion_id, total from encargos
       where creado_en >= desde and creado_en < hasta and sesion_id is not null and estado in ('pagado', 'entregado')
    ) v group by sesion_id
  )
  select coalesce(json_agg(x order by x.inicio desc), '[]') from (
    select s.*, (s.compra_evento or v.pedidos is not null) as compra,
           coalesce(v.pedidos, 0) as pedidos, coalesce(v.ingresos, 0) as ingresos
      from s left join ventas v using (sesion_id)
     order by s.inicio desc
     limit 20000
  ) x;
$$;
-- Postgres da EXECUTE a PUBLIC por defecto: solo usuarios con sesión (y RLS deja leer al autor).
revoke all on function public.analitica_sesiones(timestamptz, timestamptz) from public, anon;
grant execute on function public.analitica_sesiones(timestamptz, timestamptz) to authenticated;

-- ── Recorrido de una sesión, paso a paso ────────────────────────────────────
create or replace function public.analitica_recorrido(p_sesion text)
returns json language sql stable security invoker set search_path = public as $$
  select coalesce(json_agg(e order by e.ocurrido_en), '[]') from (
    select ocurrido_en, tipo, ruta, objeto, valor, referente, utm_source, utm_medium, utm_term, pais, dispositivo, navegador, datos
      from eventos where sesion_id = p_sesion
  ) e;
$$;
revoke all on function public.analitica_recorrido(text) from public, anon;
grant execute on function public.analitica_recorrido(text) to authenticated;
