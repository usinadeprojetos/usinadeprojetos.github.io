// Grava um retrato compacto do dia em historico/AAAA-MM-DD.json (status de cada disciplina, % por projeto, acervo)
// e atualiza historico/index.json. É o que permite ao relatório comparar "como estava" x "como está" entre duas datas.
// Roda depois de robo/atualizar.mjs e robo/nextcloud.mjs (lê dados.json já atualizado). Várias execuções no mesmo dia sobrescrevem o retrato do dia.
import fs from 'node:fs/promises';

const dados = JSON.parse(await fs.readFile('dados.json', 'utf8'));
const agora = new Date(Date.now() - 3 * 3600 * 1000);   // horário de Brasília (UTC-3, sem horário de verão)
const dia = agora.toISOString().slice(0, 10), hora = agora.toISOString().slice(11, 16);
const COD = { concluido: 'c', andamento: 'a', aguardando: 'g', pendente: 'p' };

const projetos = {};
for (const p of dados.projetos) {
  if (!(p.n_itens > 0)) continue;
  const d = {};
  for (const x of p.disciplinas || []) if (x.id) d[x.id] = COD[x.status] || 'p';
  const o = { pct: p.pct, n: p.n_itens, c: p.n_concluidos, a: p.n_andamento, d };
  if (p.acervo) o.acervo = [p.acervo.usina, p.acervo.ultimo];
  projetos[p.slug] = o;
}
await fs.mkdir('historico', { recursive: true });
await fs.writeFile(`historico/${dia}.json`, JSON.stringify({ data: dia, hora, projetos }));
let idx = { dias: [] };
try { idx = JSON.parse(await fs.readFile('historico/index.json', 'utf8')); } catch {}
const dias = [...new Set([...(idx.dias || []), dia])].sort();
await fs.writeFile('historico/index.json', JSON.stringify({ desde: dias[0], dias }));
console.log(`Histórico: retrato de ${dia} ${hora} gravado (${Object.keys(projetos).length} projetos; ${dias.length} dias no índice, desde ${dias[0]})`);
