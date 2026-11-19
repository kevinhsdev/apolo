-- Manutenção por mensalidade (Checkout Pro) no lugar da assinatura do Mercado Pago, que recusava os cartões.
-- Cada mês é um pedido: o pago guarda até quando vale (vence_em); o do mês seguinte aponta para ele (renova_de).
alter table public.pedidos add column if not exists vence_em date;
alter table public.pedidos add column if not exists renova_de uuid references public.pedidos (id) on delete set null;
-- uma renovação por mês, mesmo que a rotina diária rode duas vezes
create unique index if not exists pedidos_renova_de on public.pedidos (renova_de) where renova_de is not null;
