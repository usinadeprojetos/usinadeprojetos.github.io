/* Relatório de atividades — exportação com acesso restrito (coordenação da Usina).
   Carregado por index.html depois de dados.js. Compara o retrato do início do período (historico/AAAA-MM-DD.json,
   gravado todo dia pelo robô) com o de hoje (dados.js) e lista o que aconteceu no período. */
(() => {
'use strict';
const D = window.DADOS; if (!D) return;
const $ = (s, r) => (r || document).querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtD = s => { if (!s) return ''; const [y, m, d] = String(s).slice(0, 10).split('-'); return `${d}/${m}/${y}`; };
const fmtDs = s => { if (!s) return ''; const [y, m, d] = String(s).slice(0, 10).split('-'); return `${d}/${m}`; };
const hoje = () => new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);          // horário de Brasília
const agoraTxt = () => { const t = new Date(Date.now() - 3 * 3600e3); return `${fmtD(t.toISOString())} ${t.toISOString().slice(11, 16)}`; };
const addDias = (iso, n) => { const t = new Date(iso + 'T12:00:00Z'); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };
const nDias = (a, b) => Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 864e5);
const dia = s => String(s || '').slice(0, 10);
const STL = { concluido: 'Concluída', andamento: 'Em desenvolvimento', aguardando: 'Aguardando', pendente: 'Pendente' };
const COD = { concluido: 'c', andamento: 'a', aguardando: 'g', pendente: 'p' };
const GR = [['levantamentos', 'Levantamentos'], ['arquitetura', 'Arquitetura'], ['urbanismo', 'Urbanismo'], ['estrutura', 'Estrutura'], ['eletrico', 'Elétrico'], ['hidrossanitario', 'Hidrossanitário'], ['viaria', 'Viária'], ['pcip', 'PCIP'], ['orcamento', 'Orçamento'], ['outros', 'Outros']];
// quem pode exportar: hash SHA-256 de "e-mail|celular" (os dados em si estão na seção Equipe; aqui só o resumo criptográfico)
const USUARIOS = [
  { nome: 'João Felipe Martins Werle', papel: 'Engenheiro civil', h: '5d2af7bb746b0b57baf5d8a5a456cd447a9a93fbe0ed19cc889c9ff2d851fc8d' },
  { nome: 'Fernando Rafael Federizzi', papel: 'Coordenador da Usina', h: '74692bdb68c882a7c5ce62a02223ff01d1fc9657a4eb6abe049c31286c69ddf6' },
  { nome: 'Douglas André Roesler', papel: 'Captação de recursos', h: 'df68c36c7e300f58d3b3d65d2fa640d8433052032e2c717c7822935728c0763f' }
];
const MUN = Object.fromEntries((D.municipios || []).map(m => [m.sigla, m]));
const P = (D.projetos || []).filter(p => p.situacao !== 'cancelado').map(p => Object.assign({}, p, { mun: MUN[p.sigla] || { sigla: p.sigla, nome: p.sigla } }));
const THREADS = Array.isArray(D.formalizacoes) ? D.formalizacoes : ((D.formalizacoes && D.formalizacoes.value) || []);
const siglaDe = nome => { const n = String(nome || '').toLowerCase(); const m = (D.municipios || []).find(x => n.startsWith(x.nome.toLowerCase().slice(0, 8))); return m ? m.sigla : null; };
const SITE = (D.site_url || '').replace(/\/$/, '') || 'usinadeprojetos.github.io';

/* ---------- estilos do painel ---------- */
const css = `
.rel-bg{position:fixed;inset:0;background:rgba(5,15,25,.62);z-index:300;display:flex;align-items:flex-start;justify-content:center;padding:28px 16px;overflow:auto}
.rel-box{background:var(--surface,#fff);color:var(--fg,#17202a);border-radius:14px;max-width:580px;width:100%;padding:22px 22px 18px;box-shadow:0 20px 60px rgba(0,0,0,.45);position:relative}
.rel-box h3{margin:0 0 4px;font-family:var(--font-display,inherit);font-size:1.15rem}
.rel-box .sub{color:var(--muted,#667);font-size:.9rem;margin:0 0 12px}
.rel-box label{display:block;font-size:.84rem;font-weight:600;margin:10px 0 4px}
.rel-box input,.rel-box select{width:100%;padding:9px 10px;border:1px solid var(--line,#cfd6dd);border-radius:8px;background:var(--surface-2,#fff);color:inherit;font:inherit;font-size:.95rem}
.rel-box .row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.rel-box .chips{display:flex;flex-wrap:wrap;gap:6px}
.rel-box .chips button{border:1px solid var(--line,#cfd6dd);background:none;color:inherit;border-radius:999px;padding:6px 12px;cursor:pointer;font:inherit;font-size:.86rem}
.rel-box .chips button.on{background:var(--brand-deep,#0B5394);color:#fff;border-color:transparent}
.rel-box .lista{max-height:200px;overflow:auto;border:1px solid var(--line,#cfd6dd);border-radius:8px;padding:4px 10px 8px;background:var(--surface-2,#fff)}
.rel-box .lista label{display:flex;gap:8px;align-items:flex-start;font-weight:500;margin:0;padding:4px 0;font-size:.88rem;cursor:pointer}
.rel-box .lista input{width:auto;margin:3px 0 0}
.rel-box .lista small{color:var(--muted,#667)}
.rel-box .lista .mun{font-size:.72rem;text-transform:uppercase;letter-spacing:.05em;color:var(--brand-deep,#0B5394);margin:8px 0 2px;font-weight:700}
.rel-box .opts label{display:flex;gap:8px;align-items:center;font-weight:500;margin:6px 0}
.rel-box .opts input{width:auto;margin:0}
.rel-box .acoes{display:flex;gap:8px;justify-content:flex-end;margin-top:16px;flex-wrap:wrap}
.rel-box .btn{border:0;border-radius:8px;padding:10px 16px;cursor:pointer;font:inherit;font-weight:600}
.rel-box .btn.p{background:var(--brand-deep,#0B5394);color:#fff}
.rel-box .btn.s{background:var(--surface-2,#eef2f6);color:inherit}
.rel-box .btn[disabled]{opacity:.6;cursor:wait}
.rel-box .err{color:#c0392b;font-size:.88rem;margin-top:8px;min-height:1.2em}
.rel-box .x{position:absolute;top:10px;right:12px;border:0;background:none;font-size:1.5rem;cursor:pointer;color:inherit;line-height:1}
.rel-box .quem{font-size:.82rem;color:var(--muted,#667);margin-bottom:6px;display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap}
.rel-box .quem a{color:var(--brand-deep,#0B5394);cursor:pointer}
.rel-box .nota{font-size:.78rem;color:var(--muted,#667);margin-top:10px}
@media(max-width:560px){.rel-box .row{grid-template-columns:1fr}.rel-bg{padding:12px 8px}}
`;
const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

/* ---------- login ---------- */
async function sha256(s) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); }
function normTel(t) { let d = String(t || '').replace(/\D/g, ''); if ((d.length === 13 || d.length === 12) && d.startsWith('55')) d = d.slice(2); if (d.length === 9) d = '45' + d; if (d.length === 8) d = '459' + d; return d; }
const usuarioAtual = () => { try { return JSON.parse(sessionStorage.getItem('rel_user') || 'null'); } catch { return null; } };
let tentativas = 0;

let bg = null;
function fechar() { if (bg) { bg.remove(); bg = null; } }
function caixa(html) { fechar(); bg = document.createElement('div'); bg.className = 'rel-bg'; bg.innerHTML = `<div class="rel-box" role="dialog" aria-modal="true"><button class="x" aria-label="Fechar">×</button>${html}</div>`; bg.addEventListener('click', e => { if (e.target === bg || e.target.classList.contains('x')) fechar(); }); document.body.appendChild(bg); return $('.rel-box', bg); }

function telaLogin() {
  const box = caixa(`<h3>Relatório de atividades</h3><p class="sub">Acesso restrito à coordenação da Usina.</p>
    <form id="rel-login"><label>Login</label><input type="text" name="email" autocomplete="username" autocapitalize="off" spellcheck="false" required>
    <label>Senha</label><input type="password" name="tel" autocomplete="current-password" required>
    <div class="err" id="rel-err"></div>
    <div class="acoes"><button type="button" class="btn s" data-x>Cancelar</button><button type="submit" class="btn p">Entrar</button></div></form>`);
  $('[data-x]', box).onclick = fechar;
  $('input[name=email]', box).focus();
  $('#rel-login', box).onsubmit = async e => {
    e.preventDefault();
    const f = e.target, btn = $('button[type=submit]', f), err = $('#rel-err', box);
    btn.disabled = true; err.textContent = '';
    if (tentativas >= 3) await new Promise(r => setTimeout(r, 2500));
    try {
      const h = await sha256(f.email.value.trim().toLowerCase() + '|' + normTel(f.tel.value));
      const u = USUARIOS.find(x => x.h === h);
      if (!u) { tentativas++; err.textContent = 'Login ou senha incorretos.'; btn.disabled = false; return; }
      sessionStorage.setItem('rel_user', JSON.stringify({ nome: u.nome, papel: u.papel }));
      telaForm();
    } catch (ex) { err.textContent = 'Não foi possível validar o acesso neste navegador (' + ex.message + ').'; btn.disabled = false; }
  };
}

