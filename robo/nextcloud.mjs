// Robô Nextcloud -> site da Usina de Projetos. SOMENTE LEITURA no Nextcloud (status.php, OCS /cloud/user, PROPFIND e GET).
// Para cada projeto de dados.json que tenha:
//   - "nextcloud": [pastas]            -> gera "acervo": quantos arquivos de projeto a Usina produziu, por tipo, e a data do último
//   - "galeria_nextcloud": [itens]     -> gera "imagens": galeria curada (pranchas em PDF viram JPG da página indicada; renders são redimensionados)
// Roda no GitHub Actions depois de robo/atualizar.mjs. Precisa de poppler-utils (pdftoppm) e ImageMagick (convert).
// Segredos: NEXTCLOUD_URL, NEXTCLOUD_USER (login ou e-mail), NEXTCLOUD_SENHA (senha de aplicativo).
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const URL_INFORMADA = (process.env.NEXTCLOUD_URL || '').trim().replace(/\/+$/, '');
const USER = (process.env.NEXTCLOUD_USER || '').trim();
const PASS = process.env.NEXTCLOUD_SENHA || '';
if (!URL_INFORMADA || !USER || !PASS) { console.error('Faltam os segredos NEXTCLOUD_URL, NEXTCLOUD_USER e NEXTCLOUD_SENHA'); process.exit(1); }
const AUTH = 'Basic ' + Buffer.from(`${USER}:${PASS}`).toString('base64');

const IGNORAR_PASTA = /backup|revit_temp|antigos|anteriores|_shortcuts|datatop|\.sync/i;
// pastas/arquivos recebidos das prefeituras ou de terceiros (não contam como produção da Usina)
const RECEBIDO = /recebid|disponibilizad|dados recebidos|documentos|\bdocs\b|fotos|\batas?\b|briefing|anterior|diretrizes|template|levantamento|lev\.|demandas formalizadas|matriz|reuni/i;
const EXT_PROJETO = /\.(dwg|dxf|rvt|rfa|ifc|skp|pdf|docx?|xlsx?|kmz|kml|nwc)$/i;
const EXT_IMAGEM = /\.(png|jpe?g|webp)$/i;
const hoje = new Date().toISOString().slice(0, 10);
const espera = ms => new Promise(r => setTimeout(r, ms));

async function fetchRetry(url, opts, tentativas = 3) {
  let erro;
  for (let i = 0; i < tentativas; i++) {
    try { return await fetch(url, opts); } catch (e) { erro = e; await espera(1500 * (i + 1)); }
  }
  throw new Error(`rede: ${erro && erro.message}`);
}

// 1) descobre a URL base (com ou sem /nextcloud) pelo status.php, que é público
async function descobrirBase() {
  // aceita a URL como estiver no segredo: raiz, com /nextcloud, ou copiada do navegador (…/index.php/apps/files/…)
  let limpa = URL_INFORMADA.replace(/\/(index\.php|apps|remote\.php|login|status\.php).*$/i, '').replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(limpa)) limpa = 'https://' + limpa;
  let origem = limpa; try { origem = new URL(limpa).origin; } catch {}
  // último recurso: o endereço conhecido do Nextcloud da Usina (caso o segredo NEXTCLOUD_URL esteja com erro de digitação)
  const URL_PADRAO = 'https://csct.com.br/nextcloud';
  const candidatos = [...new Set([limpa, limpa + '/nextcloud', origem + '/nextcloud', origem, URL_PADRAO])];
  const motivos = [];
  for (const b of candidatos) {
    try {
      const r = await fetchRetry(b + '/status.php', { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; robo-usina-site)' } }, 2);
      if (r.ok) { const j = await r.json(); if (j && j.installed) { console.log(`Nextcloud ${j.versionstring || ''} encontrado (${b.replace(/^https?:\/\//, '').split('/')[0]})`); return b; } }
      motivos.push(`${b.replace(/^https?:\/\/[^/]+/, '') || '/'} -> HTTP ${r.status}`);
    } catch (e) { motivos.push(`${b.replace(/^https?:\/\/[^/]+/, '') || '/'} -> ${e.message}`); }
  }
  throw new Error('status.php não respondeu em nenhuma variação da NEXTCLOUD_URL: ' + motivos.join('; '));
}
// 2) descobre o id interno do usuário (o caminho WebDAV usa o id, não o e-mail nem o nome)
async function descobrirUsuario(base) {
  const r = await fetchRetry(base + '/ocs/v1.php/cloud/user?format=json', { headers: { Authorization: AUTH, 'OCS-APIRequest': 'true' } });
  if (!r.ok) throw new Error(`OCS /cloud/user -> HTTP ${r.status} (usuário ou senha de aplicativo incorretos?)`);
  const j = await r.json();
  const id = j && j.ocs && j.ocs.data && j.ocs.data.id;
  if (!id) throw new Error('OCS /cloud/user não devolveu o id do usuário');
  return id;
}

