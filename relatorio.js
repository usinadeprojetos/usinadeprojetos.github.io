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
  const box = caixa(`<h3>Relatório de atividades</h3><p class="sub">Acesso restrito à coordenação da Usina. Use o e-mail e o celular cadastrados na seção Equipe.</p>
    <form id="rel-login"><label>E-mail</label><input type="email" name="email" autocomplete="username" required placeholder="nome@exemplo.com">
    <label>Celular</label><input type="tel" name="tel" autocomplete="current-password" required placeholder="(45) 9 9999-9999">
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
      if (!u) { tentativas++; err.textContent = 'E-mail ou celular não conferem com a lista de acesso.'; btn.disabled = false; return; }
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
    <div class="row"><div><label>De</label><input type="date" id="rel-de"></div><div><label>Até</label><input type="date" id="rel-ate"></div></div>
    <div class="row"><div><label>Município</label><select id="rel-mun"><option value="">Todos os municípios</option>${munComProj.map(m => `<option value="${esc(m.sigla)}">${esc(m.nome)}</option>`).join('')}</select></div>
    <div><label>Projeto</label><select id="rel-proj"><option value="">Todos os projetos</option></select></div></div>
    <label>Conteúdo</label><div class="opts">
      <label><input type="checkbox" id="rel-acont" checked> Acontecimentos do período (conclusões, formalizações, acervo, marcos)</label>
      <label><input type="checkbox" id="rel-disc" checked> Situação por disciplina</label>
      <label><input type="checkbox" id="rel-prazos" checked> Próximos prazos e atrasos</label>
      <label><input type="checkbox" id="rel-img"> Imagens da galeria (só para um projeto)</label></div>
    <div class="err" id="rel-err"></div>
    <div class="acoes"><button type="button" class="btn s" id="rel-copiar">Copiar resumo (texto)</button><button type="button" class="btn p" id="rel-gerar">Gerar relatório</button></div>
    <p class="nota">O relatório abre em uma nova aba, pronto para imprimir ou salvar em PDF. Histórico diário disponível desde ${esc(fmtD(D.historico_desde || '2026-10-23'))}; antes disso o comparativo usa as datas do ClickUp.</p>`);
  const de = $('#rel-de', box), ate = $('#rel-ate', box), mun = $('#rel-mun', box), proj = $('#rel-proj', box), chips = $('#rel-chips', box);
  const marcar = d => { [...chips.children].forEach(b => b.classList.toggle('on', b.dataset.d === String(d))); };
  const aplicarPeriodo = d => { ate.value = hoje(); de.value = addDias(hoje(), -(d - 1)); marcar(d); };
  chips.onclick = e => { const b = e.target.closest('button'); if (!b) return; const d = Number(b.dataset.d); if (d) aplicarPeriodo(d); else { marcar(0); de.focus(); } };
  de.onchange = ate.onchange = () => marcar(0);
  const encherProjetos = () => { const sg = mun.value; const lista = P.filter(p => !sg || p.sigla === sg).sort((a, b) => a.sigla.localeCompare(b.sigla) || a.nome.localeCompare(b.nome)); proj.innerHTML = `<option value="">Todos os projetos${sg ? ' de ' + esc(MUN[sg].nome) : ''}</option>` + lista.map(p => `<option value="${esc(p.slug)}">${esc(p.sigla)} · ${esc(p.nome)}${p.n_itens ? '' : ' (sem ClickUp)'}</option>`).join(''); };
  mun.onchange = () => { encherProjetos(); };
  // restaura escolhas anteriores
  if (salvo.sigla && MUN[salvo.sigla]) mun.value = salvo.sigla; encherProjetos(); if (salvo.slug) proj.value = salvo.slug;
  if (salvo.dias) aplicarPeriodo(salvo.dias); else if (salvo.de && salvo.ate) { de.value = salvo.de; ate.value = salvo.ate; marcar(0); } else aplicarPeriodo(30);
  ['acont', 'disc', 'prazos', 'img'].forEach(k => { if (salvo[k] != null) $('#rel-' + k, box).checked = !!salvo[k]; });
  $('#rel-sair', box).onclick = () => { sessionStorage.removeItem('rel_user'); telaLogin(); };
  const opcoes = () => {
    const o = { de: de.value, ate: ate.value, sigla: mun.value || null, slug: proj.value || null, incAcont: $('#rel-acont', box).checked, incDisc: $('#rel-disc', box).checked, incPrazos: $('#rel-prazos', box).checked, incImg: $('#rel-img', box).checked, usuario: u };
    const chip = [...chips.children].find(b => b.classList.contains('on')); o.dias = chip && Number(chip.dataset.d) ? Number(chip.dataset.d) : 0;
    if (!o.de || !o.ate) throw new Error('Informe as duas datas.');
    if (o.de > o.ate) throw new Error('A data inicial é maior que a final.');
    if (nDias(o.de, o.ate) > 400) throw new Error('Período máximo: 400 dias.');
    try { localStorage.setItem('rel_opts', JSON.stringify({ sigla: o.sigla, slug: o.slug, dias: o.dias, de: o.de, ate: o.ate, acont: o.incAcont, disc: o.incDisc, prazos: o.incPrazos, img: o.incImg })); } catch {}
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
  return { data: hoje(), hora: '', projetos, aoVivo: true };
}

