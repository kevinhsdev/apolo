-- Admin da Apolo: os sócios veem todos os pedidos e atualizam status e etapas.
-- Quem é admin fica em public.admins (cadastro: node supabase/admin.mjs email). Teste: supabase/teste-admin.sql.

create table if not exists public.admins (
  id uuid primary key references auth.users (id) on delete cascade,
  criado_em timestamptz not null default now()
);
alter table public.admins enable row level security;

-- security definer: lê admins sem cair nas regras de admins (evita recursão)
create or replace function public.eh_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where id = auth.uid());
$$;
revoke all on function public.eh_admin() from public;
grant execute on function public.eh_admin() to authenticated;

drop policy if exists "admin le admins" on public.admins;
create policy "admin le admins" on public.admins for select using (public.eh_admin());

drop policy if exists "admin le tudo" on public.clientes;
create policy "admin le tudo" on public.clientes for select using (public.eh_admin());
drop policy if exists "admin le tudo" on public.pedidos;
create policy "admin le tudo" on public.pedidos for select using (public.eh_admin());
drop policy if exists "admin le tudo" on public.etapas;
create policy "admin le tudo" on public.etapas for select using (public.eh_admin());

drop policy if exists "admin atualiza" on public.pedidos;
create policy "admin atualiza" on public.pedidos for update using (public.eh_admin()) with check (public.eh_admin());
drop policy if exists "admin atualiza" on public.etapas;
create policy "admin atualiza" on public.etapas for update using (public.eh_admin()) with check (public.eh_admin());

-- pelo navegador só dá para mudar estas colunas (o servidor, com service_role, continua mudando tudo)
revoke update on public.pedidos, public.etapas from authenticated, anon;
grant update (status) on public.pedidos to authenticated;
grant update (feita, nota, atualizado_em) on public.etapas to authenticated;
