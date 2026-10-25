-- Temas editables: el autor crea, renombra, ordena y borra los temas de sus textos
-- (antes eran fijos: poesía, cuento, ensayo, reflexión). El slug no cambia al renombrar,
-- así los enlaces de los filtros (/textos?tipo=…) siguen funcionando.

create table public.temas (
  slug text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 60),
  nombre text not null check (char_length(nombre) between 1 and 40),
  -- «verso»: cada Enter es un verso (poemas); «prosa»: párrafos y minutos de lectura.
  formato text not null default 'prosa' check (formato in ('verso', 'prosa')),
  orden integer not null default 0,
  creado_en timestamptz not null default now()
);

insert into public.temas (slug, nombre, formato, orden) values
  ('poesia', 'Poesía', 'verso', 0),
  ('cuento', 'Cuento', 'prosa', 1),
  ('ensayo', 'Ensayo', 'prosa', 2),
  ('reflexion', 'Reflexión', 'prosa', 3);

-- Cada texto apunta a un tema existente. No se puede borrar un tema con textos.
alter table public.textos drop constraint textos_categoria_check;
alter table public.textos
  add constraint textos_categoria_tema foreign key (categoria) references public.temas (slug)
  on update cascade on delete restrict;
create index textos_categoria on public.textos (categoria);

alter table public.temas enable row level security;
create policy "temas: todos los ven" on public.temas for select using (true);
create policy "temas: autor crea" on public.temas for insert with check (public.es_admin());
create policy "temas: autor edita" on public.temas for update using (public.es_admin()) with check (public.es_admin());
create policy "temas: autor borra" on public.temas for delete using (public.es_admin());

revoke all on public.temas from anon, authenticated;
grant select on public.temas to anon, authenticated;
grant insert, update, delete on public.temas to authenticated;
