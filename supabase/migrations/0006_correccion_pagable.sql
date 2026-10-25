-- Corrección literaria que se paga al contratarla.
--  · servicios: los planes de corrección (precio en pesos por poema, por página o fijo). Sin
--    precio, el plan se consulta por WhatsApp. El autor los edita desde el panel.
--  · encargos: se crean SOLO con crear_encargo(), que toma el precio de la base. El cliente
--    sube su texto a un depósito privado y paga con Flow; el servidor confirma el pago.

-- ── Servicios ───────────────────────────────────────────────────────────────
create table public.servicios (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (char_length(nombre) between 1 and 80),
  descripcion text not null default '' check (char_length(descripcion) <= 400),
  incluye text[] not null default '{}',
  precio integer check (precio is null or precio between 100 and 10000000), -- CLP; null = a consultar
  unidad text not null default 'fijo' check (unidad in ('poema', 'pagina', 'fijo')),
  minimo integer not null default 1 check (minimo between 1 and 500),
  nota text not null default '' check (char_length(nota) <= 120),
  destacado boolean not null default false,
  visible boolean not null default true,
  orden integer not null default 0,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create trigger servicios_actualizado before update on public.servicios
  for each row execute function public.tocar_actualizado();

insert into public.servicios (nombre, descripcion, incluye, precio, unidad, minimo, nota, destacado, orden) values
  ('Poema suelto', 'Corrección de un poema individual: ortografía, puntuación y ritmo.',
   array['Ortografía y gramática', 'Puntuación y mayúsculas', 'Ritmo y musicalidad', 'Comentarios de estilo'],
   5000, 'poema', 1, 'Hasta 40 versos por poema', false, 0),
  ('Poemario · Cuento', 'Revisión completa de un conjunto de poemas o un cuento corto.',
   array['Todo lo del plan anterior', 'Fluidez y claridad global', 'Repeticiones y redundancias', 'Informe con sugerencias', 'Una ronda de ajustes incluida'],
   2500, 'pagina', 5, 'Mínimo 5 páginas · página de ~250 palabras', true, 1),
  ('Acompañamiento', 'Lectura crítica y corrección de tu manuscrito para concursos o publicación.',
   array['Corrección integral', 'Lectura crítica del conjunto', 'Recomendaciones para concursos', 'Dos rondas de ajustes', 'Sesión de comentarios'],
   null, 'fijo', 1, 'Presupuesto según extensión', false, 2);

alter table public.servicios enable row level security;
create policy "servicios: lectores ven los visibles" on public.servicios for select using (visible or public.es_admin());
create policy "servicios: autor crea" on public.servicios for insert with check (public.es_admin());
create policy "servicios: autor edita" on public.servicios for update using (public.es_admin()) with check (public.es_admin());
create policy "servicios: autor borra" on public.servicios for delete using (public.es_admin());

revoke all on public.servicios from anon, authenticated;
grant select on public.servicios to anon, authenticated;
grant insert, update, delete on public.servicios to authenticated;

-- ── Encargos ────────────────────────────────────────────────────────────────
create table public.encargos (
  id uuid primary key default gen_random_uuid(),
  numero integer generated always as identity (start with 2001) unique,
  estado text not null default 'pendiente_pago'
    check (estado in ('pendiente_pago', 'pagado', 'entregado', 'cancelado')),
  servicio_id uuid references public.servicios (id) on delete set null,
  -- Copia del servicio al momento de contratar (el autor puede cambiarlo después).
  servicio text not null,
  unidad text not null check (unidad in ('poema', 'pagina', 'fijo')),
  cantidad integer not null check (cantidad between 1 and 500),
  precio integer not null check (precio > 0),
  total integer not null check (total > 0),
  nombre text not null check (char_length(nombre) between 2 and 120),
  correo text not null check (correo ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(correo) <= 200),
  telefono text not null check (char_length(telefono) between 6 and 30),
  notas text not null default '' check (char_length(notas) <= 2000),
  archivo text,          -- ruta en el depósito privado «encargos»
  archivo_nombre text,   -- nombre original del archivo, para descargarlo con su nombre
  pago_token text,
  pago_id text unique,
  pagado_en timestamptz,
  entregado_en timestamptz,
  creado_en timestamptz not null default now()
);
create index encargos_por_estado on public.encargos (estado, creado_en desc);

alter table public.encargos enable row level security;
create policy "encargos: autor ve" on public.encargos for select using (public.es_admin());
create policy "encargos: autor actualiza" on public.encargos for update using (public.es_admin()) with check (public.es_admin());

revoke all on public.encargos from anon, authenticated;
grant select, update on public.encargos to authenticated;

-- ── Crear encargo (precio desde la base) ────────────────────────────────────
create or replace function public.crear_encargo(p_servicio uuid, p_cantidad integer, p_datos jsonb)
returns table (id uuid, numero integer, total integer)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_serv public.servicios%rowtype;
  v_cant integer := coalesce(p_cantidad, 0);
begin
  select * into v_serv from public.servicios s where s.id = p_servicio and s.visible and s.precio is not null;
  if not found then raise exception 'servicio_no_disponible'; end if;
  if v_serv.unidad = 'fijo' then v_cant := 1; end if;
  if v_cant < v_serv.minimo or v_cant > 500 then raise exception 'cantidad_invalida'; end if;

  return query
  insert into public.encargos as e (servicio_id, servicio, unidad, cantidad, precio, total, nombre, correo, telefono, notas)
  values (
    v_serv.id, v_serv.nombre, v_serv.unidad, v_cant, v_serv.precio, v_serv.precio * v_cant,
    btrim(p_datos ->> 'nombre'), lower(btrim(p_datos ->> 'correo')), btrim(p_datos ->> 'telefono'),
    coalesce(btrim(p_datos ->> 'notas'), '')
  )
  returning e.id, e.numero, e.total;
end;
$$;
revoke all on function public.crear_encargo(uuid, integer, jsonb) from public;
grant execute on function public.crear_encargo(uuid, integer, jsonb) to service_role;

-- ── Confirmar pago del encargo (solo servidor) ──────────────────────────────
-- Devuelve true solo la primera vez, para avisar por correo una sola vez.
create or replace function public.confirmar_pago_encargo(p_encargo uuid, p_pago text, p_monto integer)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_enc public.encargos%rowtype;
begin
  select * into v_enc from public.encargos where id = p_encargo for update;
  if not found or v_enc.estado <> 'pendiente_pago' then return false; end if;
  if p_monto < v_enc.total then raise exception 'monto_insuficiente'; end if;
  update public.encargos set estado = 'pagado', pago_id = p_pago, pagado_en = now() where id = p_encargo;
  return true;
end;
$$;
revoke all on function public.confirmar_pago_encargo(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.confirmar_pago_encargo(uuid, text, integer) to service_role;

-- ── Textos de los clientes (depósito privado) ───────────────────────────────
-- Los sube el servidor con la clave de servicio; solo el autor los puede leer.
insert into storage.buckets (id, name, public, file_size_limit)
values ('encargos', 'encargos', false, 4194304)
on conflict (id) do nothing;
create policy "encargos: autor lee los textos" on storage.objects for select
  using (bucket_id = 'encargos' and public.es_admin());
