# Site da Apolo Studio

Vite + Three.js (a Lua) + Lenis. Base: template Norte (Profitize), adaptado.

- `npm run dev`: abre em http://localhost:5183
- `npm run build`: gera a pasta `dist/`, que vai para a hospedagem (Vercel, Netlify ou Cloudflare Pages: arraste a pasta ou conecte o repositório)

## Preencher antes de publicar
- `src/contato.js` → `WHATSAPP` (55 + DDD + número). Vazio = os botões abrem o Direct do Instagram.
- `index.html` e `privacidade.html` → e-mail `[preencher]@apolostudio.com.br`.
- Registrar **apolostudio.com.br** no Registro.br e o Instagram **@apolostudio.br**.

## Onde mexer
- Textos: `index.html`. Preços: atributos `data-avista` / `data-parcelado` dos `.plano`. Prazos: `src/motion/estado.js`.
- Cores: `src/styles/tokens.css`. Lua: `fonte/scripts/lua.py` (texturas NASA em `fonte/nasa/`).
- Imagem de compartilhamento: `fonte/og/og.html` → `public/og.png`.
