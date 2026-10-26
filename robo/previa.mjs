// Prévia de uma pasta do Nextcloud (SOMENTE LEITURA): baixa as imagens da pasta indicada para previa/,
// para serem conferidas (artefato do GitHub Actions) ANTES de entrar no site. Não mexe em dados.json nem na galeria.
// Entradas: PASTA (caminho no Nextcloud), MAX (máximo de imagens, padrão 20). Segredos: NEXTCLOUD_URL/USER/SENHA.
import fs from 'node:fs/promises';
import path from 'node:path';

const PASTA = (process.env.PASTA || '').trim();
const MAX = Number(process.env.MAX || 20);
const URL_INFORMADA = (process.env.NEXTCLOUD_URL || '').trim().replace(/\/+$/, '');
const USER = (process.env.NEXTCLOUD_USER || '').trim();
const PASS = process.env.NEXTCLOUD_SENHA || '';
if (!PASTA) { console.error('Falta a entrada PASTA'); process.exit(1); }
if (!URL_INFORMADA || !USER || !PASS) { console.error('Faltam os segredos NEXTCLOUD_URL, NEXTCLOUD_USER e NEXTCLOUD_SENHA'); process.exit(1); }
const AUTH = 'Basic ' + Buffer.from(`${USER}:${PASS}`).toString('base64');
const EXT = /\.(png|jpe?g|webp|pdf)$/i;

async function descobrirBase() {
  let limpa = URL_INFORMADA.replace(/\/(index\.php|apps|remote\.php|login|status\.php).*$/i, '').replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(limpa)) limpa = 'https://' + limpa;
  let origem = limpa; try { origem = new URL(limpa).origin; } catch {}
  for (const b of [...new Set([limpa, limpa + '/nextcloud', origem + '/nextcloud', origem, 'https://csct.com.br/nextcloud'])]) {
    try { const r = await fetch(b + '/status.php'); if (r.ok) { const j = await r.json(); if (j && j.installed) return b; } } catch {}
  }
  throw new Error('Nextcloud não encontrado a partir de NEXTCLOUD_URL');
}
const BASE = await descobrirBase();
const u = await fetch(BASE + '/ocs/v1.php/cloud/user?format=json', { headers: { Authorization: AUTH, 'OCS-APIRequest': 'true' } });
if (!u.ok) throw new Error(`OCS /cloud/user -> HTTP ${u.status}`);
const ID = (await u.json()).ocs.data.id;
const ROOT = `${BASE}/remote.php/dav/files/${encodeURIComponent(ID)}`;
const dav = p => ROOT + p.split('/').map(encodeURIComponent).join('/');

async function propfind(pasta) {
  const r = await fetch(dav(pasta) + '/', { method: 'PROPFIND', headers: { Authorization: AUTH, Depth: '1', 'Content-Type': 'application/xml; charset=utf-8' },
    body: '<?xml version="1.0"?><d:propfind xmlns:d="DAV:"><d:prop><d:getlastmodified/><d:getcontentlength/><d:resourcetype/></d:prop></d:propfind>' });
  if (!r.ok) throw new Error(`PROPFIND ${pasta} -> HTTP ${r.status}`);
  const xml = await r.text(); const itens = [];
  for (const m of xml.matchAll(/<d:response>([\s\S]*?)<\/d:response>/gi)) {
    const b = m[1]; const href = (b.match(/<d:href>([^<]+)<\/d:href>/i) || [])[1] || '';
    const i = href.indexOf('/dav/files/'); if (i < 0) continue;
    const depois = href.slice(i + '/dav/files/'.length); const j = depois.indexOf('/'); if (j < 0) continue;
    const rel = decodeURIComponent(depois.slice(j)).replace(/\/$/, '');
    if (rel === pasta.replace(/\/$/, '') || rel === '') continue;
    itens.push({ path: rel, nome: path.posix.basename(rel), dir: /<d:collection\s*\/?>/i.test(b), mod: ((b.match(/<d:getlastmodified>([^<]+)</i) || [])[1] || '').slice(0, 25), bytes: Number((b.match(/<d:getcontentlength>(\d+)</i) || [])[1] || 0) });
  }
  return itens;
}

const itens = await propfind(PASTA);
console.log(`Pasta ${PASTA}: ${itens.length} itens`);
for (const it of itens) console.log(`  ${it.dir ? '[pasta] ' : ''}${it.nome}${it.dir ? '' : ` (${(it.bytes / 1024).toFixed(0)} KB, ${it.mod})`}`);
await fs.mkdir('previa', { recursive: true });
const imgs = itens.filter(x => !x.dir && EXT.test(x.nome)).sort((a, b) => a.nome.localeCompare(b.nome)).slice(0, MAX);
let n = 0;
for (const im of imgs) {
  const r = await fetch(dav(im.path), { headers: { Authorization: AUTH } });
  if (!r.ok) { console.warn(`  falhou ${im.nome}: HTTP ${r.status}`); continue; }
  await fs.writeFile(path.join('previa', im.nome.replace(/[^\w.\-() ]+/g, '_')), Buffer.from(await r.arrayBuffer()));
  n++;
}
await fs.writeFile('previa/_lista.txt', itens.map(it => `${it.dir ? '[pasta] ' : ''}${it.nome}\t${it.bytes}\t${it.mod}`).join('\n'));
console.log(`Baixadas ${n} de ${imgs.length} imagens para previa/`);
