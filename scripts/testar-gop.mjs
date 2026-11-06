// Ferramenta de desenvolvimento: nota por som (GOP) com alinhamento forçado CTC.
// Uso: node scripts/testar-gop.mjs <modelo> <dtype> <student|gruut>
import { readFileSync } from 'node:fs';
import { AutoFeatureExtractor, AutoModelForCTC, env } from '@huggingface/transformers';

env.cacheDir = './.cache-modelos';
const id = process.argv[2];
const dtype = process.argv[3] ?? 'q4';
const tipo = process.argv[4] ?? 'student';

const ESPERADO = tipo === 'gruut'
  ? { three: 'θ ɹ i', think: 'θ ɪ ŋ k', house: 'h aʊ s', red: 'ɹ ɛ d', bed: 'b ɛ d', cat: 'k æ t', sing: 's ɪ ŋ', ball: 'b ɔ l', the: 'ð ə' }
  : { three: 'θ ɹ iː', think: 'θ ɪ ŋ k', house: 'h aʊ s', red: 'ɹ ɛ d', bed: 'b ɛ d', cat: 'k æ t', sing: 's ɪ ŋ', ball: 'b ɔː l', the: 'ð ə' };

function lerWav(caminho) {
  const b = readFileSync(caminho);
  let p = 12;
  while (p < b.length) {
    const nome = b.toString('ascii', p, p + 4), tam = b.readUInt32LE(p + 4);
    if (nome === 'data') {
      const out = new Float32Array(tam / 2);
      for (let i = 0; i < out.length; i++) out[i] = b.readInt16LE(p + 8 + i * 2) / 32768;
      return out;
    }
    p += 8 + tam;
  }
}

function logSoftmax(d, T, V) {
  const out = new Float32Array(T * V);
  for (let t = 0; t < T; t++) {
    let m = -Infinity;
    for (let v = 0; v < V; v++) m = Math.max(m, d[t * V + v]);
    let s = 0;
    for (let v = 0; v < V; v++) s += Math.exp(d[t * V + v] - m);
    const l = m + Math.log(s);
    for (let v = 0; v < V; v++) out[t * V + v] = d[t * V + v] - l;
  }
  return out;
}

/** Viterbi CTC: alinha a sequência esperada (com brancos entre) aos quadros. Devolve [inicio, fim] de cada som. */
function alinhar(lp, T, V, alvo) {
  const S = alvo.length * 2 + 1;
  const tok = (s) => (s % 2 === 0 ? 0 : alvo[(s - 1) / 2]);
  const NEG = -1e9;
  let dp = new Float32Array(S).fill(NEG);
  const volta = [];
  dp[0] = lp[0];
  if (S > 1) dp[1] = lp[tok(1)];
  volta.push(new Int16Array(S).fill(-1));
  for (let t = 1; t < T; t++) {
    const nd = new Float32Array(S).fill(NEG), vb = new Int16Array(S);
    for (let s = 0; s < S; s++) {
      let melhor = dp[s], de = s;
      if (s > 0 && dp[s - 1] > melhor) { melhor = dp[s - 1]; de = s - 1; }
      if (s > 1 && tok(s) !== 0 && tok(s) !== tok(s - 2) && dp[s - 2] > melhor) { melhor = dp[s - 2]; de = s - 2; }
      nd[s] = melhor + lp[t * V + tok(s)];
      vb[s] = de;
    }
    dp = nd;
    volta.push(vb);
  }
  let s = S > 1 && dp[S - 2] > dp[S - 1] ? S - 2 : S - 1;
  const estado = new Int16Array(T);
  for (let t = T - 1; t >= 0; t--) { estado[t] = s; s = volta[t][s]; }
  const seg = alvo.map(() => [Infinity, -1]);
  for (let t = 0; t < T; t++) if (estado[t] % 2 === 1) {
    const k = (estado[t] - 1) / 2;
    seg[k][0] = Math.min(seg[k][0], t); seg[k][1] = Math.max(seg[k][1], t);
  }
  return seg;
}

const extractor = await AutoFeatureExtractor.from_pretrained(id);
const model = await AutoModelForCTC.from_pretrained(id, { dtype });
const vocab = await (await fetch(`https://huggingface.co/${id}/resolve/main/vocab.json`)).json();
const porId = Object.fromEntries(Object.entries(vocab).map(([k, v]) => [v, k]));

for (const [palavra, fones] of Object.entries(ESPERADO)) {
  for (const quem of ['en', 'br']) {
    const audio = lerWav(new URL(`./audios/${quem}-${palavra}.wav`, import.meta.url));
    const { logits } = await model(await extractor(audio));
    const [, T, V] = logits.dims;
    const lp = logSoftmax(logits.data, T, V);
    const alvo = fones.split(' ').map((f) => vocab[f]);
    const seg = alinhar(lp, T, V, alvo);
    const partes = alvo.map((a, k) => {
      const [i, f] = seg[k];
      if (f < 0) return `${porId[a]}:--`;
      // média do log da prob. do som esperado e do som mais provável no mesmo trecho
      let somaE = 0; const somaOutros = new Float32Array(V);
      for (let t = i; t <= f; t++) { somaE += lp[t * V + a]; for (let v = 1; v < V; v++) somaOutros[v] += lp[t * V + v]; }
      const n = f - i + 1;
      let melhor = 1;
      for (let v = 2; v < V; v++) if (somaOutros[v] > somaOutros[melhor]) melhor = v;
      const gop = somaE / n - somaOutros[melhor] / n; // 0 = o esperado é o mais provável; negativo = outro som venceu
      const nota = Math.round(100 * Math.exp(Math.max(-5, Math.min(0, gop)) / 1.5));
      return `${porId[a]}:${nota}${melhor !== a && gop < -0.5 ? `(${porId[melhor]})` : ''}`;
    });
    // "i" a mais no fim
    const fim = seg[seg.length - 1][1];
    let extra = 0;
    for (const v of ['i', 'ɪ', 'iː', 'ə']) if (vocab[v] !== undefined) for (let t = fim + 1; t < T; t++) extra = Math.max(extra, Math.exp(lp[t * V + vocab[v]]));
    console.log(`${quem}-${palavra.padEnd(6)} ${partes.join('  ').padEnd(40)} vogal extra no fim: ${Math.round(extra * 100)}%`);
  }
}