const BASE = await descobrirBase();
const ID = await descobrirUsuario(BASE);
console.log(`usuário autenticado (id com ${ID.length} caracteres)`);
const ROOT = `${BASE}/remote.php/dav/files/${encodeURIComponent(ID)}`;
const dav = p => ROOT + p.split('/').map(encodeURIComponent).join('/');
const cacheDir = new Map();

async function propfind(pasta) {
  if (cacheDir.has(pasta)) return cacheDir.get(pasta);
  const r = await fetchRetry(dav(pasta) + '/', {
    method: 'PROPFIND',
    headers: { Authorization: AUTH, Depth: '1', 'Content-Type': 'application/xml; charset=utf-8' },
    body: '<?xml version="1.0"?><d:propfind xmlns:d="DAV:"><d:prop><d:getlastmodified/><d:getcontentlength/><d:resourcetype/></d:prop></d:propfind>'
  });
  if (!r.ok) throw new Error(`PROPFIND ${pasta} -> HTTP ${r.status}`);
  const xml = await r.text();
  const itens = [];
  for (const m of xml.matchAll(/<d:response>([\s\S]*?)<\/d:response>/gi)) {
    const b = m[1];
    const href = (b.match(/<d:href>([^<]+)<\/d:href>/i) || [])[1] || '';
    const i = href.indexOf('/dav/files/'); if (i < 0) continue;
    const depois = href.slice(i + '/dav/files/'.length);          // id/caminho...
    const j = depois.indexOf('/'); if (j < 0) continue;
    const rel = decodeURIComponent(depois.slice(j)).replace(/\/$/, '');
    if (rel === pasta.replace(/\/$/, '') || rel === '') continue;  // a própria pasta
    const dir = /<d:collection\s*\/?>/i.test(b);
    const mod = (b.match(/<d:getlastmodified>([^<]+)</i) || [])[1];
    const bytes = Number((b.match(/<d:getcontentlength>(\d+)</i) || [])[1] || 0);
    itens.push({ path: rel, nome: path.posix.basename(rel), dir, mod: mod ? new Date(mod).toISOString().slice(0, 10) : null, bytes });
  }
  cacheDir.set(pasta, itens);
  await espera(120);
  return itens;
}

// 3) localiza /2_Prefeituras: na raiz ou dentro de uma pasta compartilhada
const raiz = await propfind('/');
console.log('pastas na raiz: ' + raiz.filter(x => x.dir).map(x => x.nome).join(' | '));
let PREFIXO = '';
if (!raiz.some(x => x.dir && x.nome === '2_Prefeituras')) {
  for (const d of raiz.filter(x => x.dir)) {
    try { if ((await propfind(d.path)).some(x => x.dir && x.nome === '2_Prefeituras')) { PREFIXO = d.path; break; } } catch {}
  }
  if (PREFIXO) console.log(`2_Prefeituras fica dentro de "${PREFIXO}"`); else console.warn('2_Prefeituras não encontrada na raiz nem no 1º nível');
}
const caminho = p => PREFIXO + p;

async function varrer(pasta, prof, acc, estado) {
  if (prof > 7) return;
  let itens;
  try { itens = await propfind(pasta); estado.ok++; } catch (e) { console.warn('  aviso:', e.message); estado.erro++; return; }
  for (const it of itens) {
    if (it.dir) { if (!IGNORAR_PASTA.test(it.nome)) await varrer(it.path, prof + 1, acc, estado); }
    else acc.push(it);
  }
}

function resumoAcervo(arquivos, pastas) {
  const relativo = a => { const p = pastas.find(x => a.path.startsWith(x)); return p ? a.path.slice(p.length) : a.path; };
  const projeto = arquivos.filter(a => EXT_PROJETO.test(a.nome));
  const usina = projeto.filter(a => !RECEBIDO.test(relativo(a)));
  const porTipo = {};
  for (const a of usina) { const e = a.nome.split('.').pop().toLowerCase().replace(/^doc$/, 'docx').replace(/^xls$/, 'xlsx'); porTipo[e] = (porTipo[e] || 0) + 1; }
  const ult = usina.filter(a => a.mod).sort((x, y) => y.mod.localeCompare(x.mod))[0];
  return {
    usina: usina.length, recebidos: projeto.length - usina.length, por_tipo: porTipo,
    ultimo: ult ? ult.mod : null, ultimo_arquivo: ult ? ult.nome : null,
    imagens: arquivos.filter(a => EXT_IMAGEM.test(a.nome) && !RECEBIDO.test(relativo(a))).length, lido_em: hoje
  };
}

async function baixar(arquivo, destino) {
  const r = await fetchRetry(dav(arquivo), { headers: { Authorization: AUTH } });
  if (!r.ok) throw new Error(`GET ${arquivo} -> HTTP ${r.status}`);
  await fs.writeFile(destino, Buffer.from(await r.arrayBuffer()));
}

