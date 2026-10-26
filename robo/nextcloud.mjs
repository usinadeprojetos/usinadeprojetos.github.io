// Robô Nextcloud -> site da Usina de Projetos. SOMENTE LEITURA no Nextcloud (PROPFIND e GET).
// Para cada projeto de dados.json que tenha:
//   - "nextcloud": [pastas]            -> gera "acervo": quantos arquivos de projeto a Usina produziu, por tipo, e a data do último
//   - "galeria_nextcloud": [itens]     -> gera "imagens": galeria curada (pranchas em PDF viram JPG da página indicada; renders são redimensionados)
// Roda no GitHub Actions depois de robo/atualizar.mjs. Precisa de poppler-utils (pdftoppm) e ImageMagick (convert).
// Segredos: NEXTCLOUD_URL (sem barra no fim), NEXTCLOUD_USER, NEXTCLOUD_SENHA (senha de aplicativo).
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const BASE = (process.env.NEXTCLOUD_URL || '').trim().replace(/\/+$/, '');
const USER = (process.env.NEXTCLOUD_USER || '').trim();
const PASS = process.env.NEXTCLOUD_SENHA || '';
if (!BASE || !USER || !PASS) { console.error('Faltam os segredos NEXTCLOUD_URL, NEXTCLOUD_USER e NEXTCLOUD_SENHA'); process.exit(1); }

const AUTH = 'Basic ' + Buffer.from(`${USER}:${PASS}`).toString('base64');
const ROOT = `${BASE}/remote.php/dav/files/${encodeURIComponent(USER)}`;
const dav = p => ROOT + p.split('/').map(encodeURIComponent).join('/');

const IGNORAR_PASTA = /backup|revit_temp|antigos|anteriores|_shortcuts|datatop|\.sync/i;
// pastas/arquivos recebidos das prefeituras ou de terceiros (não contam como produção da Usina)
const RECEBIDO = /recebid|disponibilizad|dados recebidos|documentos|\bdocs\b|fotos|\batas?\b|briefing|anterior|diretrizes|template|levantamento|lev\.|demandas formalizadas|matriz|reuni/i;
const EXT_PROJETO = /\.(dwg|dxf|rvt|rfa|ifc|skp|pdf|docx?|xlsx?|kmz|kml|nwc)$/i;
const EXT_IMAGEM = /\.(png|jpe?g|webp)$/i;
const hoje = new Date().toISOString().slice(0, 10);

async function propfind(pasta) {
  const r = await fetch(dav(pasta) + '/', {
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
    const depois = href.slice(i + '/dav/files/'.length);          // usuario/caminho...
    const j = depois.indexOf('/'); if (j < 0) continue;
    const rel = decodeURIComponent(depois.slice(j)).replace(/\/$/, '');
    if (rel === pasta.replace(/\/$/, '')) continue;               // a própria pasta
    const dir = /<d:collection\s*\/?>/i.test(b);
    const mod = (b.match(/<d:getlastmodified>([^<]+)</i) || [])[1];
    const bytes = Number((b.match(/<d:getcontentlength>(\d+)</i) || [])[1] || 0);
    itens.push({ path: rel, nome: path.posix.basename(rel), dir, mod: mod ? new Date(mod).toISOString().slice(0, 10) : null, bytes });
  }
  return itens;
}

async function varrer(pasta, prof, acc) {
  if (prof > 7) return;
  let itens;
  try { itens = await propfind(pasta); } catch (e) { console.warn('  aviso:', e.message); return; }
  for (const it of itens) {
    if (it.dir) { if (!IGNORAR_PASTA.test(it.nome)) await varrer(it.path, prof + 1, acc); }
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
  const r = await fetch(dav(arquivo), { headers: { Authorization: AUTH } });
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
  const pastas = p.nextcloud || [];
  const curadoria = p.galeria_nextcloud || [];
  if (!pastas.length && !curadoria.length) continue;
  console.log(`- ${p.slug}`);

  if (pastas.length) {
    const arquivos = [];
    for (const pasta of pastas) await varrer(pasta, 0, arquivos);
    p.acervo = resumoAcervo(arquivos, pastas);
    nAcervo++;
    console.log(`  acervo: ${p.acervo.usina} arquivos da Usina (${Object.entries(p.acervo.por_tipo).map(([k, v]) => k + ' ' + v).join(', ')}), ${p.acervo.recebidos} recebidos, último ${p.acervo.ultimo || '-'}`);
  }

  if (curadoria.length) {
    // expande itens de pasta (até "max" imagens, em ordem de nome) e monta a lista final de fontes
    const fontes = [];
    for (const it of curadoria) {
      if (it.arquivo) fontes.push({ arquivo: it.arquivo, legenda: it.legenda || '', pagina: it.pagina || 1 });
      else if (it.pasta) {
        try {
          const imgs = (await propfind(it.pasta)).filter(x => !x.dir && EXT_IMAGEM.test(x.nome)).sort((a, b) => a.nome.localeCompare(b.nome)).slice(0, it.max || 4);
          imgs.forEach((x, k) => fontes.push({ arquivo: x.path, legenda: (it.legenda || '') + (imgs.length > 1 ? ` (${k + 1}/${imgs.length})` : ''), pagina: 1 }));
        } catch (e) { console.warn('  aviso:', e.message); }
      }
    }
    const anteriores = (p.imagens || []).filter(im => im.fonte);
    const imagens = [];
    for (let k = 0; k < fontes.length; k++) {
      const f = fontes[k];
      const src = `img/galeria/${p.slug}-${k + 1}.jpg`;
      let meta = null;
      try { meta = (await propfind(path.posix.dirname(f.arquivo))).find(x => x.path === f.arquivo) || null; } catch (e) { console.warn('  aviso:', e.message); }
      if (!meta) { console.warn(`  não encontrado no Nextcloud: ${f.arquivo}`); continue; }
      const fonte = { arquivo: f.arquivo, mod: meta.mod, bytes: meta.bytes, pagina: f.pagina };
      const igual = anteriores.find(im => im.src === src && im.fonte.arquivo === fonte.arquivo && im.fonte.mod === fonte.mod && im.fonte.bytes === fonte.bytes && im.fonte.pagina === fonte.pagina);
      if (igual && fsSync.existsSync(src)) { imagens.push({ src, legenda: f.legenda, fonte }); continue; }   // já temos esta imagem
      try {
        const local = path.join(tmp, `${p.slug}-${k + 1}${path.extname(f.arquivo).toLowerCase()}`);
        await baixar(f.arquivo, local);
        paraJpg(local, src, f.pagina);
        imagens.push({ src, legenda: f.legenda, fonte });
        nBaixadas++;
        console.log(`  imagem ${k + 1}: ${f.arquivo} (${(meta.bytes / 1048576).toFixed(1)} MB) -> ${src}`);
      } catch (e) { console.warn(`  falhou ${f.arquivo}: ${e.message}`); }
    }
    // remove sobras de execuções anteriores (ex.: lista encurtou)
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
