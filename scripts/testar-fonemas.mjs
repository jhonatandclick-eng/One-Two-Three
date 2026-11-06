// Ferramenta de desenvolvimento: roda um modelo de fonemas nos áudios de scripts/audios e mostra o que ele ouviu.
// Uso: node scripts/testar-fonemas.mjs <modelo> <dtype>
import { readFileSync, readdirSync } from 'node:fs';
import { AutoFeatureExtractor, AutoModelForCTC, AutoTokenizer, env } from '@huggingface/transformers';

env.cacheDir = './.cache-modelos';
const id = process.argv[2] ?? 'air-air/xlsr-53-espeak-student-ONNX';
const dtype = process.argv[3] ?? 'q4';

function lerWav(caminho) {
  const b = readFileSync(caminho);
  let p = 12;
  while (p < b.length) {
    const nome = b.toString('ascii', p, p + 4);
    const tam = b.readUInt32LE(p + 4);
    if (nome === 'data') {
      const n = tam / 2;
      const out = new Float32Array(n);
      for (let i = 0; i < n; i++) out[i] = b.readInt16LE(p + 8 + i * 2) / 32768;
      return out;
    }
    p += 8 + tam;
  }
  throw new Error('wav sem data');
}

const t0 = Date.now();
const extractor = await AutoFeatureExtractor.from_pretrained(id);
const model = await AutoModelForCTC.from_pretrained(id, { dtype });
const vocab = await (await fetch(`https://huggingface.co/${id}/resolve/main/vocab.json`)).json();
const porId = Object.fromEntries(Object.entries(vocab).map(([k, v]) => [v, k]));
console.log(`carregou em ${Date.now() - t0} ms`);

const dir = new URL('./audios/', import.meta.url);
for (const f of readdirSync(dir).sort((a, b) => a.slice(3).localeCompare(b.slice(3)) || a.localeCompare(b))) {
  const audio = lerWav(new URL(f, dir));
  const t = Date.now();
  const { logits } = await model(await extractor(audio));
  const [, T, V] = logits.dims;
  const d = logits.data;
  const seq = [];
  let ant = -1;
  for (let i = 0; i < T; i++) {
    let m = 0;
    for (let v = 1; v < V; v++) if (d[i * V + v] > d[i * V + m]) m = v;
    if (m !== ant && m !== 0) seq.push(porId[m]);
    ant = m;
  }
  console.log(`${f.padEnd(14)} ${seq.filter((s) => !/^<|^\|$|^\[/.test(s)).join(' ').padEnd(24)} (${Date.now() - t} ms)`);
}
