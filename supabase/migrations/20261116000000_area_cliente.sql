-- Área do cliente da Apolo: clientes, pedidos e etapas do projeto.
-- Vai para o Supabase com: npx supabase db push (ou cole no SQL Editor › New query › Run).
-- Regras (RLS): cada cliente lê só o que é dele; status de pagamento e etapas só mudam pelo servidor
-- (função do webhook do Asaas) ou por você no painel do Supabase (Table Editor).

create table if not exists public.clientes (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null,
  whatsapp text not null,
  email text not null,
  cpf_cnpj text not null,
  asaas_cliente text,                 -- id do cliente no Asaas (preenchido pelo servidor)
  criado_em timestamptz not null default now()
);

create table if not exists public.pedidos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  plano text not null check (plano in ('decolagem', 'orbita', 'lua', 'base', 'plus', 'pro')),
  tipo text not null check (tipo in ('site', 'mensal')),
  forma text not null check (forma in ('pix', 'cartao', 'boleto')),
  parcelas int not null default 1 check (parcelas between 1 and 3),
  valor numeric(10, 2) not null,       -- total do pedido (calculado no servidor, nunca vindo do navegador)
  cupom text,
  dominio text,
  status text not null default 'aguardando' check (status in ('aguardando', 'pago', 'em_andamento', 'entregue', 'cancelado')),
  asaas_cobranca text,                 -- id da cobrança ou assinatura no Asaas
  link_fatura text,                    -- página oficial de pagamento do Asaas
  criado_em timestamptz not null default now()
);
create index if not exists pedidos_cliente on public.pedidos (cliente_id, criado_em desc);

create table if not exists public.etapas (
  id bigint generated always as identity primary key,
  pedido_id uuid not null references public.pedidos (id) on delete cascade,
  ordem int not null,
  nome text not null,
  feita boolean not null default false,
  nota text,                           -- recado para o cliente (ex.: link da prévia)
  atualizado_em timestamptz not null default now()
);
create index if not exists etapas_pedido on public.etapas (pedido_id, ordem);

alter table public.clientes enable row level security;
alter table public.pedidos enable row level security;
alter table public.etapas enable row level security;

-- clientes: cada um vê e edita só o próprio cadastro (o id do Asaas só o servidor muda)
drop policy if exists "cliente le o seu" on public.clientes;
create policy "cliente le o seu" on public.clientes for select using (auth.uid() = id);
drop policy if exists "cliente cria o seu" on public.clientes;
create policy "cliente cria o seu" on public.clientes for insert with check (auth.uid() = id);
drop policy if exists "cliente edita o seu" on public.clientes;
create policy "cliente edita o seu" on public.clientes for update using (auth.uid() = id) with check (auth.uid() = id);

-- o id do Asaas só o servidor grava: vindo do navegador, ele é ignorado
create or replace function public.protege_asaas() returns trigger language plpgsql as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    new.asaas_cliente := case when tg_op = 'UPDATE' then old.asaas_cliente else null end;
  end if;
  return new;
end $$;
drop trigger if exists clientes_protege on public.clientes;
create trigger clientes_protege before insert or update on public.clientes for each row execute function public.protege_asaas();

-- pedidos e etapas: só leitura para o cliente; quem cria e atualiza é a função do servidor
drop policy if exists "cliente le seus pedidos" on public.pedidos;
create policy "cliente le seus pedidos" on public.pedidos for select using (auth.uid() = cliente_id);
drop policy if exists "cliente le suas etapas" on public.etapas;
create policy "cliente le suas etapas" on public.etapas for select
  using (exists (select 1 from public.pedidos p where p.id = pedido_id and p.cliente_id = auth.uid()));

-- etapas padrão de todo pedido de site, criadas junto com o pedido
create or replace function public.etapas_padrao() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.tipo = 'site' then
    insert into public.etapas (pedido_id, ordem, nome) values
      (new.id, 1, 'Pagamento confirmado'),
      (new.id, 2, 'Briefing e conteúdo'),
      (new.id, 3, 'Primeira versão'),
      (new.id, 4, 'Ajustes'),
      (new.id, 5, 'Site no ar');
  end if;
  return new;
end $$;
drop trigger if exists pedidos_etapas on public.pedidos;
create trigger pedidos_etapas after insert on public.pedidos for each row execute function public.etapas_padrao();
