-- Comentarios publicados al instante (el autor prefirió no revisarlos antes). Queda como opción
-- en el perfil: con moderar_comentarios = true vuelven a entrar pendientes.
-- Quien comenta no elige el estado: lo fija este disparador según el perfil.

alter table public.perfil add column moderar_comentarios boolean not null default false;

create or replace function public.estado_comentario_nuevo() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.estado := case when coalesce((select moderar_comentarios from public.perfil where id = 1), false)
                     then 'pendiente' else 'aprobado' end;
  new.respuesta := null;
  new.creado_en := now();
  return new;
end;
$$;
revoke all on function public.estado_comentario_nuevo() from public;

create trigger comentarios_estado_nuevo before insert on public.comentarios
  for each row execute function public.estado_comentario_nuevo();

-- Las políticas se evalúan después del disparador: ya no se exige «pendiente» al insertar.
drop policy "comentarios: lectores comentan" on public.comentarios;
create policy "comentarios: lectores comentan" on public.comentarios for insert
  with check (
    respuesta is null
    and exists (select 1 from public.textos t where t.id = texto_id and t.estado = 'publicado')
  );
