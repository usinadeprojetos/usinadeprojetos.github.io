// Robô de atualização do site da Usina de Projetos.
// Lê a lista do ClickUp pela API oficial e regera dados.js / dados.json com o andamento de cada disciplina.
// Roda no GitHub Actions (ver .github/workflows/atualizar.yml). Precisa só do segredo CLICKUP_TOKEN.
// Só os campos vindos do ClickUp mudam (disciplinas, status, responsáveis, percentuais, data de atualização);
// o restante (municípios, descrições, valores de obra, mapa, equipe, formalizações, financeiro) fica como está.
import fs from 'node:fs/promises';

const LIST = process.env.CLICKUP_LIST || '901715616326';
const TOKEN = process.env.CLICKUP_TOKEN;
if (!TOKEN) { console.error('Falta o segredo CLICKUP_TOKEN'); process.exit(1); }
const DUPLICADOS = (process.env.CLICKUP_IGNORAR || '86e30k5r6').split(',').map(s => s.trim()).filter(Boolean); // cartões duplicados a ignorar

const H = { Authorization: TOKEN, 'Content-Type': 'application/json' };

async function lerTarefas() {
  const todas = [];
  for (let page = 0; page < 100; page++) {
    const r = await fetch(`https://api.clickup.com/api/v2/list/${LIST}/task?page=${page}&subtasks=true&include_closed=true`, { headers: H });
    if (!r.ok) throw new Error(`ClickUp respondeu ${r.status}: ${await r.text()}`);
    const j = await r.json();
    todas.push(...(j.tasks || []));
    if (j.last_page || !(j.tasks || []).length) break;
  }
  return todas;
}

const statusDe = t => (t.status && t.status.status) || '';
const mapStatus = s => /^conclu/i.test(s) ? 'concluido' : /^em desenv/i.test(s) ? 'andamento' : /^aguard/i.test(s) ? 'aguardando' : 'pendente';
const grupo = nome => {
  const s = nome.toLowerCase();
  if (/reuni/.test(s)) return 'marco';
  if (/spt|cbr|planialt|planiatim|ortofoto|benkelman|sondagem|escaneamento|local da obra|informa..es prefeitura|croqui prefeitura|projeto em revit prefeitura|confirmar projeto|contrata..o eng/.test(s)) return 'levantamentos';
  if (/or.amento|memorial/.test(s)) return 'orcamento';
  if (/pcip|bombeiro|inc.ndio/.test(s)) return 'pcip';
  if (/el.trico|l.gica|spda|fotovolt|energia|ilumina/.test(s)) return 'eletrico';
  if (/hidrossanit|hidro|.gua e esgoto|hidr.ulico/.test(s)) return 'hidrossanitario';
  if (/estrutur|funda..o|met.lica|concreto|conten..o|esfor.os|apontamentos estrutura/.test(s)) return 'estrutura';
  if (/asfalto|paviment|terraplan|drenagem|recape|viga/.test(s)) return 'viaria';
  if (/urban|paisag|arboriz|passeio|ciclovia|sinaliza/.test(s)) return 'urbanismo';
  if (/arquitet|visa|fachada|projeto b.sico|modelagem|croqui|ar-condicionado|g.s/.test(s)) return 'arquitetura';
  return 'outros';
};
const limpa = n => n.replace(/^[A-Z]{3}\.\s*[^.]*\.\s*/, '').replace(/^[A-Z]{3}\.\s*/, '').replace(/^Av Djalma\s*/, '').trim();
const data = ms => ms ? new Date(Number(ms)).toISOString().slice(0, 10) : null;
const nomes = t => (t.assignees || []).map(a => a.username || a.email || '').filter(Boolean);

const todas = await lerTarefas();
console.log(`ClickUp: ${todas.length} tarefas lidas`);
const filhos = id => todas.filter(t => (t.parent || null) === id && !DUPLICADOS.includes(t.id));

// município (cartão-raiz) -> projeto (cartão) -> disciplina (subtarefa) -> nota (sub-subtarefa)
const projetosCU = {};
for (const m of todas.filter(t => !t.parent && /^munic/i.test(statusDe(t)))) {
  for (const c of filhos(m.id)) {
    if (/^Reuni/i.test(c.name)) continue;
    const disciplinas = filhos(c.id).map(s => ({
      id: s.id, nome: limpa(s.name), grupo: grupo(s.name), status: mapStatus(statusDe(s)), status_clickup: statusDe(s),
      responsaveis: nomes(s), prazo: data(s.due_date), atualizado: data(s.date_updated), url: s.url, notas: filhos(s.id).map(x => x.name)
    })).filter(d => d.grupo !== 'marco');
    projetosCU[c.id] = { id: c.id, nome: c.name, status_clickup: statusDe(c), atualizado: data(c.date_updated), url: c.url, responsaveis: nomes(c), disciplinas };
  }
}

const dados = JSON.parse(await fs.readFile('dados.json', 'utf8'));
let tocados = 0;
for (const p of dados.projetos) {
  const ids = p.clickup || [];
  if (!ids.length) continue;
  const disc = [], resp = new Set(), urls = []; let upd = null;
  for (const id of ids) {
    const a = projetosCU[id]; if (!a) { console.warn(`Cartão ${id} (${p.slug}) não encontrado no ClickUp`); continue; }
    disc.push(...a.disciplinas); a.responsaveis.forEach(r => resp.add(r)); urls.push(a.url);
    if (!upd || (a.atualizado && a.atualizado > upd)) upd = a.atualizado;
  }
  const n = disc.length, c = disc.filter(d => d.status === 'concluido').length, d = disc.filter(d => d.status === 'andamento' || d.status === 'aguardando').length;
  Object.assign(p, { disciplinas: disc, responsaveis: [...resp], clickup_urls: urls, atualizado: upd, n_itens: n, n_concluidos: c, n_andamento: d, pct: n ? Math.round(100 * (c + 0.5 * d) / n) : 0 });
  tocados++;
}
dados.marcos_clickup = todas.filter(t => !t.parent && !/^munic/i.test(statusDe(t))).map(t => ({ id: t.id, nome: t.name, status: mapStatus(statusDe(t)), atualizado: data(t.date_updated), url: t.url, filhos: filhos(t.id).map(x => x.name) }));
dados.atualizado_em = new Date().toISOString().slice(0, 10);
const json = JSON.stringify(dados);
await fs.writeFile('dados.json', json);
await fs.writeFile('dados.js', 'window.DADOS = ' + json + ';');
console.log(`Atualizados ${tocados} projetos em ${dados.atualizado_em}`);
