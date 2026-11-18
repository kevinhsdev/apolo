-- Painel do admin: data do pagamento (receita por mês), restante do Pix e limpeza de pedidos de teste.

-- quando o Mercado Pago confirmou (o webhook grava); pedidos antigos usam a data de criação
alter table public.pedidos add column if not exists pago_em timestamptz;
update public.pedidos set pago_em = criado_em where pago_em is null and status in ('pago', 'em_andamento', 'entregue');
-- Pix do site: o Mercado Pago cobra só a entrada de 50%; o admin marca quando o restante entrou
alter table public.pedidos add column if not exists restante_em timestamptz;

grant update (status, restante_em) on public.pedidos to authenticated;

-- admin apaga só pedido já cancelado (as etapas vão junto pelo on delete cascade)
grant delete on public.pedidos to authenticated;
drop policy if exists "admin apaga cancelado" on public.pedidos;
create policy "admin apaga cancelado" on public.pedidos for delete using (public.eh_admin() and status = 'cancelado');
