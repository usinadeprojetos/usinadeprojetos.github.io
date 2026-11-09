# Site da Usina de Projetos — rotina de trabalho

Repositório: github.com/usinadeprojetos/usinadeprojetos.github.io (branch `main`), publicado pelo GitHub Pages em
https://usinadeprojetos.github.io/. Login no GitHub pela conta **mwengenhariaa** (Git Credential Manager).

O usuário edita o site de **dois computadores** (o da Prefeitura e o "Computador Casa"), e um robô também grava no
repositório todo dia. O GitHub é a cópia oficial; cada computador tem uma cópia local que precisa estar sincronizada.

Git no Windows: `C:\Program Files\Git\cmd\git.exe` (pode não estar no PATH do PowerShell da sessão — usar o caminho completo).

## Toda alteração pedida pelo usuário
1. `git pull` ANTES de editar — sempre, mesmo que a última edição tenha sido neste computador. O robô
   (`.github/workflows/atualizar.yml`) faz commit diário em `dados.js`/`dados.json` (~22h de Brasília) e o outro
   computador pode ter publicado algo.
2. Editar. Dados ficam em `dados.js` (o que a página usa) e `dados.json` (cópia) — manter os dois iguais.
   Página: `index.html`. Imagens: `img/`.
3. Conferir localmente no navegador do app (abrir `index.html`) antes de publicar.
4. `git add` + `git commit` (mensagem curta em português) + `git push` na mesma hora. O usuário quer que vá para o ar
   direto, sem pedir confirmação a cada alteração, e não quer alteração parada sem publicar em nenhum computador.
   Pages publica em 1–2 min; conferir em https://usinadeprojetos.github.io/.
5. Se o push for recusado (alguém publicou antes): `git pull --rebase` e push de novo. Se houver conflito na mesma
   linha, mostrar as duas versões ao usuário e deixar ele escolher — nunca descartar o trabalho de um dos lados.

## Nunca
- Publicar sem ter feito `git pull` antes, nem enviar arquivo inteiro pela API do GitHub ou pelo site do GitHub a partir
  de uma cópia antiga: isso apaga o que foi feito no outro computador e os dados do robô.
- `git push --force`, `git reset --hard` em commits já publicados, ou apagar o histórico.
- Editar à mão os campos que o robô regrava (andamento do ClickUp, acervo/galeria do Nextcloud) — ver README.md.

## Computador novo (ou pasta antiga desatualizada)
1. Instalar o Git: `winget install --id Git.Git -e --source winget`.
2. Clonar numa pasta NOVA: `git clone https://github.com/usinadeprojetos/usinadeprojetos.github.io.git "Site Usina de Projetos"`
   (por exemplo em Documentos). Não publicar a partir de pastas antigas do site; se houver nelas alguma alteração que
   não chegou ao ar, comparar com o GitHub e trazer só essa diferença para a pasta nova.
3. `git config --global user.name "mwengenhariaa"` e `git config --global user.email "mwengenhariaa@gmail.com"`.
4. Primeiro push (ou `git push --dry-run`) num terminal interativo, para o usuário fazer o login no GitHub pelo navegador.
   Quem digita a senha é o usuário, nunca o Claude.
