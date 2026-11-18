-- Confere as regras de admin no banco LOCAL (nada fica gravado: termina em rollback).
-- Uso: docker exec -i supabase_db_site psql -U postgres -v ON_ERROR_STOP=1 < supabase/teste-admin.sql
begin;
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'ana@teste.dev'),
  ('00000000-0000-0000-0000-0000000000b2', 'beto@teste.dev'),
  ('00000000-0000-0000-0000-0000000000ad', 'socio@teste.dev');
insert into public.clientes (id, nome, whatsapp, email, cpf_cnpj) values
  ('00000000-0000-0000-0000-0000000000a1', 'Ana', '11999999999', 'ana@teste.dev', '12345678909'),
  ('00000000-0000-0000-0000-0000000000b2', 'Beto', '11988888888', 'beto@teste.dev', '98765432100');
insert into public.pedidos (id, cliente_id, plano, tipo, forma, valor) values
  ('00000000-0000-0000-0000-00000000aaa1', '00000000-0000-0000-0000-0000000000a1', 'orbita', 'site', 'pix', 2200),
  ('00000000-0000-0000-0000-00000000bbb2', '00000000-0000-0000-0000-0000000000b2', 'lua', 'site', 'cartao', 4428);
insert into public.admins (id) values ('00000000-0000-0000-0000-0000000000ad');

-- cliente comum (Ana): só o que é dela, e nada de admin
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
do $$ begin
  assert (select count(*) from public.pedidos) = 1, 'cliente vê pedido de outro';
  assert (select count(*) from public.clientes) = 1, 'cliente vê cadastro de outro';
  assert not public.eh_admin(), 'cliente virou admin';
  assert (select count(*) from public.admins) = 0, 'cliente vê a lista de admins';
  update public.pedidos set status = 'entregue' where id = '00000000-0000-0000-0000-00000000aaa1';
  assert (select status from public.pedidos where id = '00000000-0000-0000-0000-00000000aaa1') = 'aguardando', 'cliente mudou o status';
  raise notice 'ok: cliente comum';
end $$;

-- admin: vê tudo, muda status e etapas, não mexe em valor
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000ad","role":"authenticated"}';
do $$ begin
  assert public.eh_admin(), 'admin não reconhecido';
  assert (select count(*) from public.pedidos where cliente_id in ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b2')) = 2, 'admin não vê todos os pedidos';
  assert (select count(*) from public.clientes where id in ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b2')) = 2, 'admin não vê todos os clientes';
  assert (select count(*) from public.etapas where pedido_id in ('00000000-0000-0000-0000-00000000aaa1', '00000000-0000-0000-0000-00000000bbb2')) = 10, 'admin não vê todas as etapas';
  update public.pedidos set status = 'em_andamento' where id = '00000000-0000-0000-0000-00000000bbb2';
  assert (select status from public.pedidos where id = '00000000-0000-0000-0000-00000000bbb2') = 'em_andamento', 'admin não mudou o status';
  update public.etapas set feita = true, nota = 'Prévia: https://x.dev', atualizado_em = now() where pedido_id = '00000000-0000-0000-0000-00000000bbb2' and ordem = 2;
  assert (select feita from public.etapas where pedido_id = '00000000-0000-0000-0000-00000000bbb2' and ordem = 2), 'admin não marcou a etapa';
  begin
    update public.pedidos set valor = 1 where id = '00000000-0000-0000-0000-00000000bbb2';
    raise exception 'admin mudou o valor';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.etapas set nome = 'x' where pedido_id = '00000000-0000-0000-0000-00000000bbb2';
    raise exception 'admin renomeou etapa';
  exception when insufficient_privilege then null;
  end;
  -- painel: marca o restante do Pix; apaga só o que está cancelado
  update public.pedidos set restante_em = now() where id = '00000000-0000-0000-0000-00000000aaa1';
  assert (select restante_em from public.pedidos where id = '00000000-0000-0000-0000-00000000aaa1') is not null, 'admin não marcou o restante';
  begin
    update public.pedidos set pago_em = now() where id = '00000000-0000-0000-0000-00000000aaa1';
    raise exception 'admin mudou pago_em';
  exception when insufficient_privilege then null;
  end;
  delete from public.pedidos where id = '00000000-0000-0000-0000-00000000aaa1';
  assert (select count(*) from public.pedidos where id = '00000000-0000-0000-0000-00000000aaa1') = 1, 'admin apagou pedido não cancelado';
  update public.pedidos set status = 'cancelado' where id = '00000000-0000-0000-0000-00000000aaa1';
  delete from public.pedidos where id = '00000000-0000-0000-0000-00000000aaa1';
  assert (select count(*) from public.pedidos where id = '00000000-0000-0000-0000-00000000aaa1') = 0, 'admin não apagou o cancelado';
  raise notice 'ok: admin';
end $$;
rollback;
