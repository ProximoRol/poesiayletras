-- Página de autor: perfil, textos (el blog), comentarios moderados y libros en vitrina.
-- Lectores: anónimos, solo leen lo publicado y dejan comentarios que quedan pendientes.
-- Autor: un usuario de Supabase Auth cuyo correo está en `admins`. Puede todo.

-- ── Quién administra ────────────────────────────────────────────────────────
create table public.admins (
  email text primary key
);
alter table public.admins enable row level security;
-- Sin políticas: nadie la lee por la API. Se consulta solo desde es_admin().

create or replace function public.es_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.admins a
    where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
revoke all on function public.es_admin() from public;
grant execute on function public.es_admin() to anon, authenticated;

create or replace function public.tocar_actualizado() returns trigger
language plpgsql as $$
begin
  new.actualizado_en := now();
  return new;
end;
$$;

-- ── Perfil (una sola fila) ──────────────────────────────────────────────────
create table public.perfil (
  id smallint primary key default 1 check (id = 1),
  nombre text not null default 'Wagner Pérez Eulufí',
  frase text not null default 'Poesía para leer despacio.',
  presentacion text not null default '',
  biografia text not null default '',
  foto text,
  instagram text,
  facebook text,
  whatsapp text,
  correo text,
  actualizado_en timestamptz not null default now()
);
insert into public.perfil (id) values (1);
create trigger perfil_actualizado before update on public.perfil
  for each row execute function public.tocar_actualizado();

alter table public.perfil enable row level security;
create policy "perfil: todos leen" on public.perfil for select using (true);
create policy "perfil: autor edita" on public.perfil for update using (public.es_admin()) with check (public.es_admin());

-- ── Textos (blog) ───────────────────────────────────────────────────────────
create table public.textos (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  titulo text not null check (char_length(titulo) between 1 and 200),
  categoria text not null default 'poesia' check (categoria in ('poesia', 'cuento', 'ensayo', 'reflexion')),
  cuerpo text not null default '',
  extracto text not null default '',
  imagen text,
  estado text not null default 'borrador' check (estado in ('borrador', 'publicado')),
  publicado_en timestamptz,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index textos_publicados on public.textos (publicado_en desc) where estado = 'publicado';
create trigger textos_actualizado before update on public.textos
  for each row execute function public.tocar_actualizado();

alter table public.textos enable row level security;
create policy "textos: lectores ven lo publicado" on public.textos for select
  using (estado = 'publicado' or public.es_admin());
create policy "textos: autor crea" on public.textos for insert with check (public.es_admin());
create policy "textos: autor edita" on public.textos for update using (public.es_admin()) with check (public.es_admin());
create policy "textos: autor borra" on public.textos for delete using (public.es_admin());

-- ── Comentarios ─────────────────────────────────────────────────────────────
create table public.comentarios (
  id uuid primary key default gen_random_uuid(),
  texto_id uuid not null references public.textos (id) on delete cascade,
  nombre text not null check (char_length(btrim(nombre)) between 1 and 80),
  cuerpo text not null check (char_length(btrim(cuerpo)) between 2 and 3000),
  estado text not null default 'pendiente' check (estado in ('pendiente', 'aprobado')),
  -- Respuesta del autor, visible bajo el comentario.
  respuesta text check (respuesta is null or char_length(respuesta) <= 3000),
  creado_en timestamptz not null default now()
);
create index comentarios_por_texto on public.comentarios (texto_id, creado_en);
create index comentarios_pendientes on public.comentarios (creado_en) where estado = 'pendiente';

alter table public.comentarios enable row level security;
create policy "comentarios: lectores ven los aprobados" on public.comentarios for select
  using (
    public.es_admin()
    or (estado = 'aprobado' and exists (select 1 from public.textos t where t.id = texto_id and t.estado = 'publicado'))
  );
-- Cualquiera comenta, pero siempre entra pendiente, sin respuesta y solo en textos publicados.
create policy "comentarios: lectores comentan" on public.comentarios for insert
  with check (
    estado = 'pendiente' and respuesta is null
    and exists (select 1 from public.textos t where t.id = texto_id and t.estado = 'publicado')
  );
create policy "comentarios: autor modera" on public.comentarios for update using (public.es_admin()) with check (public.es_admin());
create policy "comentarios: autor borra" on public.comentarios for delete using (public.es_admin());

-- ── Libros ──────────────────────────────────────────────────────────────────
create table public.libros (
  id uuid primary key default gen_random_uuid(),
  titulo text not null check (char_length(titulo) between 1 and 200),
  subtitulo text not null default '',
  anio smallint check (anio is null or anio between 1900 and 2100),
  portada text,
  sinopsis text not null default '',
  -- [{ "tienda": "Amazon", "url": "https://..." }, ...]
  enlaces jsonb not null default '[]'::jsonb check (jsonb_typeof(enlaces) = 'array'),
  orden integer not null default 0,
  visible boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create trigger libros_actualizado before update on public.libros
  for each row execute function public.tocar_actualizado();

alter table public.libros enable row level security;
create policy "libros: lectores ven los visibles" on public.libros for select using (visible or public.es_admin());
create policy "libros: autor crea" on public.libros for insert with check (public.es_admin());
create policy "libros: autor edita" on public.libros for update using (public.es_admin()) with check (public.es_admin());
create policy "libros: autor borra" on public.libros for delete using (public.es_admin());

-- ── Permisos de la API (explícitos) ─────────────────────────────────────────
revoke all on public.admins, public.perfil, public.textos, public.comentarios, public.libros from anon, authenticated;
grant select on public.perfil, public.textos, public.libros to anon, authenticated;
grant select, insert on public.comentarios to anon, authenticated;
grant update on public.perfil to authenticated;
grant insert, update, delete on public.textos, public.libros to authenticated;
grant update, delete on public.comentarios to authenticated;

-- ── Imágenes (fotos, portadas, imágenes de textos) ──────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('imagenes', 'imagenes', true, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "imagenes: autor sube" on storage.objects for insert to authenticated
  with check (bucket_id = 'imagenes' and public.es_admin());
create policy "imagenes: autor reemplaza" on storage.objects for update to authenticated
  using (bucket_id = 'imagenes' and public.es_admin());
create policy "imagenes: autor borra" on storage.objects for delete to authenticated
  using (bucket_id = 'imagenes' and public.es_admin());
