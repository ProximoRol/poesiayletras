-- La tienda cobra con Flow (flow.cl) en vez de Mercado Pago. Las columnas del pago dejan de
-- llevar el nombre de un proveedor: pago_token es el token de la orden en Flow y pago_id su
-- número de orden (flowOrder), único para no confirmar dos veces el mismo pago.

alter table public.pedidos rename column mp_preferencia to pago_token;
alter table public.pedidos rename column mp_pago to pago_id;

create or replace function public.confirmar_pago(p_pedido uuid, p_pago text, p_monto integer)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_pedido public.pedidos%rowtype;
  v_linea jsonb;
begin
  select * into v_pedido from public.pedidos where id = p_pedido for update;
  if not found or v_pedido.estado <> 'pendiente_pago' then return false; end if;
  if p_monto < v_pedido.total then raise exception 'monto_insuficiente'; end if;

  update public.pedidos set estado = 'pagado', pago_id = p_pago, pagado_en = now() where id = p_pedido;
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
