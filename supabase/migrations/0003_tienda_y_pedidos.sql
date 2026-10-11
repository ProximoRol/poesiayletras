-- Tienda propia con pago por Mercado Pago (cuenta del autor, pesos chilenos) y envío por pagar.
--  · productos: los agrega el autor desde el panel. Un producto puede ser un libro de la vitrina.
--  · pedidos: se crean SOLO con crear_pedido(), que toma los precios de la base (el navegador no
--    decide cuánto se cobra). El pago lo confirma el servidor consultando a Mercado Pago.

-- ── Productos ───────────────────────────────────────────────────────────────
create table public.productos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (char_length(nombre) between 1 and 120),
  descripcion text not null default '',
  precio integer not null check (precio between 100 and 10000000), -- CLP, sin decimales
  foto text,
  stock integer check (stock is null or stock >= 0),                 -- null = sin límite
  libro_id uuid references public.libros (id) on delete set null,
  visible boolean not null default true,
  orden integer not null default 0,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create trigger productos_actualizado before update on public.productos
  for each row execute function public.tocar_actualizado();

alter table public.productos enable row level security;
create policy "productos: lectores ven los visibles" on public.productos for select using (visible or public.es_admin());
create policy "productos: autor crea" on public.productos for insert with check (public.es_admin());
create policy "productos: autor edita" on public.productos for update using (public.es_admin()) with check (public.es_admin());
create policy "productos: autor borra" on public.productos for delete using (public.es_admin());

-- ── Pedidos ─────────────────────────────────────────────────────────────────
create table public.pedidos (
  id uuid primary key default gen_random_uuid(),
  numero integer generated always as identity (start with 1001) unique,
  estado text not null default 'pendiente_pago'
    check (estado in ('pendiente_pago', 'pagado', 'enviado', 'cancelado')),
  nombre text not null check (char_length(nombre) between 2 and 120),
  correo text not null check (correo ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(correo) <= 200),
  telefono text not null check (char_length(telefono) between 6 and 30),
  rut text check (rut is null or char_length(rut) <= 15),
  direccion text not null check (char_length(direccion) between 3 and 200),
  comuna text not null check (char_length(comuna) between 2 and 80),
  region text not null check (char_length(region) between 2 and 80),
  notas text not null default '' check (char_length(notas) <= 1000),
  -- [{ "producto_id", "nombre", "precio", "cantidad" }] con el precio del momento de la compra.
  items jsonb not null check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) > 0),
  total integer not null check (total > 0),
  mp_preferencia text,
  mp_pago text unique,
  seguimiento text,
  pagado_en timestamptz,
  enviado_en timestamptz,
  creado_en timestamptz not null default now()
);
create index pedidos_por_estado on public.pedidos (estado, creado_en desc);

alter table public.pedidos enable row level security;
-- Los lectores no leen ni escriben pedidos directamente: crean con crear_pedido() y el servidor
-- (clave de servicio, solo en el aviso de Mercado Pago) confirma el pago.
create policy "pedidos: autor ve" on public.pedidos for select using (public.es_admin());
create policy "pedidos: autor actualiza" on public.pedidos for update using (public.es_admin()) with check (public.es_admin());

-- ── Crear pedido (precios y stock desde la base) ────────────────────────────
create or replace function public.crear_pedido(p_items jsonb, p_datos jsonb)
returns table (id uuid, numero integer, total integer, items jsonb)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_items jsonb := '[]'::jsonb;
  v_total integer := 0;
  v_linea jsonb;
  v_prod public.productos%rowtype;
  v_cant integer;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 20 then
    raise exception 'carro_invalido';
  end if;

  for v_linea in select * from jsonb_array_elements(p_items) loop
    v_cant := (v_linea ->> 'cantidad')::integer;
    if v_cant is null or v_cant < 1 or v_cant > 20 then raise exception 'cantidad_invalida'; end if;
    select * into v_prod from public.productos p where p.id = (v_linea ->> 'producto_id')::uuid and p.visible;
    if not found then raise exception 'producto_no_disponible'; end if;
    if v_prod.stock is not null and v_prod.stock < v_cant then raise exception 'sin_stock:%', v_prod.nombre; end if;
    v_items := v_items || jsonb_build_object('producto_id', v_prod.id, 'nombre', v_prod.nombre, 'precio', v_prod.precio, 'cantidad', v_cant);
    v_total := v_total + v_prod.precio * v_cant;
  end loop;

  return query
  insert into public.pedidos as pe (nombre, correo, telefono, rut, direccion, comuna, region, notas, items, total)
  values (
    btrim(p_datos ->> 'nombre'), lower(btrim(p_datos ->> 'correo')), btrim(p_datos ->> 'telefono'),
    nullif(btrim(coalesce(p_datos ->> 'rut', '')), ''),
    btrim(p_datos ->> 'direccion'), btrim(p_datos ->> 'comuna'), btrim(p_datos ->> 'region'),
    coalesce(btrim(p_datos ->> 'notas'), ''), v_items, v_total
  )
  returning pe.id, pe.numero, pe.total, pe.items;
end;
$$;
revoke all on function public.crear_pedido(jsonb, jsonb) from public;
grant execute on function public.crear_pedido(jsonb, jsonb) to anon, authenticated;

-- ── Confirmar pago (solo servidor) ──────────────────────────────────────────
-- Marca pagado una sola vez y descuenta stock. Devuelve true solo la primera vez (para avisar
-- por correo una sola vez aunque Mercado Pago repita el aviso).
create or replace function public.confirmar_pago(p_pedido uuid, p_pago text, p_monto integer)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_pedido public.pedidos%rowtype;
  v_linea jsonb;
begin
  select * into v_pedido from public.pedidos where id = p_pedido for update;
  if not found or v_pedido.estado <> 'pendiente_pago' then return false; end if;
  if p_monto < v_pedido.total then raise exception 'monto_insuficiente'; end if;

  update public.pedidos set estado = 'pagado', mp_pago = p_pago, pagado_en = now() where id = p_pedido;
  for v_linea in select * from jsonb_array_elements(v_pedido.items) loop
    update public.productos
      set stock = greatest(stock - (v_linea ->> 'cantidad')::integer, 0)
      where id = (v_linea ->> 'producto_id')::uuid and stock is not null;
  end loop;
  return true;
end;
$$;
revoke all on function public.confirmar_pago(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.confirmar_pago(uuid, text, integer) to service_role;

-- ── Permisos de la API ──────────────────────────────────────────────────────
revoke all on public.productos, public.pedidos from anon, authenticated;
grant select on public.productos to anon, authenticated;
grant insert, update, delete on public.productos to authenticated;
grant select, update on public.pedidos to authenticated;
