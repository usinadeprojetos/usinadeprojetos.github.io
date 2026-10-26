# Site da Usina de Projetos — Conselho dos Municípios Lindeiros ao Lago de Itaipu

Site estático: `index.html` (página), `dados.js` / `dados.json` (todos os dados) e `img/` (logos, satélite e galeria).
Não precisa de servidor, banco de dados nem instalação — basta publicar a pasta (GitHub Pages).

Endereço oficial: **https://usinadeprojetos.github.io/** (o endereço antigo, mwengenhariaa.github.io/site, redireciona para cá).

## Forçar uma atualização agora
Aba *Actions* → *Atualizar dados do ClickUp* → *Run workflow*. Em 2–4 minutos o site é republicado.

## Robôs de atualização (ClickUp + Nextcloud → site)
Rodam todo dia às 22h (horário de Brasília) pelo agendamento em `.github/workflows/atualizar.yml`. Só leem as fontes; a única gravação é neste repositório.

- `robo/atualizar.mjs` — lê a lista da Usina no ClickUp pela API e regera `dados.js` com o andamento de cada disciplina
  (status, responsáveis, percentuais, data). Segredo: `CLICKUP_TOKEN`.
- `robo/nextcloud.mjs` — lê o acervo em `/2_Prefeituras` do Nextcloud (WebDAV, só leitura). Para cada projeto com o campo
  `nextcloud` conta os arquivos de projeto produzidos pela Usina (por tipo, com a data do último) e, para os que têm
  `galeria_nextcloud`, monta a galeria: pranchas em PDF viram JPG (1ª página, 1600 px) e renders são redimensionados.
  Segredos: `NEXTCLOUD_URL`, `NEXTCLOUD_USER`, `NEXTCLOUD_SENHA` (senha de aplicativo).

Só os campos vindos das fontes mudam; municípios, descrições, valores, mapa, equipe, formalizações e financeiro ficam como estão.
Projetos novos no ClickUp precisam ser cadastrados em `dados.js` (campo `clickup` com o id do cartão). Para pôr uma imagem
nova na galeria, basta incluir o caminho do arquivo no Nextcloud em `galeria_nextcloud` do projeto — regra: só trabalho
produzido pela Usina (pranchas, renders, 3D), nunca fotos de visitas nem referências enviadas pelas prefeituras.
