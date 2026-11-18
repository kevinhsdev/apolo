-- Troca do Asaas pelo Mercado Pago: até 6x sem juros e id de cobrança com nome neutro.
alter table public.pedidos drop constraint if exists pedidos_parcelas_check;
alter table public.pedidos add constraint pedidos_parcelas_check check (parcelas between 1 and 6);
alter table public.pedidos rename column asaas_cobranca to cobranca; -- pagamento, preferência ou assinatura no Mercado Pago
comment on column public.pedidos.link_fatura is 'página oficial de pagamento do Mercado Pago';
