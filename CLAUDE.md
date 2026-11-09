# Site da Usina de Projetos — rotina de trabalho

Repositório: github.com/usinadeprojetos/usinadeprojetos.github.io (branch `main`), publicado pelo GitHub Pages em
https://usinadeprojetos.github.io/. Login no GitHub pela conta **mwengenhariaa** (Git Credential Manager).

O usuário edita o site de **dois computadores** (o da Prefeitura e o "Computador Casa") e também por **sessões na nuvem
do Claude Code** (claude.ai/code, muitas vezes pelo celular, quando os computadores estão desligados). Um robô também
grava no repositório todo dia. O GitHub é a cópia oficial; cada computador tem uma cópia local que precisa estar
sincronizada. Este repositório é **tudo** o que o site precisa: não há build nem arquivos fora dele — os scripts antigos
de montagem (`build_*.ps1`, `meta.json`) que ficaram nos computadores estão aposentados; edita-se direto aqui.

Git no Windows: `C:\Program Files\Git\cmd\git.exe` (pode não estar no PATH do PowerShell da sessão — usar o caminho completo).

## Toda alteração pedida pelo usuário
1. `git pull` ANTES de editar — sempre, mesmo que a última edição tenha sido neste computador. O robô
   (`.github/workflows/atualizar.yml`) faz commit diário em `dados.js`/`dados.json` (~22h de Brasília) e o outro
   computador pode ter publicado algo.
2. Editar. Dados ficam em `dados.js` (o que a página usa) e `dados.json` (cópia) — manter os dois iguais.
   Página: `index.html`. Relatório de atividades: `relatorio.js`. Imagens: `img/`.
3. Conferir localmente no navegador do app (abrir `index.html`) antes de publicar.
4. `git add` + `git commit` (mensagem curta em português) + `git push` na mesma hora. O usuário quer que vá para o ar
   direto, sem pedir confirmação a cada alteração, e não quer alteração parada sem publicar em nenhum computador.
   Pages publica em 1–2 min; conferir em https://usinadeprojetos.github.io/.
5. Se o push for recusado (alguém publicou antes): `git pull --rebase` e push de novo. Se houver conflito na mesma
   linha, mostrar as duas versões ao usuário e deixar ele escolher — nunca descartar o trabalho de um dos lados.

## Sessão na nuvem (claude.ai/code — inclusive pelo celular)
O repositório já vem clonado e o Git já está autenticado; é Linux: ignore os caminhos do Windows e a seção
"Computador novo". Mesma rotina acima, com estes ajustes:
- Antes de editar: `git fetch origin main && git merge origin/main` (o clone pode ser de minutos atrás e o robô ou um
  computador pode ter publicado depois).
- Publicar = fazer o site ir para o ar, não só abrir um ramo. Primeiro tente `git push origin HEAD:main`.
  Se o ambiente recusar o push em `main`, envie o ramo da sessão (`git push -u origin <ramo claude/...>`): o workflow
  `.github/workflows/publicar-claude.yml` junta automaticamente qualquer ramo `claude/**` no `main` em ~1 min.
  **Não abrir pull request** — ninguém aprova PR aqui e a alteração ficaria parada.
- Depois de publicar, confirme que chegou ao `main` (`git fetch origin main && git log origin/main -3`) e, em 1–2 min,
  em https://usinadeprojetos.github.io/. Se o workflow falhar por conflito, traga o `main` (`git merge origin/main`),
  resolva como no passo 5 e envie de novo.
- Conferência visual: Chromium e Playwright já estão instalados (`require('playwright')`). Sirva a pasta
  (`python3 -m http.server 8000`) e tire captura em largura de celular (390 px) e de computador; o site precisa
  funcionar bem no celular (sem rolagem horizontal).
- Editar dados com script, não à mão no arquivo de 300 KB: ler `dados.json`, alterar e gravar os DOIS arquivos —
  `dados.json` = `JSON.stringify(d)` e `dados.js` = `'window.DADOS = ' + JSON.stringify(d) + ';'`.

## Nunca
- Publicar sem ter feito `git pull` antes, nem enviar arquivo inteiro pela API do GitHub ou pelo site do GitHub a partir
  de uma cópia antiga: isso apaga o que foi feito no outro computador e os dados do robô.
- `git push --force`, `git reset --hard` em commits já publicados, ou apagar o histórico.
- Editar à mão os campos que o robô regrava (andamento do ClickUp, acervo/galeria do Nextcloud) — ver README.md.
- Pôr senha, token ou segredo em qualquer arquivo: o repositório e este arquivo são públicos (o Pages serve tudo).

