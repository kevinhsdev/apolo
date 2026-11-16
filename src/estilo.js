// Importado depois dos CSS: marca que o estilo chegou e só então liga as transições,
// para nada animar do estilo padrão do navegador para o da página.
const html = document.documentElement;
html.classList.add('com-estilo');
void document.body.offsetHeight;
requestAnimationFrame(() => html.classList.add('assentou'));
