// Botão da conta no topo: "Entrar" ou o avatar do cliente logado, com menu.
// A sessão é lida direto do localStorage (onde o supabase-js a guarda); a biblioteca só carrega
// depois, com o navegador livre, para buscar o nome e os pagamentos pendentes.
import { ligado, CHAVE_SESSAO } from '../supabase-config.js';

const ler = k => { try { return localStorage.getItem(k); } catch { return null; } };
const gravar = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} };
const iniciais = (nome, email) => {
  const p = (nome || '').trim().split(/\s+/).filter(Boolean);
  return (p.length > 1 ? p[0][0] + p[p.length - 1][0] : (p[0] || email || '?').slice(0, 1)).toUpperCase();
};

export function iniciarUsuario() {
  const raiz = document.querySelector('[data-conta-nav]');
  if (!raiz || !ligado) return;
  let sessao; try { sessao = JSON.parse(ler(CHAVE_SESSAO)); } catch {}
  const user = sessao?.user;
  if (!user) return;

  const $ = s => raiz.querySelector(s);
  const avatar = $('[data-avatar]'), menu = $('[data-conta-menu]');
  const pintar = nome => {
    raiz.querySelectorAll('[data-iniciais]').forEach(e => { e.textContent = iniciais(nome, user.email); });
    $('[data-conta-nome]').textContent = nome || 'Sua conta';
  };
  $('[data-entrar-nav]').hidden = true;
  avatar.hidden = false;
  $('[data-conta-email]').textContent = user.email;
  pintar(ler('apolo-nome'));

  const fechar = focar => {
    if (menu.hidden) return;
    avatar.setAttribute('aria-expanded', 'false');
    menu.classList.remove('is-aberto');
    setTimeout(() => { if (!menu.classList.contains('is-aberto')) menu.hidden = true; }, 180);
    if (focar) avatar.focus();
  };
  avatar.addEventListener('click', () => {
    if (menu.classList.contains('is-aberto')) return fechar();
    menu.style.setProperty('--topo-menu', `${avatar.getBoundingClientRect().bottom + 10}px`);
    menu.hidden = false;
    avatar.setAttribute('aria-expanded', 'true');
    requestAnimationFrame(() => menu.classList.add('is-aberto'));
  });
  document.addEventListener('pointerdown', e => { if (!raiz.contains(e.target)) fechar(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') fechar(true); });

  const supabase = () => import('../supabase.js');
  $('[data-sair-nav]').addEventListener('click', async () => {
    const { sb } = await supabase();
    await sb.auth.signOut();
    gravar('apolo-nome', null);
    location.reload();
  });

  // nome e pagamentos pendentes, quando o navegador estiver livre
  (window.requestIdleCallback || (f => setTimeout(f, 1500)))(async () => {
    const { sb } = await supabase();
    const { data: { session } } = await sb.auth.getSession();
    if (!session) { location.reload(); return; } // sessão vencida: volta a mostrar "Entrar"
    const [{ data: c }, { count }] = await Promise.all([
      sb.from('clientes').select('nome').eq('id', session.user.id).maybeSingle(),
      sb.from('pedidos').select('id', { count: 'exact', head: true }).eq('status', 'aguardando').eq('cliente_id', session.user.id),
    ]);
    if (c?.nome) { pintar(c.nome); gravar('apolo-nome', c.nome); }
    if (count) {
      $('[data-alerta]').hidden = false;
      $('[data-aviso]').hidden = false;
      $('[data-aviso-texto]').textContent = count > 1 ? `${count} pagamentos pendentes` : '1 pagamento pendente';
      avatar.setAttribute('aria-label', `Abrir menu da conta, ${count} pagamento${count > 1 ? 's' : ''} pendente${count > 1 ? 's' : ''}`);
    }
  });
}
