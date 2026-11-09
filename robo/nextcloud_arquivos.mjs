// Robô Nextcloud -> lista de arquivos com data de inserção (para o relatório "o que entrou no acervo em cada período").
// SOMENTE LEITURA no Nextcloud (status.php, OCS /cloud/user e PROPFIND). Não baixa arquivo nenhum.
// Varre /2_Prefeituras inteira e grava nextcloud/arquivos.json:
//   { lido_em, raiz, municipios: { "<pasta do município>": sigla }, arquivos: [[caminho relativo, data, bytes, slug|null, recebido 0/1]] }
// Data = upload_time do Nextcloud (quando o arquivo foi inserido no servidor); se o servidor não informar, a data de modificação.
// Roda no GitHub Actions depois de robo/nextcloud.mjs. Segredos: NEXTCLOUD_URL, NEXTCLOUD_USER, NEXTCLOUD_SENHA.
import fs from 'node:fs/promises';
import path from 'node:path';

const URL_INFORMADA = (process.env.NEXTCLOUD_URL || '').trim().replace(/\/+$/, '');
const USER = (process.env.NEXTCLOUD_USER || '').trim();
const PASS = process.env.NEXTCLOUD_SENHA || '';
if (!URL_INFORMADA || !USER || !PASS) { console.error('Faltam os segredos NEXTCLOUD_URL, NEXTCLOUD_USER e NEXTCLOUD_SENHA'); process.exit(1); }
const AUTH = 'Basic ' + Buffer.from(`${USER}:${PASS}`).toString('base64');
const IGNORAR_PASTA = /backup|revit_temp|_shortcuts|datatop|\.sync|^\.|__pycache__/i;
const IGNORAR_ARQ = /^(\.|~\$)|\.(bak|tmp|lck|dwl2?|sv\$|log|ini|db)$|^desktop\.ini$|^thumbs\.db$/i;
const RECEBIDO = /recebid|disponibilizad|dados recebidos|documentos|\bdocs\b|fotos|\batas?\b|briefing|anterior|diretrizes|template|levantamento|lev\.|demandas formalizadas|matriz|reuni/i;
const espera = ms => new Promise(r => setTimeout(r, ms));
const dataBR = d => new Date(d.getTime() - 3 * 3600e3).toISOString().slice(0, 10);   // dia no horário de Brasília

