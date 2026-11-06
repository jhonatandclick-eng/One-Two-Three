// Ferramenta de desenvolvimento: roda a avaliação som por som do app (src/lib/fonemas.ts) nos áudios de teste.
// Uso: node scripts/testar-sons.ts
import { readFileSync, readdirSync } from 'node:fs';
import { AutoFeatureExtractor, AutoModelForCTC, env } from '@huggingface/transformers';
import { avaliarSons, ipaParaFones, nomeDoSom, soaComo } from '../src/lib/fonemas.ts';

const MODELO = 'onnx-community/wav2vec2-lv-60-espeak-cv-ft-ONNX';
env.cacheDir = './.cache-modelos';

const conteudo = JSON.parse(readFileSync(new URL('../src/content/iniciante.json', import.meta.url), 'utf8'));
const ipa: Record<string, string> = {};
for (const u of conteudo.unidades) for (const p of u.palavras) ipa[p.en.toLowerCase()] = p.ipa;
ipa['the'] = 'ðə';
ipa['ball'] = 'bɔːl';
ipa['sing'] = 'sɪŋ';
ipa['think'] = 'θɪŋk';

function lerWav(caminho: URL): Float32Array {
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
  throw new Error('wav sem data');
}

const extractor = await AutoFeatureExtractor.from_pretrained(MODELO);
const model = await AutoModelForCTC.from_pretrained(MODELO, { dtype: 'q4' });
const vocab: Record<string, number> = await (await fetch(`https://huggingface.co/${MODELO}/resolve/main/vocab.json`)).json();

const dir = new URL('./audios/', import.meta.url);
const arquivos = readdirSync(dir).filter((f) => f.endsWith('.wav')).sort((a, b) => a.slice(3).localeCompare(b.slice(3)) || b.localeCompare(a));
for (const f of arquivos) {
  const palavra = f.replace(/^\w+-|\.wav$/g, '');
  const fones = ipaParaFones(ipa[palavra], (t) => t in vocab);
  const audio = lerWav(new URL(f, dir));
  const t0 = Date.now();
  const { logits } = await model(await extractor(audio));
  const [, T, V] = logits.dims;
  const r = avaliarSons(logits.data, T, V, fones, vocab);
  const det = r.fones.map((x) => `${nomeDoSom(x.fone)}:${x.nota}${x.ouvido ? `(${soaComo(x.ouvido) ?? x.ouvido})` : ''}`).join(' ');
  console.log(`${f.padEnd(14)} nota ${String(r.nota).padStart(3)}  ${det.padEnd(46)} vogal extra ${Math.round(r.vogalExtra * 100)}%  ${Date.now() - t0}ms`);
}