## Computador novo (ou pasta antiga desatualizada)
1. Instalar o Git: `winget install --id Git.Git -e --source winget`.
2. Clonar numa pasta NOVA: `git clone https://github.com/usinadeprojetos/usinadeprojetos.github.io.git "Site Usina de Projetos"`
   (por exemplo em Documentos). Não publicar a partir de pastas antigas do site; se houver nelas alguma alteração que
   não chegou ao ar, comparar com o GitHub e trazer só essa diferença para a pasta nova.
3. `git config --global user.name "mwengenhariaa"` e `git config --global user.email "mwengenhariaa@gmail.com"`.
4. Primeiro push (ou `git push --dry-run`) num terminal interativo, para o usuário fazer o login no GitHub pelo navegador.
   Quem digita a senha é o usuário, nunca o Claude.

## Contexto do projeto
- **Usina de Projetos**: equipe técnica do Conselho dos Municípios Lindeiros ao Lago de Itaipu que faz projetos de
  engenharia/arquitetura para os 16 municípios lindeiros. Convênio Itaipu nº 4500084088 (R$ 8.362.792 = Itaipu
  7.929.392 + Conselho 433.400), 24 meses, meta 64 projetos (4 por município). Coordenador: Fernando Rafael Federizzi.
  O usuário (João Felipe Martins Werle, eng. civil) é da equipe e mantém o site; o rodapé e o relatório levam o crédito
  "Site e robôs … desenvolvidos por João Felipe Martins Werle".
- **Seções da página** (`index.html`): Início, Mapa dos Projetos (Leaflet, malhas do IBGE, contorno do lago),
  Evolução (% por disciplina, vindo do ClickUp), Impacto Financeiro (valor do convênio × custo de contratar os projetos,
  pesquisa em PNCP/portais em `financeiro`), Formalizações (só metadados e resumo curto de ofícios/e-mails por
  município — nunca corpo nem anexos), Equipe Técnica (nome, conselho, telefone com link do WhatsApp, e-mail).
  Botão "Relatório" no menu abre `relatorio.js` (filtros de período/quinzena, município e projeto; comparativo usa
  `historico/AAAA-MM-DD.json`; login por e-mail + celular é só trava de conveniência — os dados são públicos).
  Modo apresentação: `#apresentacao`.
- **`dados.js` / `dados.json`**: `convenio`, `lotes_entrega`, `municipios[]`, `projetos[]` (`slug`, `clickup` = ids dos
  cartões, `sigla`, `nome`, `descricao`, `valor_obra`, `prioridade`, `situacao`, `fisico`, `nextcloud`,
  `galeria_nextcloud`, `imagens` + campos do robô), `equipe[]`, `cronologia[]` (ordenada por data), `imprensa[]`,
  `formalizacoes[]`, `financeiro`, `geojson`, `lago`, `satelite`.
- **Regras do usuário**:
  - Foz do Iguaçu e Santa Terezinha de Itaipu estão inadimplentes: ficam no site com `situacao: "paralisado"` e a
    observação "projetos paralisados" — não retirar.
  - Galeria: só trabalho produzido pela Usina (renders, pranchas, 3D). Nunca fotos ou referências enviadas pelas
    prefeituras. No Nextcloud, imagens só de pastas PROJETOS_USINA / _ARQ / ESTUDO PRELIMINAR; ignorar RECEBIDOS e Fotos.
  - Identidade visual: azul Lindeiros `#00AAF2`; "USINA" em Lexend ExtraBold `#0B5394`; "DE PROJETOS" `#595959`.
- **Robôs** (GitHub Actions, segredos `CLICKUP_TOKEN`, `NEXTCLOUD_URL/USER/SENHA` já cadastrados no repositório):
  rodam às 22h07 de Brasília, quando algo em `robo/**` muda e pelo botão *Run workflow* da aba Actions (o usuário
  consegue pelo app do GitHub no celular). O Nextcloud (csct.com.br) às vezes
  responde com página anti-robô ("One moment, please…"); o passo tem `continue-on-error` e o workflow fica verde
  mesmo assim — conferir o log. Não tentar contornar a proteção.
- **Subdomínio futuro**: usina.lindeiros.org.br (DNS do Conselho na Cloudflare). Só configurar domínio próprio no
  Pages depois que o CNAME `usina → usinadeprojetos.github.io` existir, senão o site sai do ar.
