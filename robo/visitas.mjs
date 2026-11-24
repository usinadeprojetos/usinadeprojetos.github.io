// Lê o total de visitas do site no contador público do GoatCounter (anônimo, sem cookies) e acrescenta a leitura em
// historico/visitas.json: { fonte, leituras: [[data ISO, total acumulado], ...] }. O relatório calcula as visitas de um
// período pela diferença entre as leituras (mais a leitura ao vivo do dia).
// Chamado por robo/historico.mjs. Nunca derruba o robô: sem a conta criada, ou sem a opção
// "Allow adding visitor counts on your website" ligada nas configurações do GoatCounter, só avisa no log e segue.
import fs from 'node:fs/promises';

const SITE = 'https://usinadeprojetos.goatcounter.com';
const ARQ = 'historico/visitas.json';

try {
  const r = await fetch(SITE + '/counter/TOTAL.json', { headers: { 'User-Agent': 'robo-usina' }, signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const j = await r.json();
  const txt = String(j.count == null ? '' : j.count).replace(/\D/g, '');
  if (!txt) throw new Error('resposta sem contagem');
  const total = Number(txt);
  let h = { leituras: [] };
  try { h = JSON.parse(await fs.readFile(ARQ, 'utf8')); } catch {}
  const leituras = Array.isArray(h.leituras) ? h.leituras : [];
  leituras.push([new Date().toISOString(), total]);
  await fs.mkdir('historico', { recursive: true });
  await fs.writeFile(ARQ, JSON.stringify({ fonte: SITE + '/counter/TOTAL.json', leituras }));
  console.log(`Visitas: total acumulado ${total} (${leituras.length} leituras)`);
} catch (e) {
  console.log(`Visitas: contador indisponível (${e.message}). Conta do GoatCounter criada e "Allow adding visitor counts on your website" ligado?`);
}