/* ---------- montagem do relatório ---------- */
async function montar(o) {
  const H = hoje();
  const ateEf = o.ate > H ? H : o.ate;
  const dias = await indiceHistorico();
  const dIni = retratoAte(dias, o.de) || (dias.length && dias[0] <= ateEf ? dias[0] : null);   // estado no início (ou o retrato mais antigo que existir)
  const dFim = retratoAte(dias, ateEf);
  const ini = dIni ? await lerJson(`historico/${dIni}.json`).catch(() => null) : null;
  const fim = (ateEf === H || !dFim) ? retratoAoVivo() : await lerJson(`historico/${dFim}.json`).catch(() => retratoAoVivo());
  const baseAprox = ini && dIni > o.de;   // o retrato inicial é posterior ao início pedido
  const noPer = d => { d = dia(d); return d && d >= o.de && d <= ateEf; };
  const escopo = P.filter(p => (!o.sigla || p.sigla === o.sigla) && (!o.slug || p.slug === o.slug));
  if (!escopo.length) throw new Error('Nenhum projeto no filtro escolhido.');
  if (o.slug && !o.sigla) o = Object.assign({}, o, { sigla: escopo[0].sigla });   // um projeto só: o município dele filtra formalizações, marcos etc.

  const linhas = escopo.map(p => {
    const sI = ini && ini.projetos[p.slug], sF = fim.projetos[p.slug];
    const pctI = sI ? sI.pct : null, pctF = sF ? sF.pct : null;
    const trans = [];
    for (const x of p.disciplinas || []) {
      const cF = sF && sF.d ? sF.d[x.id] : null, cI = sI && sI.d ? sI.d[x.id] : null;
      if (sI && cF && cI !== cF) trans.push({ x, de: cI, para: cF, nova: cI === undefined, data: (cF === 'c' && x.concluido_em) ? x.concluido_em : (x.atualizado || ateEf) });
      else if (!sI) {
        if (x.concluido_em && noPer(x.concluido_em)) trans.push({ x, de: null, para: 'c', data: x.concluido_em });
        else if (noPer(x.atualizado) && x.status !== 'concluido') trans.push({ x, de: null, para: COD[x.status] || 'p', data: x.atualizado, mov: true });
      }
    }
    const movs = (p.disciplinas || []).filter(x => noPer(x.atualizado)).length;
    const acI = sI && sI.acervo ? sI.acervo[0] : null, acF = sF && sF.acervo ? sF.acervo[0] : (p.acervo ? p.acervo.usina : null);
    return { p, sI, sF, pctI, pctF, trans, movs, acI, acF };
  });

  // acontecimentos
  const ev = [];
  const rotulo = t => t.para === 'c' ? 'Concluída' : t.para === 'a' ? (t.mov ? 'Atualizada' : 'Iniciada') : t.para === 'g' ? 'Aguardando' : (t.nova ? 'Cadastrada' : t.mov ? 'Atualizada' : 'Reaberta');
  for (const l of linhas) for (const t of l.trans) ev.push({ data: dia(t.data), tipo: rotulo(t), texto: `${l.p.sigla} · ${l.p.nome}: ${t.x.nome}${t.x.responsaveis && t.x.responsaveis.length ? ' — ' + t.x.responsaveis.join(', ') : ''}` });
  for (const t of THREADS) {
    const sg = siglaDe(t.municipio); if (o.sigla && sg !== o.sigla) continue;
    for (const m of t.mensagens || []) { if (!noPer(m.data) || /confirma..o de leitura/i.test(m.resumo || '')) continue; ev.push({ data: dia(m.data), tipo: m.direcao === 'enviado' ? 'Formalização' : 'Resposta', texto: `${t.municipio} — ${t.assunto}: ${m.resumo || ''}` }); }
  }
  for (const c of D.cronologia || []) if (noPer(c.data) && (!o.sigla || new RegExp(MUN[o.sigla].nome.split(' ')[0], 'i').test(c.titulo + ' ' + c.texto))) ev.push({ data: c.data, tipo: 'Marco', texto: `${c.titulo} — ${c.texto}` });
  if (!o.sigla) for (const n of D.imprensa || []) if (noPer(n.data)) ev.push({ data: n.data, tipo: 'Imprensa', texto: `${n.veiculo}: ${n.titulo}` });
  for (const m of D.marcos_clickup || []) { const sg = (String(m.nome).match(/^([A-Z]{3})\./) || [])[1]; if (o.sigla && sg !== o.sigla) continue; if (noPer(m.atualizado)) ev.push({ data: dia(m.atualizado), tipo: 'ClickUp', texto: `${m.nome} (${STL[m.status] || m.status})` }); }
  for (const l of linhas) {
    const p = l.p;
    if (p.acervo && noPer(p.acervo.ultimo)) ev.push({ data: p.acervo.ultimo, tipo: 'Acervo', texto: `${p.sigla} · ${p.nome}: arquivos novos no Nextcloud — ${p.acervo.usina} arquivos de projeto, último: ${p.acervo.ultimo_arquivo || ''}` });
    for (const im of p.imagens || []) if (im.fonte && noPer(im.fonte.mod)) ev.push({ data: dia(im.fonte.mod), tipo: 'Galeria', texto: `${p.sigla} · ${p.nome}: ${im.legenda}` });
  }
  for (const l of D.lotes_entrega || []) if (noPer(l.data) && (!o.sigla || (l.siglas || []).includes(o.sigla))) ev.push({ data: l.data, tipo: 'Meta', texto: `Meta de entrega do lote: ${(l.siglas || []).join(', ')}` });
  ev.sort((a, b) => a.data.localeCompare(b.data) || a.tipo.localeCompare(b.tipo));

  // prazos
  const lim = addDias(ateEf, 30), prox = [], atras = [];
  for (const l of linhas) for (const x of l.p.disciplinas || []) {
    if (!x.prazo || x.status === 'concluido') continue;
    const item = { data: x.prazo, texto: `${l.p.sigla} · ${l.p.nome}: ${x.nome}`, resp: (x.responsaveis || []).join(', '), status: STL[x.status] };
    if (x.prazo > ateEf && x.prazo <= lim) prox.push(item); else if (x.prazo < ateEf) atras.push(item);
  }
  for (const l of D.lotes_entrega || []) if (l.data > ateEf && l.data <= lim && (!o.sigla || (l.siglas || []).includes(o.sigla))) prox.push({ data: l.data, texto: `Meta de entrega do lote: ${(l.siglas || []).join(', ')}`, lote: true });
  prox.sort((a, b) => a.data.localeCompare(b.data)); atras.sort((a, b) => a.data.localeCompare(b.data));
  const pendForm = THREADS.filter(t => t.status === 'aguardando_resposta' && (!o.sigla || siglaDe(t.municipio) === o.sigla));

  // resumo
  const comDados = linhas.filter(l => l.pctF != null);
  const med = a => a.length ? a.reduce((s, v) => s + v, 0) / a.length : null;
  const pctIm = med(comDados.filter(l => l.pctI != null).map(l => l.pctI)), pctFm = med(comDados.map(l => l.pctF));
  const soma = k => comDados.reduce((s, l) => s + ((l.sF && l.sF[k]) || 0), 0);
  const somaI = k => comDados.reduce((s, l) => s + ((l.sI && l.sI[k]) || 0), 0);
  const nConc = ev.filter(e => e.tipo === 'Concluída').length, nIni = ev.filter(e => e.tipo === 'Iniciada').length;
  const nMov = linhas.reduce((s, l) => s + l.movs, 0);
  const nEnv = ev.filter(e => e.tipo === 'Formalização').length, nRec = ev.filter(e => e.tipo === 'Resposta').length;
  const acervoNovos = linhas.reduce((s, l) => s + ((l.acI != null && l.acF != null) ? Math.max(0, l.acF - l.acI) : 0), 0);
  const temAcervo = linhas.some(l => l.acI != null && l.acF != null);
  const delta = (pctIm != null && pctFm != null) ? pctFm - pctIm : null;
  const sinal = v => (v > 0 ? '+' : '') + Math.round(v);
  const destaques = linhas.filter(l => l.pctI != null && l.pctF != null && l.pctF !== l.pctI).sort((a, b) => (b.pctF - b.pctI) - (a.pctF - a.pctI)).slice(0, 3);
  const escopoTxt = `${o.sigla ? MUN[o.sigla].nome : 'Todos os municípios'} · ${o.slug ? escopo[0].nome : 'Todos os projetos'}`;
  const periodoTxt = `${fmtD(o.de)} a ${fmtD(ateEf)} (${nDias(o.de, ateEf) + 1} dias)`;
  const baseTxt = ini ? `${baseAprox ? 'retrato mais antigo disponível, de ' : 'retrato de '}${fmtD(dIni)}` : 'sem retrato anterior (comparativo pelas datas do ClickUp)';
  const logo = (document.querySelector('header.top img') || {}).src || '';
  const titulo = o.slug ? escopo[0].nome : o.sigla ? `Projetos de ${MUN[o.sigla].nome}` : 'Todos os projetos';

  // texto para WhatsApp / e-mail
  const texto = [
    `*Usina de Projetos — Relatório de atividades*`,
    `Período: ${periodoTxt}`,
    `Escopo: ${escopoTxt}`,
    `• Projetos acompanhados: ${comDados.length} (${escopo.filter(p => p.situacao === 'producao').length} em produção)`,
    pctFm != null ? `• Evolução média: ${pctIm != null ? Math.round(pctIm) + '% → ' : ''}${Math.round(pctFm)}%${delta != null ? ' (' + sinal(delta) + ' p.p.)' : ''}` : null,
    `• Disciplinas concluídas no período: ${nConc} · iniciadas: ${nIni} · movimentações no ClickUp: ${nMov}`,
    `• Formalizações: ${nEnv} enviadas, ${nRec} respostas${pendForm.length ? ` · ${pendForm.length} aguardando resposta` : ''}`,
    temAcervo ? `• Acervo (Nextcloud): +${acervoNovos} arquivos de projeto` : null,
    destaques.length ? `Destaques: ${destaques.map(l => `${l.p.sigla} ${l.p.nome} ${Math.round(l.pctI)}→${Math.round(l.pctF)}%`).join('; ')}` : null,
    prox.length ? `Próximos prazos: ${prox.slice(0, 3).map(x => `${fmtDs(x.data)} — ${x.texto}`).join('; ')}` : null,
    atras.length ? `Atrasados: ${atras.length} prazo(s) de disciplina` : null,
    `Gerado em ${agoraTxt()} por ${o.usuario.nome.split(' ')[0]} — ${SITE.replace(/^https?:\/\//, '')}`
  ].filter(Boolean).join('\n');

  // HTML
  const kpi = (v, l, s) => `<div class="kpi"><b>${esc(v)}</b><span>${esc(l)}</span>${s ? `<small>${esc(s)}</small>` : ''}</div>`;
  const kpis = [
    kpi(comDados.length, 'projetos acompanhados', `${escopo.length} no escopo · ${escopo.filter(p => p.situacao === 'producao').length} em produção`),
    kpi(pctFm != null ? Math.round(pctFm) + '%' : '—', 'evolução média agora', pctIm != null ? `início: ${Math.round(pctIm)}% (${sinal(delta)} p.p.)` : ''),
    kpi(`${soma('c')}/${soma('n')}`, 'disciplinas concluídas (acumulado)', ini ? `no início: ${somaI('c')}` : ''),
    kpi(nConc, 'concluídas no período', `${nIni} iniciadas · ${nMov} movimentações`),
    kpi(`${nEnv} / ${nRec}`, 'formalizações enviadas / respostas', pendForm.length ? `${pendForm.length} aguardando resposta` : ''),
    kpi(temAcervo ? '+' + acervoNovos : '—', 'arquivos novos no acervo', temAcervo ? 'Nextcloud (pastas da Usina)' : 'sem leitura do Nextcloud'),
    kpi(prox.length, 'prazos nos próximos 30 dias', atras.length ? `${atras.length} em atraso` : 'nenhum atraso'),
    kpi(ev.length, 'acontecimentos registrados', '')
  ].join('');
  const sit = p => p.situacao === 'paralisado' ? '<span class="tag">paralisado</span>' : p.situacao === 'fila' ? '<span class="tag">na fila</span>' : '';
  const semDados = linhas.filter(l => l.pctF == null);
  const tabela = `<table><thead><tr><th>Município</th><th>Projeto</th><th class="num">Início</th><th class="num">Agora</th><th class="num">Δ</th><th class="num">Concl./total</th><th class="num">Em desenv.</th><th class="num">Movim.</th><th>Entrega</th></tr></thead><tbody>${
    comDados.slice().sort((a, b) => ((b.pctF) - (b.pctI ?? b.pctF)) - ((a.pctF) - (a.pctI ?? a.pctF)) || b.pctF - a.pctF).map(l => {
      const d = (l.pctI != null) ? l.pctF - l.pctI : null;
      return `<tr><td>${esc(l.p.mun.nome)}</td><td>${esc(l.p.nome)}${sit(l.p)}</td><td class="num">${l.pctI != null ? l.pctI + '%' : '—'}</td><td class="num"><b>${l.pctF}%</b></td><td class="num ${d > 0 ? 'up' : d < 0 ? 'down' : ''}">${d != null ? sinal(d) : '—'}</td><td class="num">${l.sF ? `${l.sF.c}/${l.sF.n}` : '—'}</td><td class="num">${l.sF ? l.sF.a : '—'}</td><td class="num">${l.movs || '—'}</td><td>${l.p.lote_entrega ? fmtDs(l.p.lote_entrega) : '—'}</td></tr>`;
    }).join('')}</tbody></table>${semDados.length ? `<p class="obs" style="margin-top:8px"><b>${semDados.length} projeto(s) cadastrado(s) sem acompanhamento no ClickUp</b> (na fila, paralisados ou ainda não iniciados): ${esc(semDados.map(l => `${l.p.nome} (${l.p.mun.nome}${l.p.situacao === 'paralisado' ? ', paralisado' : l.p.situacao === 'fila' ? ', na fila' : ''})`).join('; '))}.</p>` : ''}`;
  const evHtml = ev.length ? ev.map(e => `<div class="ev"><span class="d">${esc(fmtD(e.data))}</span><span class="t">${esc(e.tipo)}</span><span>${esc(e.texto)}</span></div>`).join('') : '<p class="obs">Nenhum acontecimento registrado no período para este escopo.</p>';
  let discHtml = '';
  if (o.incDisc) {
    if (o.slug) {
      const p = escopo[0];
      discHtml = (p.disciplinas && p.disciplinas.length) ? `<table><thead><tr><th>Grupo</th><th>Disciplina</th><th>Status</th><th>Responsáveis</th><th>Prazo</th><th>Última atualização</th></tr></thead><tbody>${p.disciplinas.slice().sort((a, b) => GR.findIndex(g => g[0] === a.grupo) - GR.findIndex(g => g[0] === b.grupo)).map(x => `<tr><td>${esc((GR.find(g => g[0] === x.grupo) || [])[1] || x.grupo)}</td><td>${esc(x.nome)}${x.notas && x.notas.length ? `<div class="obs">${esc(x.notas.join(' · '))}</div>` : ''}</td><td><i class="st ${COD[x.status]}"></i>${esc(STL[x.status] || x.status)}</td><td>${esc((x.responsaveis || []).join(', '))}</td><td>${esc(fmtD(x.prazo))}</td><td>${esc(fmtD(x.atualizado))}</td></tr>`).join('')}</tbody></table>` : '<p class="obs">Projeto sem acompanhamento de disciplinas no ClickUp.</p>';
    } else {
      const comDisc = linhas.filter(l => l.p.disciplinas && l.p.disciplinas.length);
      const ABR = { levantamentos: 'Levant.', arquitetura: 'Arquit.', urbanismo: 'Urban.', estrutura: 'Estrut.', eletrico: 'Elétr.', hidrossanitario: 'Hidro.', viaria: 'Viária', pcip: 'PCIP', orcamento: 'Orçam.', outros: 'Outros' };
      const grUsados = GR.filter(g => comDisc.some(l => l.p.disciplinas.some(x => x.grupo === g[0])));   // só colunas com alguma disciplina
      discHtml = comDisc.length ? `<div class="wrap"><table class="mx"><thead><tr><th>Projeto</th>${grUsados.map(g => `<th class="num" title="${esc(g[1])}">${esc(ABR[g[0]] || g[1])}</th>`).join('')}<th class="num">Total</th></tr></thead><tbody>${comDisc.map(l => `<tr><td>${esc(l.p.sigla)} · ${esc(l.p.nome)}</td>${grUsados.map(g => { const it = l.p.disciplinas.filter(x => x.grupo === g[0]); if (!it.length) return '<td class="num mudo">–</td>'; const c = it.filter(x => x.status === 'concluido').length, a = it.filter(x => x.status === 'andamento').length; return `<td class="num">${c}/${it.length}${a ? `<small>${a} em des.</small>` : ''}</td>`; }).join('')}<td class="num"><b>${l.p.n_concluidos}/${l.p.n_itens}</b></td></tr>`).join('')}</tbody></table></div><p class="obs">Em cada célula: disciplinas concluídas / total do grupo (e quantas estão em desenvolvimento). Levant. = levantamentos; Arquit. = arquitetura; Urban. = urbanismo; Estrut. = estrutura; Elétr. = elétrico; Hidro. = hidrossanitário; Orçam. = orçamento.</p>` : '';
    }
  }
  const prazosHtml = o.incPrazos ? `${prox.length ? `<table><thead><tr><th>Data</th><th>O quê</th><th>Responsáveis</th><th>Status</th></tr></thead><tbody>${prox.map(x => `<tr><td>${esc(fmtD(x.data))}</td><td>${esc(x.texto)}</td><td>${esc(x.resp || '')}</td><td>${esc(x.lote ? 'meta do lote' : x.status || '')}</td></tr>`).join('')}</tbody></table>` : '<p class="obs">Nenhum prazo de disciplina ou meta de entrega nos 30 dias seguintes ao período.</p>'}${atras.length ? `<h3>Prazos vencidos sem conclusão (${atras.length})</h3><table><thead><tr><th>Prazo</th><th>O quê</th><th>Responsáveis</th><th>Status</th></tr></thead><tbody>${atras.slice(0, 25).map(x => `<tr><td>${esc(fmtD(x.data))}</td><td>${esc(x.texto)}</td><td>${esc(x.resp || '')}</td><td>${esc(x.status || '')}</td></tr>`).join('')}</tbody></table>${atras.length > 25 ? `<p class="obs">… e mais ${atras.length - 25}.</p>` : ''}` : ''}` : '';
  const pendHtml = pendForm.length ? `<table><thead><tr><th>Município</th><th>Assunto</th><th>Última atividade</th><th>Aguardando há</th></tr></thead><tbody>${pendForm.map(t => `<tr><td>${esc(t.municipio)}</td><td>${esc(t.assunto)}</td><td>${esc(fmtD(t.ultima_atividade))}</td><td>${t.ultima_atividade ? nDias(dia(t.ultima_atividade), ateEf) + ' dias' : ''}</td></tr>`).join('')}</tbody></table>` : '';
  const imgHtml = (o.incImg && o.slug && escopo[0].imagens && escopo[0].imagens.length) ? `<div class="gal">${escopo[0].imagens.slice(0, 4).map(im => `<figure><img src="${esc(new URL(im.src, location.href).href)}" alt=""><figcaption>${esc(im.legenda)}</figcaption></figure>`).join('')}</div>` : '';
  const nomeArq = `relatorio-usina-${o.sigla ? o.sigla.toLowerCase() + '-' : ''}${o.slug ? o.slug + '-' : ''}${o.de}-a-${ateEf}.html`;

  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Relatório de atividades — ${esc(titulo)} — ${esc(fmtDs(o.de))} a ${esc(fmtD(ateEf))}</title>
<style>
@page{size:A4;margin:14mm 13mm 16mm}
body{font:11pt/1.45 'Segoe UI',system-ui,-apple-system,sans-serif;color:#17202a;margin:0;background:#f4f6f8}
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
.gal{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:8px}
.gal figure{margin:0}.gal img{width:100%;border:1px solid #e3e8ee;border-radius:6px}.gal figcaption{font-size:.78rem;color:#556;margin-top:3px}
footer{margin-top:28px;border-top:1px solid #e3e8ee;padding-top:8px;font-size:.76rem;color:#667}
@media(max-width:700px){.kpis{grid-template-columns:1fr 1fr}main{padding:16px}.ev{grid-template-columns:70px 1fr}.ev .t{grid-column:2}}
@media print{.tb{display:none}body{background:#fff}main{box-shadow:none;margin:0;padding:0;max-width:none}body{font-size:10.2pt}.kpis{grid-template-columns:repeat(4,1fr)}h2{margin-top:16px}a{color:inherit;text-decoration:none}table.mx{font-size:7.4pt}table.mx th.num,table.mx small{font-size:6.4pt}.wrap{overflow:visible}}
</style></head><body>
<div class="tb"><button id="pr">Imprimir / salvar em PDF</button><button id="dl">Baixar HTML</button><button id="cp">Copiar resumo (texto)</button><span class="dica">Na impressão, escolha "Salvar como PDF". Documento de uso interno.</span></div>
<main>
<header class="cab">${logo ? `<img src="${esc(logo)}" alt="Lindeiros">` : ''}<div><h1>Usina de Projetos — Relatório de atividades</h1><div class="meta"><b>${esc(escopoTxt)}</b><br>Período: <b>${esc(periodoTxt)}</b> · Base de comparação: ${esc(baseTxt)}<br>Gerado em ${esc(agoraTxt())} por ${esc(o.usuario.nome)} (${esc(o.usuario.papel)}) · Dados do ClickUp atualizados em ${esc(fmtD(D.atualizado_em))}${D.atualizado_nextcloud ? ` e do Nextcloud em ${esc(fmtD(D.atualizado_nextcloud))}` : ''}</div></div></header>
<h2>1. Resumo do período</h2><div class="kpis">${kpis}</div>
<h2>2. Evolução por projeto</h2>${tabela}<p class="obs">"Início" é o percentual no retrato de ${esc(dIni ? fmtD(dIni) : '—')}; "Agora" é o percentual em ${esc(fmtD(fim.data))}. Percentual = (concluídas + ½ em desenvolvimento) ÷ disciplinas do projeto.</p>
${o.incAcont ? `<h2>3. Acontecimentos do período</h2>${evHtml}` : ''}
${o.incDisc ? `<h2>${o.incAcont ? 4 : 3}. Situação por disciplina</h2>${discHtml}` : ''}
${o.incPrazos ? `<h2>${3 + (o.incAcont ? 1 : 0) + (o.incDisc ? 1 : 0)}. Próximos prazos (30 dias após o período)</h2>${prazosHtml}` : ''}
${pendHtml ? `<h2>Formalizações aguardando resposta da prefeitura</h2>${pendHtml}` : ''}
${imgHtml ? `<h2>Imagens do projeto</h2>${imgHtml}` : ''}
<footer>Relatório gerado automaticamente pelo site da Usina de Projetos (${esc(SITE.replace(/^https?:\/\//, ''))}) a partir do mural de tarefas (ClickUp), do acervo (Nextcloud) e do e-mail oficial. Convênio Itaipu 4500084088 — Conselho de Desenvolvimento dos Municípios Lindeiros ao Lago de Itaipu. Uso interno da coordenação.</footer>
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

// teste local (só em localhost): renderiza o relatório na própria página para conferência
if (location.hash === '#rel-teste' && /^(127\.0\.0\.1|localhost)$/.test(location.hostname)) {
  const q = new URLSearchParams(location.search);
  montar({ de: q.get('de') || addDias(hoje(), -29), ate: q.get('ate') || hoje(), sigla: q.get('sigla') || null, slug: q.get('slug') || null, incAcont: true, incDisc: true, incPrazos: true, incImg: !!q.get('slug'), usuario: { nome: 'Teste', papel: 'teste' } })
    .then(r => {
      // ?so=<trecho do título> deixa visível só aquela seção (para conferir uma parte do relatório)
      const filtro = () => { const so = new URLSearchParams(location.search).get('so'); if (!so) return; let keep = false; [...document.querySelector('main').children].forEach(el => { if (el.tagName === 'H2') keep = el.textContent.includes(so); if (el.tagName !== 'HEADER' && !keep) el.style.display = 'none'; }); };
      const html = r.html.replace('</body>', '<scr' + 'ipt>(' + filtro.toString() + ')()</scr' + 'ipt></body>');
      document.open(); document.write(html); document.close();
    })
    .catch(e => { document.body.innerHTML = '<pre style="color:#c00;padding:20px">REL_ERRO ' + esc(e.stack || e.message) + '</pre>'; });
}
})();