/* ---------- formulário ---------- */
function telaForm() {
  const u = usuarioAtual(); if (!u) return telaLogin();
  let salvo = {}; try { salvo = JSON.parse(localStorage.getItem('rel_opts') || '{}'); } catch {}
  const munComProj = (D.municipios || []).filter(m => P.some(p => p.sigla === m.sigla)).sort((a, b) => a.nome.localeCompare(b.nome));
  const box = caixa(`<h3>Relatório de atividades</h3>
    <div class="quem"><span>Acesso: <b>${esc(u.nome)}</b> · ${esc(u.papel)}</span><a id="rel-sair">sair</a></div>
    <label>Período</label><div class="chips" id="rel-chips"><button type="button" data-d="7">Últimos 7 dias</button><button type="button" data-d="15">Últimos 15 dias</button><button type="button" data-d="30">Últimos 30 dias</button><button type="button" data-d="0">Personalizado</button></div>
    <label>Quinzena <small style="font-weight:400">(relatórios quinzenais desde o início do ClickUp)</small></label><select id="rel-quinz"><option value="">— escolher uma quinzena —</option>${quinzenas().slice().reverse().map(q => `<option value="${q.de}|${q.ate}">${esc(rotQuinz(q))} (${fmtDs(q.de)} a ${fmtDs(q.ate)})${q.ate > hoje() ? ' — em andamento' : ''}</option>`).join('')}</select>
    <div class="row"><div><label>De</label><input type="date" id="rel-de"></div><div><label>Até</label><input type="date" id="rel-ate"></div></div>
    <label>Município</label><select id="rel-mun"><option value="">Todos os municípios</option>${munComProj.map(m => `<option value="${esc(m.sigla)}">${esc(m.nome)}</option>`).join('')}</select>
    <label>Projetos <small style="font-weight:400">(marque um ou mais; nenhum marcado = todos)</small></label>
    <input type="search" id="rel-busca" placeholder="filtrar pelo nome…" style="margin-bottom:6px">
    <div class="lista" id="rel-proj"></div>
    <div class="nota" id="rel-sel" style="margin-top:4px"></div>
    <label>Conteúdo</label><div class="opts">
      <label><input type="checkbox" id="rel-graf" checked> Gráficos de evolução (Gantt, curva de andamento, concluídas por quinzena)</label>
      <label><input type="checkbox" id="rel-nc" checked> Arquivos inseridos no Nextcloud no período</label>
      <label><input type="checkbox" id="rel-acont" checked> Acontecimentos do período (conclusões, formalizações, acervo, marcos)</label>
      <label><input type="checkbox" id="rel-disc" checked> Situação por disciplina</label>
      <label><input type="checkbox" id="rel-prazos" checked> Próximos prazos e atrasos</label>
      <label><input type="checkbox" id="rel-img"> Imagens da galeria (até 4 projetos selecionados)</label></div>
    <div class="err" id="rel-err"></div>
    <div class="acoes"><button type="button" class="btn s" id="rel-copiar">Copiar resumo (texto)</button><button type="button" class="btn p" id="rel-gerar">Gerar relatório</button></div>
    <p class="nota">O relatório abre em uma nova aba, pronto para imprimir ou salvar em PDF. Histórico diário disponível desde ${esc(fmtD(D.historico_desde || '2026-10-23'))}; antes disso o comparativo usa as datas do ClickUp.</p>`);
  const de = $('#rel-de', box), ate = $('#rel-ate', box), mun = $('#rel-mun', box), proj = $('#rel-proj', box), chips = $('#rel-chips', box), busca = $('#rel-busca', box), selInfo = $('#rel-sel', box);
  const sel = new Set(Array.isArray(salvo.slugs) ? salvo.slugs.filter(s => P.some(p => p.slug === s)) : []);   // projetos marcados
  const quinz = $('#rel-quinz', box);
  const marcar = d => { [...chips.children].forEach(b => b.classList.toggle('on', b.dataset.d === String(d))); if (d) quinz.value = ''; };
  const aplicarPeriodo = d => { ate.value = hoje(); de.value = addDias(hoje(), -(d - 1)); marcar(d); };
  chips.onclick = e => { const b = e.target.closest('button'); if (!b) return; const d = Number(b.dataset.d); if (d) aplicarPeriodo(d); else { marcar(0); de.focus(); } };
  de.onchange = ate.onchange = () => { marcar(0); quinz.value = ''; };
  quinz.onchange = () => { if (!quinz.value) return; const [a, b] = quinz.value.split('|'); de.value = a; ate.value = b; marcar(0); };
  const resumoSel = () => { selInfo.textContent = sel.size ? `${sel.size} projeto(s) marcado(s): ${[...sel].map(s => (P.find(p => p.slug === s) || {}).sigla).join(', ')}` : 'Nenhum marcado = todos os projetos do município escolhido.'; };
  const encherProjetos = () => {
    const sg = mun.value, q = (busca.value || '').trim().toLowerCase();
    const lista = P.filter(p => (!sg || p.sigla === sg) && (!q || (p.nome + ' ' + p.mun.nome + ' ' + p.sigla).toLowerCase().includes(q))).sort((a, b) => a.mun.nome.localeCompare(b.mun.nome) || a.nome.localeCompare(b.nome));
    let html = '', ultimo = null;
    for (const p of lista) {
      if (p.mun.nome !== ultimo) { ultimo = p.mun.nome; html += `<div class="mun">${esc(p.mun.nome)}</div>`; }
      html += `<label><input type="checkbox" value="${esc(p.slug)}"${sel.has(p.slug) ? ' checked' : ''}> <span>${esc(p.nome)}${p.n_itens ? '' : ' <small>(sem ClickUp)</small>'}${p.situacao === 'paralisado' ? ' <small>(paralisado)</small>' : ''}</span></label>`;
    }
    proj.innerHTML = html || '<div class="nota">Nenhum projeto encontrado.</div>';
    resumoSel();
  };
  proj.addEventListener('change', e => { const c = e.target; if (c && c.type === 'checkbox') { if (c.checked) sel.add(c.value); else sel.delete(c.value); resumoSel(); } });
  busca.oninput = encherProjetos;
  mun.onchange = () => { const sg = mun.value; if (sg) [...sel].forEach(s => { const p = P.find(x => x.slug === s); if (!p || p.sigla !== sg) sel.delete(s); }); encherProjetos(); };
  // restaura escolhas anteriores
  if (salvo.sigla && MUN[salvo.sigla]) mun.value = salvo.sigla; encherProjetos();
  if (salvo.dias) aplicarPeriodo(salvo.dias); else if (salvo.de && salvo.ate) { de.value = salvo.de; ate.value = salvo.ate; marcar(0); } else aplicarPeriodo(30);
  ['graf', 'nc', 'acont', 'disc', 'prazos', 'img'].forEach(k => { if (salvo[k] != null) $('#rel-' + k, box).checked = !!salvo[k]; });
  if (de.value && ate.value && [...quinz.options].some(op => op.value === `${de.value}|${ate.value}`)) quinz.value = `${de.value}|${ate.value}`;
  $('#rel-sair', box).onclick = () => { sessionStorage.removeItem('rel_user'); telaLogin(); };
  const opcoes = () => {
    const o = { de: de.value, ate: ate.value, sigla: mun.value || null, slugs: [...sel], incGraf: $('#rel-graf', box).checked, incNC: $('#rel-nc', box).checked, incAcont: $('#rel-acont', box).checked, incDisc: $('#rel-disc', box).checked, incPrazos: $('#rel-prazos', box).checked, incImg: $('#rel-img', box).checked, usuario: u };
    const chip = [...chips.children].find(b => b.classList.contains('on')); o.dias = chip && Number(chip.dataset.d) ? Number(chip.dataset.d) : 0;
    if (!o.de || !o.ate) throw new Error('Informe as duas datas.');
    if (o.de > o.ate) throw new Error('A data inicial é maior que a final.');
    if (nDias(o.de, o.ate) > 400) throw new Error('Período máximo: 400 dias.');
    try { localStorage.setItem('rel_opts', JSON.stringify({ sigla: o.sigla, slugs: o.slugs, dias: o.dias, de: o.de, ate: o.ate, graf: o.incGraf, nc: o.incNC, acont: o.incAcont, disc: o.incDisc, prazos: o.incPrazos, img: o.incImg })); } catch {}
    return o;
  };
  $('#rel-gerar', box).onclick = async e => {
    const err = $('#rel-err', box); err.textContent = ''; let o; try { o = opcoes(); } catch (ex) { err.textContent = ex.message; return; }
    const w = window.open('', '_blank');   // aberto no clique, antes de qualquer espera, para o navegador não bloquear
    if (w) { w.document.write('<!doctype html><title>Gerando relatório…</title><p style="font:15px system-ui;padding:24px">Gerando o relatório…</p>'); }
    e.target.disabled = true;
    try { const r = await montar(o); if (w) { w.document.open(); w.document.write(r.html); w.document.close(); } else { err.textContent = 'O navegador bloqueou a nova aba. Libere pop-ups para este site e tente de novo.'; } }
    catch (ex) { err.textContent = 'Falha ao gerar: ' + ex.message; if (w) w.close(); }
    e.target.disabled = false;
  };
  $('#rel-copiar', box).onclick = async e => {
    const err = $('#rel-err', box); err.textContent = ''; let o; try { o = opcoes(); } catch (ex) { err.textContent = ex.message; return; }
    e.target.disabled = true;
    try { const r = await montar(o); try { await navigator.clipboard.writeText(r.texto); err.style.color = '#1b7f3b'; err.textContent = 'Resumo copiado — cole no WhatsApp ou no e-mail.'; } catch { window.prompt('Copie o resumo:', r.texto); } }
    catch (ex) { err.textContent = 'Falha: ' + ex.message; }
    setTimeout(() => { err.style.color = ''; }, 4000); e.target.disabled = false;
  };
}