async function fetchRetry(url, opts, tentativas = 3) {
  let erro;
  for (let i = 0; i < tentativas; i++) { try { return await fetch(url, opts); } catch (e) { erro = e; await espera(1500 * (i + 1)); } }
  throw new Error(`rede: ${erro && erro.message}`);
}
async function descobrirBase() {
  let limpa = URL_INFORMADA.replace(/\/(index\.php|apps|remote\.php|login|status\.php).*$/i, '').replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(limpa)) limpa = 'https://' + limpa;
  let origem = limpa; try { origem = new URL(limpa).origin; } catch {}
  for (const b of [...new Set([limpa, limpa + '/nextcloud', origem + '/nextcloud', origem, 'https://csct.com.br/nextcloud'])]) {
    try { const r = await fetchRetry(b + '/status.php', { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; robo-usina-site)' } }, 2); if (r.ok) { const j = await r.json(); if (j && j.installed) return b; } } catch {}
  }
  throw new Error('status.php não respondeu');
}
const BASE = await descobrirBase();
const r0 = await fetchRetry(BASE + '/ocs/v1.php/cloud/user?format=json', { headers: { Authorization: AUTH, 'OCS-APIRequest': 'true' } });
if (!r0.ok) throw new Error(`OCS /cloud/user -> HTTP ${r0.status}`);
const ID = (await r0.json()).ocs.data.id;
const ROOT = `${BASE}/remote.php/dav/files/${encodeURIComponent(ID)}`;
const dav = p => ROOT + p.split('/').map(encodeURIComponent).join('/');

let nUpload = 0, nMod = 0;
async function propfind(pasta) {
  const r = await fetchRetry(dav(pasta) + '/', {
    method: 'PROPFIND',
    headers: { Authorization: AUTH, Depth: '1', 'Content-Type': 'application/xml; charset=utf-8' },
    body: '<?xml version="1.0"?><d:propfind xmlns:d="DAV:" xmlns:nc="http://nextcloud.org/ns"><d:prop><d:getlastmodified/><d:getcontentlength/><d:resourcetype/><nc:upload_time/><nc:creation_time/></d:prop></d:propfind>'
  });
  if (!r.ok) throw new Error(`PROPFIND ${pasta} -> HTTP ${r.status}`);
  const xml = await r.text();
  const itens = [];
  for (const m of xml.matchAll(/<d:response>([\s\S]*?)<\/d:response>/gi)) {
    const b = m[1];
    const href = (b.match(/<d:href>([^<]+)<\/d:href>/i) || [])[1] || '';
    const i = href.indexOf('/dav/files/'); if (i < 0) continue;
    const depois = href.slice(i + '/dav/files/'.length); const j = depois.indexOf('/'); if (j < 0) continue;
    const rel = decodeURIComponent(depois.slice(j)).replace(/\/$/, '').normalize('NFC');
    if (rel === pasta.replace(/\/$/, '') || rel === '') continue;
    // só a resposta 200 (propriedades não suportadas vêm num propstat 404 separado)
    const ok = (b.split(/<d:propstat>/i).find(s => /HTTP\/1\.[01] 200/.test(s)) || b);
    const dir = /<d:collection\s*\/?>/i.test(ok);
    const mod = (ok.match(/<d:getlastmodified>([^<]+)</i) || [])[1];
    const up = Number((ok.match(/<nc:upload_time>(\d+)</i) || [])[1] || 0);
    const cr = Number((ok.match(/<nc:creation_time>(\d+)</i) || [])[1] || 0);
    const bytes = Number((ok.match(/<d:getcontentlength>(\d+)</i) || [])[1] || 0);
    let data = null;
    if (up > 0) { data = dataBR(new Date(up * 1000)); if (!dir) nUpload++; }
    else if (cr > 0) data = dataBR(new Date(cr * 1000));
    else if (mod) { data = dataBR(new Date(mod)); if (!dir) nMod++; }
    itens.push({ path: rel, nome: path.posix.basename(rel), dir, data, bytes });
  }
  await espera(80);
  return itens;
}

// localiza /2_Prefeituras (na raiz ou dentro de uma pasta compartilhada)
let PREFIXO = '';
const raiz = await propfind('/');
if (!raiz.some(x => x.dir && x.nome === '2_Prefeituras')) {
  for (const d of raiz.filter(x => x.dir)) { try { if ((await propfind(d.path)).some(x => x.dir && x.nome === '2_Prefeituras')) { PREFIXO = d.path; break; } } catch {} }
}
const RAIZ = PREFIXO + '/2_Prefeituras';
const dados = JSON.parse(await fs.readFile('dados.json', 'utf8'));
const pastasProj = [];
for (const p of dados.projetos) for (const f of p.nextcloud || []) pastasProj.push({ pasta: (PREFIXO + f).normalize('NFC').replace(RAIZ, ''), slug: p.slug });
pastasProj.sort((a, b) => b.pasta.length - a.pasta.length);
const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const siglaDaPasta = nome => { const n = norm(nome.replace(/^\d+_/, '')); const m = (dados.municipios || []).find(x => n.startsWith(norm(x.nome).slice(0, 9))); return m ? m.sigla : null; };

const arquivos = [], municipios = {}; let erros = 0, pastasLidas = 0;
async function varrer(pasta, prof) {
  if (prof > 9) return;
  let itens; try { itens = await propfind(pasta); pastasLidas++; } catch (e) { console.warn('  aviso:', e.message); erros++; return; }
  for (const it of itens) {
    if (it.dir) { if (!IGNORAR_PASTA.test(it.nome)) await varrer(it.path, prof + 1); continue; }
    if (IGNORAR_ARQ.test(it.nome)) continue;
    const rel = it.path.slice(RAIZ.length);                  // /4_Guaíra/....
    const proj = pastasProj.find(x => rel.startsWith(x.pasta + '/'));
    const dentro = proj ? rel.slice(proj.pasta.length) : rel.split('/').slice(2).join('/');
    arquivos.push([rel, it.data, it.bytes, proj ? proj.slug : null, RECEBIDO.test(dentro) ? 1 : 0]);
  }
}
const munPastas = (await propfind(RAIZ)).filter(x => x.dir);
for (const m of munPastas) { municipios[m.nome] = siglaDaPasta(m.nome); console.log(`- ${m.nome} (${municipios[m.nome] || '?'})`); await varrer(m.path, 1); }
if (!pastasLidas) throw new Error('nenhuma pasta pôde ser lida; arquivo anterior mantido');
arquivos.sort((a, b) => (a[1] || '').localeCompare(b[1] || '') || a[0].localeCompare(b[0]));
await fs.mkdir('nextcloud', { recursive: true });
await fs.writeFile('nextcloud/arquivos.json', JSON.stringify({ lido_em: dataBR(new Date()), lido_em_iso: new Date().toISOString(), data_por: nUpload ? 'upload_time' : 'getlastmodified', n_upload: nUpload, n_mod: nMod, municipios, arquivos }));
console.log(`Nextcloud: ${arquivos.length} arquivos em ${pastasLidas} pastas (${erros} erros); data de inserção (upload_time) em ${nUpload}, data de modificação em ${nMod}`);
