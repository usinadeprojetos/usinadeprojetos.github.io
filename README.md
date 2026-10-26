# Site da Usina de Projetos — Conselho dos Municípios Lindeiros ao Lago de Itaipu

Site estático: `index.html` (página), `dados.js` / `dados.json` (todos os dados) e `img/` (logos, satélite e galeria).
Não precisa de servidor, banco de dados nem instalação — basta publicar a pasta (GitHub Pages).

Endereço oficial: **https://usinadeprojetos.github.io/** (o endereço antigo, mwengenhariaa.github.io/site, redireciona para cá).

## Forçar uma atualização agora
Aba *Actions* → *Atualizar dados do ClickUp* → *Run workflow*. Em 1–2 minutos o site é republicado.

## Atualizar à mão
Substitua `dados.js` (e `dados.json`) e faça o commit. O GitHub Pages republica em cerca de um minuto.

## Robô de atualização (ClickUp → site)
`robo/atualizar.mjs` lê a lista da Usina no ClickUp pela API e regera `dados.js` com o andamento de cada disciplina.
O agendamento está em `.github/workflows/atualizar.yml` (a cada 3 horas, ou pelo botão *Run workflow* na aba Actions).

Para ligar:
1. No ClickUp: *Settings → Apps → API Token → Generate*.
2. No GitHub: *Settings → Secrets and variables → Actions → New repository secret* — nome `CLICKUP_TOKEN`, valor = o token.
3. Aba *Actions* → *Atualizar dados do ClickUp* → *Run workflow* para testar.

Só os campos vindos do ClickUp mudam (disciplinas, status, responsáveis, percentuais e data). Projetos novos no ClickUp
precisam ser cadastrados em `dados.js` (campo `clickup` com o id do cartão) para aparecerem no mapa e nas tabelas.