function paraJpg(entrada, saida, pagina) {
  const dir = path.dirname(saida), prefixo = path.basename(saida, '.jpg') + '-tmp';
  if (/\.pdf$/i.test(entrada)) {
    execFileSync('pdftoppm', ['-f', String(pagina), '-l', String(pagina), '-scale-to', '1600', '-jpeg', '-jpegopt', 'quality=82', entrada, path.join(dir, prefixo)]);
    const gerado = fsSync.readdirSync(dir).find(f => f.startsWith(prefixo + '-') && f.endsWith('.jpg'));
    if (!gerado) throw new Error('pdftoppm não gerou imagem');
    fsSync.renameSync(path.join(dir, gerado), saida);
  } else {
    execFileSync('convert', [entrada + '[0]', '-auto-orient', '-resize', '1600x1600>', '-quality', '82', saida]);
  }
}

const dados = JSON.parse(await fs.readFile('dados.json', 'utf8'));
await fs.mkdir('img/galeria', { recursive: true });
const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'nextcloud-'));
let nAcervo = 0, nImagens = 0, nBaixadas = 0;

for (const p of dados.projetos) {
  const pastas = (p.nextcloud || []).map(caminho);
  const curadoria = p.galeria_nextcloud || [];
  if (!pastas.length && !curadoria.length) continue;
  console.log(`- ${p.slug}`);

  if (pastas.length) {
    const arquivos = [], estado = { ok: 0, erro: 0 };
    for (const pasta of pastas) await varrer(pasta, 0, arquivos, estado);
    if (estado.ok > 0) {
      p.acervo = resumoAcervo(arquivos, pastas);
      nAcervo++;
      console.log(`  acervo: ${p.acervo.usina} arquivos da Usina (${Object.entries(p.acervo.por_tipo).map(([k, v]) => k + ' ' + v).join(', ')}), ${p.acervo.recebidos} recebidos, último ${p.acervo.ultimo || '-'}`);
    } else console.warn('  acervo mantido como estava (nenhuma pasta pôde ser lida)');
  }

  if (curadoria.length) {
    const fontes = [];
    for (const it of curadoria) {
      if (it.arquivo) fontes.push({ arquivo: caminho(it.arquivo), legenda: it.legenda || '', pagina: it.pagina || 1 });
      else if (it.pasta) {
        try {
          const imgs = (await propfind(caminho(it.pasta))).filter(x => !x.dir && EXT_IMAGEM.test(x.nome)).sort((a, b) => a.nome.localeCompare(b.nome)).slice(0, it.max || 4);
          imgs.forEach((x, k) => fontes.push({ arquivo: x.path, legenda: (it.legenda || '') + (imgs.length > 1 ? ` (${k + 1}/${imgs.length})` : ''), pagina: 1 }));
        } catch (e) { console.warn('  aviso:', e.message); }
      }
    }
    const anteriores = (p.imagens || []).filter(im => im.fonte);
    const imagens = [];
    for (let k = 0; k < fontes.length; k++) {
      const f = fontes[k];
      const src = `img/galeria/${p.slug}-${k + 1}.jpg`;
      const anterior = anteriores.find(im => im.src === src && im.fonte.arquivo === f.arquivo && im.fonte.pagina === f.pagina);
      let meta = null;
      try { meta = (await propfind(path.posix.dirname(f.arquivo))).find(x => x.path === f.arquivo) || null; } catch (e) { console.warn('  aviso:', e.message); }
      if (!meta) {
        if (anterior && fsSync.existsSync(src)) { imagens.push(anterior); console.warn(`  mantida a imagem anterior (arquivo não lido agora): ${f.arquivo}`); }
        else console.warn(`  não encontrado no Nextcloud: ${f.arquivo}`);
        continue;
      }
      const fonte = { arquivo: f.arquivo, mod: meta.mod, bytes: meta.bytes, pagina: f.pagina };
      if (anterior && anterior.fonte.mod === fonte.mod && anterior.fonte.bytes === fonte.bytes && fsSync.existsSync(src)) { imagens.push({ src, legenda: f.legenda, fonte }); continue; }
      try {
        const local = path.join(tmp, `${p.slug}-${k + 1}${path.extname(f.arquivo).toLowerCase()}`);
        await baixar(f.arquivo, local);
        paraJpg(local, src, f.pagina);
        imagens.push({ src, legenda: f.legenda, fonte });
        nBaixadas++;
        console.log(`  imagem ${k + 1}: ${path.posix.basename(f.arquivo)} (${(meta.bytes / 1048576).toFixed(1)} MB) -> ${src}`);
      } catch (e) {
        console.warn(`  falhou ${f.arquivo}: ${e.message}`);
        if (anterior && fsSync.existsSync(src)) imagens.push(anterior);
      }
    }
    for (const f of fsSync.readdirSync('img/galeria')) {
      if (f.startsWith(p.slug + '-') && !imagens.some(im => im.src.endsWith('/' + f))) fsSync.unlinkSync(path.join('img/galeria', f));
    }
    p.imagens = imagens;
    nImagens += imagens.length;
  }
}

dados.atualizado_nextcloud = hoje;
const json = JSON.stringify(dados);
await fs.writeFile('dados.json', json);
await fs.writeFile('dados.js', 'window.DADOS = ' + json + ';');
console.log(`Nextcloud: acervo de ${nAcervo} projetos, ${nImagens} imagens na galeria (${nBaixadas} baixadas agora), em ${hoje}`);