/* ---------- histórico ---------- */
async function lerJson(url) { const r = await fetch(url, { cache: 'no-store' }); if (!r.ok) throw new Error(url + ' ' + r.status); return r.json(); }
async function indiceHistorico() { try { return (await lerJson('historico/index.json')).dias || []; } catch { return []; } }
const retratoAte = (dias, data) => { const a = dias.filter(d => d <= data); return a.length ? a[a.length - 1] : null; };
function retratoAoVivo() {
  const projetos = {};
  for (const p of P) { if (!(p.n_itens > 0)) continue; const d = {}; for (const x of p.disciplinas || []) if (x.id) d[x.id] = COD[x.status] || 'p'; const o = { pct: p.pct, n: p.n_itens, c: p.n_concluidos, a: p.n_andamento, d }; if (p.acervo) o.acervo = [p.acervo.usina, p.acervo.ultimo]; projetos[p.slug] = o; }
  return { data: hoje(), hora: '', projetos, aoVivo: true, fonte: 'aoVivo' };
}
// Situação numa data anterior ao primeiro retrato diário (23/10/2026), reconstruída pelas datas do ClickUp:
// concluída se a data de conclusão é anterior; status atual se a última atualização da disciplina é anterior (nada mudou depois);
// nos demais casos (houve mudança depois e o ClickUp não guarda o histórico de status) conta como pendente — estimativa conservadora.
function reconstruir(data) {
  const projetos = {};
  for (const p of P) {
    if (!(p.n_itens > 0)) continue;
    const d = {}; let n = 0, c = 0, a = 0;
    for (const x of p.disciplinas || []) {
      if (!x.id || (x.criado_em && x.criado_em > data)) continue;
      let s;
      if (x.status === 'concluido' && x.concluido_em && x.concluido_em <= data) s = 'c';   // "aguardando" também recebe data de fechamento no ClickUp: não conta como conclusão
      else if (x.status !== 'concluido' && x.atualizado && x.atualizado <= data) s = COD[x.status] || 'p';
      else if (x.status === 'aguardando' && x.concluido_em && x.concluido_em <= data) s = 'g';
      else s = 'p';
      d[x.id] = s; n++; if (s === 'c') c++; else if (s === 'a' || s === 'g') a++;
    }
    if (n) projetos[p.slug] = { pct: Math.round(100 * (c + 0.5 * a) / n), n, c, a, d };
  }
  return { data, hora: '', projetos, fonte: 'reconstruido' };
}
const cacheRetrato = new Map();
async function estadoEm(data, dias) {
  if (data >= hoje()) return retratoAoVivo();
  const dS = dias.length && data >= dias[0] ? retratoAte(dias, data) : null;
  if (dS) {
    if (!cacheRetrato.has(dS)) cacheRetrato.set(dS, lerJson(`historico/${dS}.json`).catch(() => null));
    const r = await cacheRetrato.get(dS);
    if (r) return Object.assign({ fonte: 'retrato' }, r);
  }
  return reconstruir(data);
}
let ncPromessa = null;
const arquivosNC = () => (ncPromessa = ncPromessa || lerJson('nextcloud/arquivos.json').catch(() => null));
const INICIO_CLICKUP = '2026-08-01';
// quinzenas: 1–15 e 16–último dia de cada mês, de agosto/2026 até hoje
function quinzenas() {
  const out = [], H = hoje(); let y = 2026, m = 8;
  for (let k = 0; k < 120; k++) {
    const mm = String(m).padStart(2, '0'), ult = new Date(Date.UTC(y, m, 0)).getUTCDate();
    for (const [a, b] of [[1, 15], [16, ult]]) {
      const de = `${y}-${mm}-${String(a).padStart(2, '0')}`, ate = `${y}-${mm}-${String(b).padStart(2, '0')}`;
      if (de > H) return out;
      out.push({ de, ate, n: out.length + 1 });
    }
    if (++m > 12) { m = 1; y++; }
  }
  return out;
}
const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const rotQuinz = q => `${Number(q.de.slice(8)) === 1 ? '1ª' : '2ª'} quinzena de ${MES[Number(q.de.slice(5, 7)) - 1]}/${q.de.slice(2, 4)}`;

/* ---------- gráficos (SVG) ---------- */
const COR = { brand: '#0B5394', ciano: '#00AAF2', c: '#1b7f3b', a: '#e0a100', g: '#7a8ba0', p: '#c7ced6', red: '#b3261e', grade: '#e3e8ee', txt: '#334', mudo: '#778' };
const corta = (s, n) => { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
function eixoMeses(x, A0, A1, y0, y1) {
  let s = '';
  let [yy, mm] = A0.split('-').map(Number); mm--;
  for (let k = 0; k < 40; k++) {
    const d = `${yy}-${String(mm + 1).padStart(2, '0')}-01`;
    if (d > A1) break;
    if (d >= A0) s += `<line x1="${x(d)}" x2="${x(d)}" y1="${y0}" y2="${y1}" stroke="${COR.grade}"/><text x="${x(d) + 3}" y="${y0 - 4}" font-size="10" fill="${COR.mudo}">${MES[mm]}/${String(yy).slice(2)}</text>`;
    if (++mm > 11) { mm = 0; yy++; }
  }
  return s;
}
// Gantt: uma linha por projeto (ou por disciplina, quando o relatório é de um projeto só)
function svgGantt(linhas, o, ateEf, fim) {
  const unico = linhas.length === 1;
  const itens = [];
  if (unico) {
    const l = linhas[0], sF = fim.projetos[l.p.slug];
    for (const x of (l.p.disciplinas || []).filter(x => sF && sF.d && sF.d[x.id])) {
      const st = sF.d[x.id];
      const ini = x.criado_em || INICIO_CLICKUP;
      const fimB = st === 'c' && x.concluido_em ? x.concluido_em : (x.prazo || null);
      itens.push({ rot: x.nome, sub: (x.responsaveis || []).join(', '), ini, fim: fimB, st, prazo: x.prazo, pct: st === 'c' ? 100 : st === 'a' || st === 'g' ? 50 : 0, marcas: [] });
    }
    itens.sort((a, b) => (a.st === 'c' ? 0 : 1) - (b.st === 'c' ? 0 : 1) || (a.fim || '9').localeCompare(b.fim || '9'));
  } else {
    for (const l of linhas) {
      const sF = fim.projetos[l.p.slug]; if (!sF) continue;
      const disc = (l.p.disciplinas || []).filter(x => sF.d && sF.d[x.id]);
      const ini = disc.map(x => x.criado_em).filter(Boolean).sort()[0] || INICIO_CLICKUP;
      const prazoMax = disc.map(x => x.prazo).filter(Boolean).sort().pop() || null;
      const fimB = l.p.lote_entrega || prazoMax;
      const marcas = disc.filter(x => sF.d[x.id] === 'c' && x.concluido_em && x.concluido_em <= ateEf).map(x => x.concluido_em);
      itens.push({ rot: `${l.p.sigla} · ${l.p.nome}`, ini, fim: fimB, pct: sF.pct, marcas, lote: !!l.p.lote_entrega, par: l.p.situacao === 'paralisado' });
    }
    itens.sort((a, b) => (a.fim || '9999').localeCompare(b.fim || '9999') || b.pct - a.pct);
  }
  if (!itens.length) return '';
  const A0 = INICIO_CLICKUP;
  const datas = itens.map(i => i.fim).filter(Boolean).concat([ateEf]).sort();
  let A1 = datas[datas.length - 1]; A1 = addDias(A1 > '2026-12-31' ? A1 : '2026-12-31', 6);
  const L = 268, R = 46, W = 900, T = 30, RH = unico ? 24 : 22, H = T + itens.length * RH + 34;
  const span = nDias(A0, A1), x = d => (L + (nDias(A0, d < A0 ? A0 : d > A1 ? A1 : d) / span) * (W - L - R)).toFixed(1);
  let s = `<svg viewBox="0 0 ${W} ${H}" width="100%" xmlns="http://www.w3.org/2000/svg" font-family="Segoe UI, system-ui, sans-serif">`;
  s += `<rect x="${x(o.de)}" y="${T - 2}" width="${Math.max(2, x(ateEf) - x(o.de))}" height="${itens.length * RH + 4}" fill="${COR.ciano}" opacity=".12"/>`;
  s += eixoMeses(x, A0, A1, T - 2, T + itens.length * RH + 2);
  itens.forEach((it, k) => {
    const y = T + k * RH, yc = y + RH / 2;
    if (k % 2) s += `<rect x="0" y="${y}" width="${W}" height="${RH}" fill="#f6f8fa" opacity=".7"/>`;
    s += `<text x="4" y="${yc + 3.5}" font-size="10.5" fill="${COR.txt}">${esc(corta(it.rot, unico ? 44 : 46))}</text>`;
    const x0 = Number(x(it.ini)), bh = unico ? 11 : 10, by = yc - bh / 2;
    if (unico) {
      const x1 = Number(x(it.fim || ateEf)), w = Math.max(3, x1 - x0), cor = COR[it.st] || COR.p;
      s += `<rect x="${x0}" y="${by}" width="${w}" height="${bh}" rx="2" fill="${cor}" opacity="${it.st === 'p' ? .9 : 1}"${it.fim ? '' : ` stroke="${COR.mudo}" stroke-dasharray="3 2" fill-opacity=".35"`}/>`;
      if (it.prazo && it.st !== 'c') { const xp = Number(x(it.prazo)); s += `<path d="M${xp} ${yc - 6} L${xp + 5} ${yc} L${xp} ${yc + 6} L${xp - 5} ${yc} Z" fill="${it.prazo < ateEf ? COR.red : COR.brand}"/>`; }
      s += `<text x="${W - 4}" y="${yc + 3.5}" font-size="10" text-anchor="end" fill="${COR.mudo}">${esc(STL[{ c: 'concluido', a: 'andamento', g: 'aguardando', p: 'pendente' }[it.st]] || '')}</text>`;
    } else {
      const x1 = Number(x(it.fim || A1)), w = Math.max(3, x1 - x0), atras = it.fim && it.fim < ateEf && it.pct < 100;
      s += `<rect x="${x0}" y="${by}" width="${w}" height="${bh}" rx="2" fill="#dfe6ee"${it.fim ? '' : ` stroke="${COR.mudo}" stroke-dasharray="3 2"`}${atras ? ` stroke="${COR.red}" stroke-width="1.4"` : ''}/>`;
      s += `<rect x="${x0}" y="${by}" width="${(w * it.pct / 100).toFixed(1)}" height="${bh}" rx="2" fill="${it.par ? COR.g : COR.brand}"/>`;
      for (const m of it.marcas) s += `<circle cx="${x(m)}" cy="${by - 2.5}" r="2.2" fill="${COR.c}"/>`;
      if (it.fim) s += `<path d="M${x1} ${yc - 6} L${x1 + 5} ${yc} L${x1} ${yc + 6} L${x1 - 5} ${yc} Z" fill="${atras ? COR.red : it.lote ? COR.ciano : COR.mudo}"/>`;
      s += `<text x="${W - 4}" y="${yc + 3.5}" font-size="10.5" font-weight="700" text-anchor="end" fill="${COR.brand}">${it.pct}%</text>`;
    }
  });
  const xf = x(ateEf);
  s += `<line x1="${xf}" x2="${xf}" y1="${T - 6}" y2="${T + itens.length * RH + 4}" stroke="${COR.red}" stroke-width="1.4" stroke-dasharray="4 3"/><text x="${xf}" y="${T + itens.length * RH + 16}" font-size="10" text-anchor="middle" fill="${COR.red}">fim do período ${fmtDs(ateEf)}</text>`;
  return s + '</svg>';
}
// curva: andamento médio (%) ao longo do tempo, com o período destacado
function svgCurva(pontos, o, ateEf, corte) {
  if (pontos.length < 2) return '';
  const W = 900, H = 230, L = 40, R = 16, T = 18, B = 30;
  const A0 = pontos[0].data, A1 = pontos[pontos.length - 1].data, span = Math.max(1, nDias(A0, A1));
  const x = d => (L + (nDias(A0, d) / span) * (W - L - R)).toFixed(1), y = v => (T + (1 - v / 100) * (H - T - B)).toFixed(1);
  const max = Math.max(...pontos.map(p => p.pct));
  const topo = Math.min(100, Math.max(20, Math.ceil((max + 5) / 10) * 10)), yy = v => (T + (1 - v / topo) * (H - T - B)).toFixed(1);
  let s = `<svg viewBox="0 0 ${W} ${H}" width="100%" xmlns="http://www.w3.org/2000/svg" font-family="Segoe UI, system-ui, sans-serif">`;
  const de = o.de < A0 ? A0 : o.de;
  s += `<rect x="${x(de)}" y="${T}" width="${Math.max(2, x(ateEf) - x(de))}" height="${H - T - B}" fill="${COR.ciano}" opacity=".12"/>`;
  for (let v = 0; v <= topo; v += topo / 5) s += `<line x1="${L}" x2="${W - R}" y1="${yy(v)}" y2="${yy(v)}" stroke="${COR.grade}"/><text x="${L - 6}" y="${Number(yy(v)) + 3.5}" font-size="10" text-anchor="end" fill="${COR.mudo}">${Math.round(v)}%</text>`;
  s += eixoMeses(x, A0, A1, H - B + 14, H - B).replace(/y="[\d.]+" font-size/g, `y="${H - 8}" font-size`);
  let k0 = pontos.findIndex(p => p.data >= corte); if (k0 < 0) k0 = pontos.length;
  const est = pontos.slice(0, Math.min(pontos.length, k0 + 1)), real = pontos.slice(Math.max(0, k0 - 1) && k0 < pontos.length ? k0 : k0, pontos.length);
  const linha = (ps, extra) => ps.length > 1 ? `<polyline fill="none" stroke="${COR.brand}" stroke-width="2.2" points="${ps.map(p => `${x(p.data)},${yy(p.pct)}`).join(' ')}"${extra}/>` : '';
  s += linha(est, ` stroke-dasharray="5 4" opacity=".75"`) + linha(real, '');
  for (const p of pontos) s += `<circle cx="${x(p.data)}" cy="${yy(p.pct)}" r="2.6" fill="${p.data === ateEf ? COR.red : COR.brand}"/>`;
  const pf = pontos.find(p => p.data === ateEf);
  if (pf) s += `<text x="${Number(x(pf.data)) - 4}" y="${Number(yy(pf.pct)) - 7}" font-size="11" font-weight="700" text-anchor="end" fill="${COR.red}">${Math.round(pf.pct)}% em ${fmtDs(ateEf)}</text>`;
  return s + '</svg>';
}
// barras por quinzena (disciplinas concluídas, arquivos no Nextcloud…), com a quinzena do relatório destacada
function svgBarras(series, rotulo, o, ateEf) {
  if (!series.length) return '';
  const W = 900, H = 190, L = 34, R = 10, T = 16, B = 34, n = series.length, bw = (W - L - R) / n;
  const max = Math.max(1, ...series.map(s => s.v)), topo = Math.ceil(max / 5) * 5 || 5, y = v => T + (1 - v / topo) * (H - T - B);
  let s = `<svg viewBox="0 0 ${W} ${H}" width="100%" xmlns="http://www.w3.org/2000/svg" font-family="Segoe UI, system-ui, sans-serif">`;
  for (let v = 0; v <= topo; v += topo / 5) s += `<line x1="${L}" x2="${W - R}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" stroke="${COR.grade}"/><text x="${L - 5}" y="${(y(v) + 3.5).toFixed(1)}" font-size="10" text-anchor="end" fill="${COR.mudo}">${Math.round(v)}</text>`;
  series.forEach((q, k) => {
    const x0 = L + k * bw + bw * .18, w = bw * .64, on = q.de <= ateEf && q.ate >= o.de;
    s += `<rect x="${x0.toFixed(1)}" y="${y(q.v).toFixed(1)}" width="${w.toFixed(1)}" height="${(H - B - y(q.v)).toFixed(1)}" rx="2" fill="${on ? COR.brand : '#a9bfd6'}"/>`;
    if (q.v) s += `<text x="${(x0 + w / 2).toFixed(1)}" y="${(y(q.v) - 4).toFixed(1)}" font-size="10.5" text-anchor="middle" font-weight="${on ? 700 : 400}" fill="${on ? COR.brand : COR.mudo}">${q.v}</text>`;
    s += `<text x="${(x0 + w / 2).toFixed(1)}" y="${H - 18}" font-size="9.5" text-anchor="middle" fill="${on ? COR.brand : COR.mudo}" font-weight="${on ? 700 : 400}">${q.de.slice(8) === '01' ? '1ª' : '2ª'} ${MES[Number(q.de.slice(5, 7)) - 1]}</text>`;
  });
  s += `<text x="${L}" y="${H - 3}" font-size="9.5" fill="${COR.mudo}">${esc(rotulo)}</text>`;
  return s + '</svg>';
}

/* ---------- montagem do relatório ---------- */
async function montar(o) {
  const H = hoje();
  const ateEf = o.ate > H ? H : o.ate;
  const dias = await indiceHistorico();
  const vespera = addDias(o.de, -1);
  const ini = await estadoEm(vespera, dias);    // situação no dia anterior ao período
  const fim = await estadoEm(ateEf, dias);      // situação no último dia do período (e não a de hoje)
  const dIni = vespera;
  const corte = dias[0] || '2026-10-23';        // primeiro retrato diário gravado pelo robô
  const estimado = fim.fonte === 'reconstruido' || ini.fonte === 'reconstruido';
  const atual = ateEf >= H;
  const noPer = d => { d = dia(d); return d && d >= o.de && d <= ateEf; };
  const STC = { c: 'Concluída', a: 'Em desenvolvimento', g: 'Aguardando', p: 'Pendente' };
  const stF = (p, x) => { const s = fim.projetos[p.slug]; return s && s.d ? s.d[x.id] : null; };
  const slugs = o.slugs || (o.slug ? [o.slug] : []);
  const escopo = P.filter(p => (!o.sigla || p.sigla === o.sigla) && (!slugs.length || slugs.includes(p.slug)));
  if (!escopo.length) throw new Error('Nenhum projeto no filtro escolhido.');
  const filtrado = !!(o.sigla || slugs.length);
  const siglasEscopo = new Set(escopo.map(p => p.sigla));
  const munOk = sg => !filtrado || siglasEscopo.has(sg);   // formalizações, marcos e metas só dos municípios dos projetos escolhidos

  const linhas = escopo.map(p => {
    const sI = ini && ini.projetos[p.slug], sF = fim.projetos[p.slug];
    const pctI = sI ? sI.pct : null, pctF = sF ? sF.pct : null;
    const trans = [], novas = [];
    for (const x of p.disciplinas || []) {
      const cF = sF && sF.d ? sF.d[x.id] : undefined, cI = sI && sI.d ? sI.d[x.id] : undefined;
      if (!cF || cI === cF) continue;
      const nova = cI === undefined;
      if (nova && cF === 'p') { novas.push(x); continue; }            // cadastro de disciplina: resumido por projeto
      const data = ((cF === 'c' || cF === 'g') && noPer(x.concluido_em)) ? x.concluido_em : noPer(x.atualizado) ? x.atualizado : (nova && noPer(x.criado_em)) ? x.criado_em : null;
      if (data) trans.push({ x, de: cI, para: cF, nova, data });
    }
    const movs = trans.length;   // mudanças de status de disciplina no período
    return { p, sI, sF, pctI, pctF, trans, novas, movs };
  });

  // acontecimentos
  const ev = [];
  const rotulo = t => t.para === 'c' ? 'Concluída' : t.para === 'a' ? 'Iniciada' : t.para === 'g' ? 'Aguardando' : 'Reaberta';
  for (const l of linhas) for (const t of l.trans) ev.push({ data: dia(t.data), tipo: rotulo(t), texto: `${l.p.sigla} · ${l.p.nome}: ${t.x.nome}${t.x.responsaveis && t.x.responsaveis.length ? ' — ' + t.x.responsaveis.join(', ') : ''}` });
  for (const l of linhas) if (l.novas.length) {
    const dt = l.novas.map(x => x.criado_em).filter(noPer).sort()[0] || o.de;
    ev.push({ data: dt, tipo: 'Planejamento', texto: `${l.p.sigla} · ${l.p.nome}: ${l.novas.length} disciplina(s) cadastrada(s) no ClickUp (${l.novas.slice(0, 6).map(x => x.nome).join(', ')}${l.novas.length > 6 ? '…' : ''})` });
  }
  for (const t of THREADS) {
    if (!munOk(siglaDe(t.municipio))) continue;
    for (const m of t.mensagens || []) { if (!noPer(m.data) || /confirma..o de leitura/i.test(m.resumo || '')) continue; ev.push({ data: dia(m.data), tipo: m.direcao === 'enviado' ? 'Formalização' : 'Resposta', texto: `${t.municipio} — ${t.assunto}: ${m.resumo || ''}` }); }
  }
  for (const c of D.cronologia || []) if (noPer(c.data) && (!filtrado || [...siglasEscopo].some(sg => new RegExp(MUN[sg].nome.split(' ')[0], 'i').test(c.titulo + ' ' + c.texto)))) ev.push({ data: c.data, tipo: 'Marco', texto: `${c.titulo} — ${c.texto}` });
  if (!filtrado) for (const n of D.imprensa || []) if (noPer(n.data)) ev.push({ data: n.data, tipo: 'Imprensa', texto: `${n.veiculo}: ${n.titulo}` });
  for (const m of D.marcos_clickup || []) { const sg = (String(m.nome).match(/^([A-Z]{3})\./) || [])[1]; if (!munOk(sg)) continue; if (noPer(m.atualizado)) ev.push({ data: dia(m.atualizado), tipo: 'ClickUp', texto: `${m.nome} (${STL[m.status] || m.status})` }); }
  // acervo: arquivos inseridos no Nextcloud no período (nextcloud/arquivos.json, gravado pelo robô)
  const NC = o.incNC === false ? null : await arquivosNC();
  const ncSigla = rel => (NC && NC.municipios && NC.municipios[String(rel).split('/')[1]]) || null;
  const slugsSet = new Set(slugs);
  const ncNoEscopo = a => slugs.length ? slugsSet.has(a[3]) : (!o.sigla || ncSigla(a[0]) === o.sigla);
  const ncTodos = NC ? NC.arquivos.filter(ncNoEscopo) : [];
  const ncPer = ncTodos.filter(a => noPer(a[1]));
  const ext = n => (String(n).split('.').pop() || '').toLowerCase().replace(/^jpeg$/, 'jpg').replace(/^doc$/, 'docx').replace(/^xls$/, 'xlsx');
  const tiposTxt = arr => { const c = {}; arr.forEach(a => { const e = ext(a[0]); c[e] = (c[e] || 0) + 1; }); return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => `${v} ${k.toUpperCase()}`).join(', '); };
  const nomeMun = sg => (MUN[sg] || {}).nome || sg || 'Outras pastas';
  const pastaDe = a => { const partes = String(a[0]).split('/').filter(Boolean); return a[3] ? ((P.find(p => p.slug === a[3]) || {}).nome || a[3]) : (partes.slice(1, Math.min(3, partes.length - 1)).join(' / ') || '(pasta do município)'); };
  {
    const porDia = new Map();
    for (const a of ncPer) { const k = a[1] + '|' + (ncSigla(a[0]) || '?'); if (!porDia.has(k)) porDia.set(k, []); porDia.get(k).push(a); }
    for (const [k, arr] of porDia) {
      const [dt, sg] = k.split('|'); const us = arr.filter(a => !a[4]).length;
      const pastas = [...new Set(arr.map(pastaDe))].slice(0, 3);
      ev.push({ data: dt, tipo: 'Nextcloud', texto: `${nomeMun(sg === '?' ? null : sg)}: ${arr.length} arquivo(s) inserido(s)${us !== arr.length ? ` (${us} produzidos pela Usina)` : ''} — ${tiposTxt(arr)} · ${pastas.join('; ')}` });
    }
  }
  for (const l of linhas) for (const im of l.p.imagens || []) if (im.fonte && noPer(im.fonte.mod)) ev.push({ data: dia(im.fonte.mod), tipo: 'Galeria', texto: `${l.p.sigla} · ${l.p.nome}: ${im.legenda}` });
  for (const l of D.lotes_entrega || []) if (noPer(l.data) && (!filtrado || (l.siglas || []).some(s => siglasEscopo.has(s)))) ev.push({ data: l.data, tipo: 'Meta', texto: `Meta de entrega do lote: ${(l.siglas || []).join(', ')}` });
  ev.sort((a, b) => a.data.localeCompare(b.data) || a.tipo.localeCompare(b.tipo));

  // prazos
  const lim = addDias(ateEf, 30), prox = [], atras = [];
  for (const l of linhas) for (const x of l.p.disciplinas || []) {
    const s = stF(l.p, x);
    if (!x.prazo || !s || s === 'c') continue;
    const item = { data: x.prazo, texto: `${l.p.sigla} · ${l.p.nome}: ${x.nome}`, resp: (x.responsaveis || []).join(', '), status: STC[s] };
    if (x.prazo > ateEf && x.prazo <= lim) prox.push(item); else if (x.prazo < ateEf) atras.push(item);
  }
  for (const l of D.lotes_entrega || []) if (l.data > ateEf && l.data <= lim && (!filtrado || (l.siglas || []).some(s => siglasEscopo.has(s)))) prox.push({ data: l.data, texto: `Meta de entrega do lote: ${(l.siglas || []).join(', ')}`, lote: true });
  prox.sort((a, b) => a.data.localeCompare(b.data)); atras.sort((a, b) => a.data.localeCompare(b.data));
  // formalizações aguardando resposta no fim do período: a última mensagem até essa data foi enviada pela Usina
  const pendForm = atual
    ? THREADS.filter(t => t.status === 'aguardando_resposta' && munOk(siglaDe(t.municipio))).map(t => ({ municipio: t.municipio, assunto: t.assunto, ultima: dia(t.ultima_atividade) }))
    : THREADS.filter(t => munOk(siglaDe(t.municipio))).map(t => {
        const ms = (t.mensagens || []).filter(m => dia(m.data) <= ateEf && !/confirma..o de leitura/i.test(m.resumo || '')).sort((a, b) => String(a.data).localeCompare(String(b.data)));
        const u = ms[ms.length - 1];
        return u && u.direcao === 'enviado' ?{ municipio: t.municipio, assunto: t.assunto, ultima: dia(u.data) } : null;
      }).filter(Boolean);

  // resumo
  const comDados = linhas.filter(l => l.pctF != null);
  const med = a => a.length ? a.reduce((s, v) => s + v, 0) / a.length : null;
  const pctIm = med(comDados.filter(l => l.pctI != null).map(l => l.pctI)), pctFm = med(comDados.map(l => l.pctF));
  const soma = k => comDados.reduce((s, l) => s + ((l.sF && l.sF[k]) || 0), 0);
  const somaI = k => comDados.reduce((s, l) => s + ((l.sI && l.sI[k]) || 0), 0);
  const nConc = ev.filter(e => e.tipo === 'Concluída').length, nIni = ev.filter(e => e.tipo === 'Iniciada').length;
  const nMov = linhas.reduce((s, l) => s + l.movs, 0), nCad = linhas.reduce((s, l) => s + l.novas.length, 0);
  const nEnv = ev.filter(e => e.tipo === 'Formalização').length, nRec = ev.filter(e => e.tipo === 'Resposta').length;
  const temAcervo = !!NC;
  const acervoNovos = ncPer.length, acervoUsina = ncPer.filter(a => !a[4]).length;
  const delta = (pctIm != null && pctFm != null) ? pctFm - pctIm : null;
  const sinal = v => (v > 0 ? '+' : '') + Math.round(v);
  const destaques = linhas.filter(l => l.pctI != null && l.pctF != null && l.pctF !== l.pctI).sort((a, b) => (b.pctF - b.pctI) - (a.pctF - a.pctI)).slice(0, 3);
  const munTxt = o.sigla ? MUN[o.sigla].nome : (slugs.length ? [...siglasEscopo].map(s => MUN[s].nome).join(', ') : 'Todos os municípios');
  const projTxt = slugs.length ? (escopo.length === 1 ? escopo[0].nome : `${escopo.length} projetos: ${escopo.map(p => p.sigla + ' · ' + p.nome).join('; ')}`) : 'Todos os projetos';
  const escopoTxt = `${munTxt} · ${projTxt}`;
  const periodoTxt = `${fmtD(o.de)} a ${fmtD(ateEf)} (${nDias(o.de, ateEf) + 1} dias)`;
  const fonteTxt = e => e.fonte === 'aoVivo' ? 'dados de hoje' : e.fonte === 'retrato' ? `retrato diário de ${fmtD(e.data)}` : 'reconstruída pelas datas do ClickUp';
  const baseTxt = `situação em ${fmtD(vespera)} (${fonteTxt(ini)}) × situação em ${fmtD(ateEf)} (${fonteTxt(fim)})`;
  const qz = quinzenas().find(q => q.de === o.de && q.ate === o.ate);
  const logo = (document.querySelector('header.top img') || {}).src || '';
  const titulo = escopo.length === 1 ? escopo[0].nome : o.sigla ? `Projetos de ${MUN[o.sigla].nome}` : slugs.length ? `${escopo.length} projetos selecionados` : 'Todos os projetos';

  // texto para WhatsApp / e-mail
  const texto = [
    `*Usina de Projetos — Relatório de atividades*`,
    `Período: ${periodoTxt}`,
    `Escopo: ${escopoTxt}`,
    `• Projetos acompanhados: ${comDados.length} (${escopo.filter(p => p.situacao === 'producao').length} em produção)`,
    pctFm != null ? `• Evolução média: ${pctIm != null ? Math.round(pctIm) + '% → ' : ''}${Math.round(pctFm)}%${delta != null ? ' (' + sinal(delta) + ' p.p.)' : ''}` : null,
    `• Disciplinas concluídas no período: ${nConc} · iniciadas: ${nIni} · mudanças de status no ClickUp: ${nMov}${nCad ? ` · cadastradas: ${nCad}` : ''}`,
    `• Formalizações: ${nEnv} enviadas, ${nRec} respostas${pendForm.length ? ` · ${pendForm.length} aguardando resposta` : ''}`,
    temAcervo ? `• Acervo (Nextcloud): ${acervoNovos} arquivos inseridos (${acervoUsina} produzidos pela Usina)` : null,
    destaques.length ? `Destaques: ${destaques.map(l => `${l.p.sigla} ${l.p.nome} ${Math.round(l.pctI)}→${Math.round(l.pctF)}%`).join('; ')}` : null,
    prox.length ? `Próximos prazos: ${prox.slice(0, 3).map(x => `${fmtDs(x.data)} — ${x.texto}`).join('; ')}` : null,
    atras.length ? `Atrasados: ${atras.length} prazo(s) de disciplina` : null,
    `Gerado em ${agoraTxt()} por ${o.usuario.nome.split(' ')[0]} — ${SITE.replace(/^https?:\/\//, '')}`
  ].filter(Boolean).join('\n');

  // HTML
  const kpi = (v, l, s) => `<div class="kpi"><b>${esc(v)}</b><span>${esc(l)}</span>${s ? `<small>${esc(s)}</small>` : ''}</div>`;
  const kpis = [
    kpi(comDados.length, 'projetos acompanhados', `${escopo.length} no escopo · ${escopo.filter(p => p.situacao === 'producao').length} em produção`),
    kpi(pctFm != null ? Math.round(pctFm) + '%' : '—', `andamento médio em ${fmtDs(ateEf)}`, pctIm != null ? `em ${fmtDs(vespera)}: ${Math.round(pctIm)}% (${sinal(delta)} p.p.)${estimado ? ' · estimado' : ''}` : (estimado ? 'estimado' : '')),
    kpi(`${soma('c')}/${soma('n')}`, `disciplinas concluídas até ${fmtDs(ateEf)}`, somaI('n') ? `até ${fmtDs(vespera)}: ${somaI('c')}` : ''),
    kpi(nConc, 'concluídas no período', `${nIni} iniciadas${nCad ? ` · ${nCad} cadastradas` : ` · ${nMov} mudanças de status`}`),
    kpi(`${nEnv} / ${nRec}`, 'formalizações enviadas / respostas', pendForm.length ? `${pendForm.length} aguardando resposta` : ''),
    kpi(temAcervo ? acervoNovos : '—', 'arquivos inseridos no Nextcloud', temAcervo ? `${acervoUsina} produzidos pela Usina` : 'lista do Nextcloud indisponível'),
    kpi(prox.length, 'prazos nos próximos 30 dias', atras.length ? `${atras.length} em atraso` : 'nenhum atraso'),
    kpi(ev.length, 'acontecimentos registrados', '')
  ].join('');
  const sit = p => p.situacao === 'paralisado' ? '<span class="tag">paralisado</span>' : p.situacao === 'fila' ? '<span class="tag">na fila</span>' : '';
  const semDados = linhas.filter(l => l.pctF == null);
  const tabela = `<table><thead><tr><th>Município</th><th>Projeto</th><th class="num">${esc(fmtDs(vespera))}</th><th class="num">${esc(fmtDs(ateEf))}</th><th class="num">Δ</th><th class="num">Concl./total</th><th class="num">Em desenv.</th><th class="num">Movim.</th><th>Entrega</th></tr></thead><tbody>${
    comDados.slice().sort((a, b) => ((b.pctF) - (b.pctI ?? b.pctF)) - ((a.pctF) - (a.pctI ?? a.pctF)) || b.pctF - a.pctF).map(l => {
      const d = (l.pctI != null) ? l.pctF - l.pctI : null;
      return `<tr><td>${esc(l.p.mun.nome)}</td><td>${esc(l.p.nome)}${sit(l.p)}</td><td class="num">${l.pctI != null ? l.pctI + '%' : '—'}</td><td class="num"><b>${l.pctF}%</b></td><td class="num ${d > 0 ? 'up' : d < 0 ? 'down' : ''}">${d != null ? sinal(d) : '—'}</td><td class="num">${l.sF ? `${l.sF.c}/${l.sF.n}` : '—'}</td><td class="num">${l.sF ? l.sF.a : '—'}</td><td class="num">${l.movs || '—'}</td><td>${l.p.lote_entrega ? fmtDs(l.p.lote_entrega) : '—'}</td></tr>`;
    }).join('')}</tbody></table>${semDados.length ? `<p class="obs" style="margin-top:8px"><b>${semDados.length} projeto(s) cadastrado(s) sem acompanhamento no ClickUp</b> (na fila, paralisados ou ainda não iniciados): ${esc(semDados.map(l => `${l.p.nome} (${l.p.mun.nome}${l.p.situacao === 'paralisado' ? ', paralisado' : l.p.situacao === 'fila' ? ', na fila' : ''})`).join('; '))}.</p>` : ''}`;
  const evHtml = ev.length ? ev.map(e => `<div class="ev"><span class="d">${esc(fmtD(e.data))}</span><span class="t">${esc(e.tipo)}</span><span>${esc(e.texto)}</span></div>`).join('') : '<p class="obs">Nenhum acontecimento registrado no período para este escopo.</p>';
  let discHtml = '';
  if (o.incDisc) {
    if (escopo.length === 1) {
      const p = escopo[0];
      const dd = (p.disciplinas || []).filter(x => stF(p, x));
      discHtml = dd.length ? `<table><thead><tr><th>Grupo</th><th>Disciplina</th><th>Status em ${esc(fmtDs(ateEf))}</th><th>Responsáveis</th><th>Prazo</th><th>Concluída em</th></tr></thead><tbody>${dd.slice().sort((a, b) => GR.findIndex(g => g[0] === a.grupo) - GR.findIndex(g => g[0] === b.grupo)).map(x => { const s = stF(p, x); return `<tr><td>${esc((GR.find(g => g[0] === x.grupo) || [])[1] || x.grupo)}</td><td>${esc(x.nome)}${x.notas && x.notas.length && atual ? `<div class="obs">${esc(x.notas.join(' · '))}</div>` : ''}</td><td><i class="st ${s}"></i>${esc(STC[s])}</td><td>${esc((x.responsaveis || []).join(', '))}</td><td>${esc(fmtD(x.prazo))}</td><td>${s === 'c' ? esc(fmtD(x.concluido_em)) : ''}</td></tr>`; }).join('')}</tbody></table>` : '<p class="obs">Projeto sem disciplinas cadastradas no ClickUp até o fim do período.</p>';
    } else {
      const discDe = p => (p.disciplinas || []).filter(x => stF(p, x));
      const comDisc = linhas.filter(l => discDe(l.p).length);
      const ABR = { levantamentos: 'Levant.', arquitetura: 'Arquit.', urbanismo: 'Urban.', estrutura: 'Estrut.', eletrico: 'Elétr.', hidrossanitario: 'Hidro.', viaria: 'Viária', pcip: 'PCIP', orcamento: 'Orçam.', outros: 'Outros' };
      const grUsados = GR.filter(g => comDisc.some(l => discDe(l.p).some(x => x.grupo === g[0])));   // só colunas com alguma disciplina
      discHtml = comDisc.length ? `<div class="wrap"><table class="mx"><thead><tr><th>Projeto</th>${grUsados.map(g => `<th class="num" title="${esc(g[1])}">${esc(ABR[g[0]] || g[1])}</th>`).join('')}<th class="num">Total</th></tr></thead><tbody>${comDisc.map(l => `<tr><td>${esc(l.p.sigla)} · ${esc(l.p.nome)}</td>${grUsados.map(g => { const it = discDe(l.p).filter(x => x.grupo === g[0]); if (!it.length) return '<td class="num mudo">–</td>'; const c = it.filter(x => stF(l.p, x) === 'c').length, a = it.filter(x => stF(l.p, x) === 'a').length; return `<td class="num">${c}/${it.length}${a ? `<small>${a} em des.</small>` : ''}</td>`; }).join('')}<td class="num"><b>${l.sF.c}/${l.sF.n}</b></td></tr>`).join('')}</tbody></table></div><p class="obs">Em cada célula: disciplinas concluídas / total do grupo (e quantas estão em desenvolvimento). Levant. = levantamentos; Arquit. = arquitetura; Urban. = urbanismo; Estrut. = estrutura; Elétr. = elétrico; Hidro. = hidrossanitário; Orçam. = orçamento.</p>` : '';
    }
  }
  const prazosHtml = o.incPrazos ? `${prox.length ? `<table><thead><tr><th>Data</th><th>O quê</th><th>Responsáveis</th><th>Status</th></tr></thead><tbody>${prox.map(x => `<tr><td>${esc(fmtD(x.data))}</td><td>${esc(x.texto)}</td><td>${esc(x.resp || '')}</td><td>${esc(x.lote ? 'meta do lote' : x.status || '')}</td></tr>`).join('')}</tbody></table>` : '<p class="obs">Nenhum prazo de disciplina ou meta de entrega nos 30 dias seguintes ao período.</p>'}${atras.length ? `<h3>Prazos vencidos sem conclusão (${atras.length})</h3><table><thead><tr><th>Prazo</th><th>O quê</th><th>Responsáveis</th><th>Status</th></tr></thead><tbody>${atras.slice(0, 25).map(x => `<tr><td>${esc(fmtD(x.data))}</td><td>${esc(x.texto)}</td><td>${esc(x.resp || '')}</td><td>${esc(x.status || '')}</td></tr>`).join('')}</tbody></table>${atras.length > 25 ? `<p class="obs">… e mais ${atras.length - 25}.</p>` : ''}` : ''}` : '';
  const pendHtml = pendForm.length ? `<table><thead><tr><th>Município</th><th>Assunto</th><th>Última atividade</th><th>Aguardando há</th></tr></thead><tbody>${pendForm.map(t => `<tr><td>${esc(t.municipio)}</td><td>${esc(t.assunto)}</td><td>${esc(fmtD(t.ultima))}</td><td>${t.ultima ? Math.max(0, nDias(t.ultima, ateEf)) + ' dias' : ''}</td></tr>`).join('')}</tbody></table>` : '';
  const imgProjs = (o.incImg && escopo.length <= 4) ? escopo.filter(p => p.imagens && p.imagens.length) : [];
  const imgHtml = imgProjs.map(p => `${escopo.length > 1 ? `<h3>${esc(p.sigla)} · ${esc(p.nome)}</h3>` : ''}<div class="gal">${p.imagens.slice(0, escopo.length === 1 ? 4 : 2).map(im => `<figure><img src="${esc(new URL(im.src, location.href).href)}" alt=""><figcaption>${esc(im.legenda)}</figcaption></figure>`).join('')}</div>`).join('');
  // gráficos de evolução
  let grafHtml = '';
  if (o.incGraf !== false && comDados.length) {
    const gantt = svgGantt(comDados, o, ateEf, fim);
    const pts = [];
    for (let d = '2026-08-16'; d < ateEf; d = addDias(d, 7)) pts.push(d);
    pts.push(ateEf);
    const curva = [];
    for (const d of pts) { const e = await estadoEm(d, dias); const vs = escopo.map(p => e.projetos[p.slug]).filter(Boolean).map(s => s.pct); if (vs.length) curva.push({ data: d, pct: med(vs) }); }
    const qs = quinzenas().filter(q => q.de <= ateEf);
    const discEsc = escopo.flatMap(p => p.disciplinas || []);
    const barrasC = qs.map(q => ({ de: q.de, ate: q.ate, v: discEsc.filter(x => x.status === 'concluido' && x.concluido_em && x.concluido_em >= q.de && x.concluido_em <= q.ate && x.concluido_em <= ateEf).length }));
    const barrasN = NC ? qs.map(q => ({ de: q.de, ate: q.ate, v: ncTodos.filter(a => a[1] >= q.de && a[1] <= q.ate && a[1] <= ateEf).length })) : [];
    const leg = (cor, t, forma) => `<span class="lg"><i style="background:${cor}${forma === 'd' ? ';transform:rotate(45deg);width:8px;height:8px' : forma === 'o' ? ';border-radius:50%;width:7px;height:7px' : ''}"></i>${esc(t)}</span>`;
    grafHtml = `<h3>Cronograma (Gantt) — situação em ${esc(fmtD(ateEf))}</h3><div class="graf">${gantt}</div>
      <p class="legenda">${escopo.length === 1
        ? leg(COR.c, 'concluída') + leg(COR.a, 'em desenvolvimento') + leg(COR.g, 'aguardando') + leg(COR.p, 'pendente') + leg(COR.brand, 'prazo da disciplina', 'd') + leg(COR.red, 'prazo vencido', 'd')
        : leg(COR.brand, 'parte concluída do projeto (andamento %)') + leg('#dfe6ee', 'restante até a entrega') + leg(COR.ciano, 'meta de entrega do lote', 'd') + leg(COR.red, 'entrega vencida sem conclusão', 'd') + leg(COR.c, 'disciplina concluída', 'o')}${leg(COR.ciano + '55', 'período do relatório')}</p>
      <p class="obs">Cada barra vai do cadastro das disciplinas no ClickUp até a meta de entrega (lote) ou o último prazo das disciplinas; barras tracejadas ainda não têm data de entrega definida.</p>
      ${curva.length > 1 ? `<h3>Curva de evolução — andamento médio dos projetos</h3><div class="graf">${svgCurva(curva, o, ateEf, corte)}</div><p class="obs">Média do andamento dos projetos do escopo, semana a semana. Trecho tracejado (antes de ${esc(fmtD(corte))}): reconstruído pelas datas do ClickUp, que não guarda o histórico de status — conta só o que já estava concluído ou sem alteração posterior, por isso tende a ficar abaixo do real. A partir de ${esc(fmtD(corte))}: retratos diários gravados pelo robô.</p>` : ''}
      <h3>Disciplinas concluídas por quinzena</h3><div class="graf">${svgBarras(barrasC, 'disciplinas concluídas no ClickUp (data de conclusão)', o, ateEf)}</div>
      ${barrasN.some(b => b.v) ? `<h3>Arquivos inseridos no Nextcloud por quinzena</h3><div class="graf">${svgBarras(barrasN, 'arquivos inseridos nas pastas das prefeituras (Nextcloud)', o, ateEf)}</div>` : ''}`;
  }
  // arquivos inseridos no Nextcloud no período
  let ncHtml = '';
  if (NC) {
    if (!ncPer.length) ncHtml = '<p class="obs">Nenhum arquivo inserido no período nas pastas do Nextcloud deste escopo.</p>';
    else {
      const grupos = new Map();
      for (const a of ncPer) { const sg = ncSigla(a[0]) || '?', k = sg + '|' + pastaDe(a); if (!grupos.has(k)) grupos.set(k, { sg, pasta: pastaDe(a), arr: [] }); grupos.get(k).arr.push(a); }
      const gs = [...grupos.values()].sort((a, b) => nomeMun(a.sg === '?' ? null : a.sg).localeCompare(nomeMun(b.sg === '?' ? null : b.sg)) || b.arr.length - a.arr.length);
      const nomeArqNC = a => String(a[0]).split('/').pop();
      ncHtml = `<table><thead><tr><th>Município</th><th>Pasta / projeto</th><th class="num">Arquivos</th><th class="num">Da Usina</th><th>Tipos</th><th>Exemplos (mais recentes)</th></tr></thead><tbody>${gs.map(g => { const rec = g.arr.slice().sort((a, b) => b[1].localeCompare(a[1])); return `<tr><td>${esc(nomeMun(g.sg === '?' ? null : g.sg))}</td><td>${esc(g.pasta)}</td><td class="num"><b>${g.arr.length}</b></td><td class="num">${g.arr.filter(a => !a[4]).length}</td><td>${esc(tiposTxt(g.arr))}</td><td class="obs">${esc(rec.slice(0, 4).map(nomeArqNC).join(' · '))}${rec.length > 4 ? ' …' : ''}</td></tr>`; }).join('')}</tbody></table>`;
    }
    ncHtml += `<p class="obs">Fonte: Nextcloud da Usina, pasta /2_Prefeituras (somente leitura), lida em ${esc(fmtD(NC.lido_em))}. Data considerada: ${NC.data_por === 'upload_time' ? 'inserção do arquivo no servidor (quando o Nextcloud não registra a inserção, a data de modificação)' : 'data de modificação do arquivo'}. "Da Usina" exclui pastas de material recebido das prefeituras (documentos, fotos, levantamentos, atas). Arquivos apagados ou substituídos depois não aparecem.</p>`;
  }
  const secoes = []; let ns = 1;
  const sec = (t, h) => { if (h) secoes.push(`<h2>${++ns}. ${t}</h2>${h}`); };
  sec('Gráficos de evolução', grafHtml);
  sec('Evolução por projeto', `${tabela}<p class="obs">Colunas de data: andamento em ${esc(fmtD(vespera))} (véspera do período) e em ${esc(fmtD(ateEf))} (fim do período). Andamento = (concluídas + ½ em desenvolvimento) ÷ disciplinas do projeto cadastradas até a data.</p>`);
  if (o.incAcont) sec('Acontecimentos do período', evHtml);
  if (NC) sec('Arquivos inseridos no Nextcloud no período', ncHtml);
  if (o.incDisc) sec(`Situação por disciplina em ${fmtD(ateEf)}`, discHtml);
  if (o.incPrazos) sec('Próximos prazos (30 dias após o período)', prazosHtml);
  const nomeArq = `relatorio-usina-${o.sigla ? o.sigla.toLowerCase() + '-' : ''}${slugs.length ? (slugs.length <= 3 ? slugs.join('+') + '-' : slugs.length + 'projetos-') : ''}${o.de}-a-${ateEf}.html`;

  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Relatório de atividades — ${esc(titulo)} — ${esc(fmtDs(o.de))} a ${esc(fmtD(ateEf))}</title>
<style>
@page{size:A4;margin:14mm 13mm 16mm}
body{font:11pt/1.45 'Segoe UI',system-ui,-apple-system,sans-serif;color:#17202a;margin:0;background:#f4f6f8;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.tb{position:sticky;top:0;z-index:5;background:#0B5394;color:#fff;padding:10px 16px;display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.tb button{border:0;border-radius:8px;padding:8px 14px;font:inherit;font-weight:600;cursor:pointer;background:#fff;color:#0B5394}
.tb .dica{font-size:.85rem;opacity:.9;margin-left:auto}
main{max-width:960px;margin:18px auto;padding:28px 32px;background:#fff;box-shadow:0 2px 14px rgba(0,0,0,.08)}
header.cab{display:flex;gap:18px;align-items:center;border-bottom:3px solid #00AAF2;padding-bottom:12px;margin-bottom:16px}
header.cab img{height:54px}
header.cab h1{font-size:1.45rem;margin:0 0 2px;color:#0B5394}
header.cab .meta{font-size:.86rem;color:#556;line-height:1.4}
h2{font-size:1.05rem;color:#0B5394;border-left:4px solid #00AAF2;padding-left:8px;margin:24px 0 10px;break-after:avoid}
h3{font-size:.95rem;margin:16px 0 6px;color:#334}
.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.kpi{border:1px solid #dfe5ec;border-radius:8px;padding:10px 12px;background:#fff}
.kpi b{display:block;font-size:1.35rem;color:#0B5394;line-height:1.2}
.kpi span{font-size:.8rem;color:#445;display:block}
.kpi small{font-size:.74rem;color:#778;display:block;margin-top:2px}
table{width:100%;border-collapse:collapse;font-size:.86rem;margin-top:6px}
th,td{border-bottom:1px solid #e3e8ee;padding:5px 7px;text-align:left;vertical-align:top}
th{background:#f1f5f9;font-size:.74rem;text-transform:uppercase;letter-spacing:.03em;color:#334}
td.num,th.num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
tr.mudo td,td.mudo{color:#99a}
.up{color:#1b7f3b;font-weight:700}.down{color:#b3261e;font-weight:700}
.tag{display:inline-block;font-size:.7rem;padding:1px 7px;border-radius:999px;background:#eef2f6;color:#334;margin-left:5px;vertical-align:middle}
.ev{display:grid;grid-template-columns:78px 112px 1fr;gap:8px;padding:5px 0;border-bottom:1px dashed #e3e8ee;font-size:.88rem;break-inside:avoid}
.ev .d{font-variant-numeric:tabular-nums;color:#556}.ev .t{font-size:.76rem;color:#0B5394;font-weight:700;text-transform:uppercase;letter-spacing:.02em}
.st{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:6px;vertical-align:middle;background:#c7ced6}
.st.c{background:#1b7f3b}.st.a{background:#e0a100}.st.g{background:#7a8ba0}
.obs{font-size:.82rem;color:#667}
.wrap{overflow-x:auto}
table.mx{table-layout:fixed;font-size:.76rem}
table.mx td,table.mx th{padding:4px 3px;overflow-wrap:anywhere}
table.mx th:first-child,table.mx td:first-child{width:25%}
table.mx th.num{white-space:normal;font-size:.64rem;letter-spacing:0}
table.mx td.num{white-space:normal}
table.mx small{display:block;font-size:.64rem;color:#667;line-height:1.2}
.graf{border:1px solid #e3e8ee;border-radius:8px;padding:6px 6px 2px;break-inside:avoid;background:#fff}
.graf svg{display:block}
.legenda{font-size:.76rem;color:#556;margin:6px 0 2px;display:flex;flex-wrap:wrap;gap:4px 14px}
.lg i{display:inline-block;width:12px;height:9px;border-radius:2px;margin-right:5px;vertical-align:middle}
.qz{display:inline-block;font-size:.8rem;background:#00AAF2;color:#fff;border-radius:999px;padding:2px 10px;vertical-align:middle;margin-left:6px}
.aviso{font-size:.8rem;background:#fff8e1;border:1px solid #f0d68a;border-radius:8px;padding:8px 10px;color:#5b4a12;margin:10px 0 0}
h3{break-after:avoid}
.gal{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:8px}
.gal figure{margin:0}.gal img{width:100%;border:1px solid #e3e8ee;border-radius:6px}.gal figcaption{font-size:.78rem;color:#556;margin-top:3px}
footer{margin-top:28px;border-top:1px solid #e3e8ee;padding-top:8px;font-size:.76rem;color:#667}
@media(max-width:700px){.kpis{grid-template-columns:1fr 1fr}main{padding:16px}.ev{grid-template-columns:70px 1fr}.ev .t{grid-column:2}}
@media print{.tb{display:none}body{background:#fff}main{box-shadow:none;margin:0;padding:0;max-width:none}body{font-size:10.2pt}.kpis{grid-template-columns:repeat(4,1fr)}h2{margin-top:16px}a{color:inherit;text-decoration:none}table.mx{font-size:7.4pt}table.mx th.num,table.mx small{font-size:6.4pt}.wrap{overflow:visible}}
</style></head><body>
<div class="tb"><button id="pr">Imprimir / salvar em PDF</button><button id="dl">Baixar HTML</button><button id="cp">Copiar resumo (texto)</button><span class="dica">Na impressão, escolha "Salvar como PDF". Documento de uso interno.</span></div>
<main>
<header class="cab">${logo ? `<img src="${esc(logo)}" alt="Lindeiros">` : ''}<div><h1>Usina de Projetos — Relatório de atividades${qz ? ` <span class="qz">${esc(rotQuinz(qz))}</span>` : ''}</h1><div class="meta"><b>${esc(escopoTxt)}</b><br>Período: <b>${esc(periodoTxt)}</b>${ateEf < o.ate ? ` <i>(parcial: dados até hoje)</i>` : ''} · Comparação: ${esc(baseTxt)}<br>Gerado em ${esc(agoraTxt())} por ${esc(o.usuario.nome)} (${esc(o.usuario.papel)}) · Dados do ClickUp atualizados em ${esc(fmtD(D.atualizado_em))}${D.atualizado_nextcloud ? ` e do Nextcloud em ${esc(fmtD(D.atualizado_nextcloud))}` : ''}</div></div></header>
<h2>1. Resumo do período</h2><div class="kpis">${kpis}</div>
${estimado ? `<p class="aviso">Período anterior a ${esc(fmtD(corte))}: a situação das disciplinas foi reconstruída pelas datas do ClickUp (cadastro, conclusão e última atualização), porque o ClickUp não guarda o histórico de status. Conclusões são exatas; disciplinas que mudaram de status depois do período aparecem como pendentes, então o andamento pode estar um pouco abaixo do real.</p>` : ''}
${secoes.join('\n')}
${pendHtml ? `<h2>Formalizações aguardando resposta da prefeitura</h2>${pendHtml}` : ''}
${imgHtml ? `<h2>Imagens ${escopo.length === 1 ? 'do projeto' : 'dos projetos'}</h2>${imgHtml}` : ''}
<footer>Relatório gerado automaticamente pelo site da Usina de Projetos (${esc(SITE.replace(/^https?:\/\//, ''))}) a partir do mural de tarefas (ClickUp), do acervo (Nextcloud) e do e-mail oficial. Convênio Itaipu 4500084088 — Conselho de Desenvolvimento dos Municípios Lindeiros ao Lago de Itaipu. Uso interno da coordenação. Site e relatórios desenvolvidos por João Felipe Martins Werle.</footer>
</main>
<textarea id="resumo" hidden>${esc(texto)}</textarea>
<scr` + `ipt>
document.getElementById('pr').onclick = () => window.print();
document.getElementById('dl').onclick = () => { const b = new Blob(['<!doctype html>\\n' + document.documentElement.outerHTML], { type: 'text/html' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = ${JSON.stringify(nomeArq)}; a.click(); };
document.getElementById('cp').onclick = async () => { const t = document.getElementById('resumo').value; try { await navigator.clipboard.writeText(t); alert('Resumo copiado — cole no WhatsApp ou no e-mail.'); } catch (e) { window.prompt('Copie o resumo:', t); } };
</scr` + `ipt></body></html>`;
  return { html, texto, nomeArq };
}

/* ---------- ligações ---------- */
const btn = document.getElementById('btn-export');
if (btn) btn.addEventListener('click', () => (usuarioAtual() ? telaForm() : telaLogin()));
document.addEventListener('keydown', e => { if (e.key === 'Escape' && bg) fechar(); });

// testes locais (só em localhost): #rel-form abre o formulário sem login; #rel-teste renderiza o relatório na própria página
const localTeste = /^(127\.0\.0\.1|localhost)$/.test(location.hostname);
if (location.hash === '#rel-form' && localTeste) { sessionStorage.setItem('rel_user', JSON.stringify({ nome: 'Teste', papel: 'teste' })); telaForm(); }
if (location.hash === '#rel-teste' && localTeste) {
  const q = new URLSearchParams(location.search);
  montar({ de: q.get('de') || addDias(hoje(), -29), ate: q.get('ate') || hoje(), sigla: q.get('sigla') || null, slugs: q.get('slug') ? q.get('slug').split(',') : [], incGraf: q.get('graf') !== '0', incNC: q.get('nc') !== '0', incAcont: true, incDisc: true, incPrazos: true, incImg: !!q.get('slug'), usuario: q.get('u') ? USUARIOS[Number(q.get('u')) - 1] : { nome: 'Teste', papel: 'teste' } })
    .then(r => {
      // ?so=<trecho do título> deixa visível só aquela seção (para conferir uma parte do relatório)
      const filtro = () => { const so = new URLSearchParams(location.search).get('so'); if (!so) return; let keep = false; [...document.querySelector('main').children].forEach(el => { if (el.tagName === 'H2') keep = el.textContent.includes(so); if (el.tagName !== 'HEADER' && !keep) el.style.display = 'none'; }); };
      const html = r.html.replace('</body>', '<scr' + 'ipt>(' + filtro.toString() + ')()</scr' + 'ipt></body>');
      document.open(); document.write(html); document.close();
    })
    .catch(e => { document.body.innerHTML = '<pre style="color:#c00;padding:20px">REL_ERRO ' + esc(e.stack || e.message) + '</pre>'; });
}
})();
