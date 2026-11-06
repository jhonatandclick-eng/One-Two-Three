import { describe, expect, it } from 'vitest';
import { TODAS_PALAVRAS } from '../content';
import { avaliarSons, ipaParaFones, nomeDoSom } from '../lib/fonemas';

// Parte do vocabulário do modelo (espeak) para os testes.
const SIMBOLOS = ['<pad>', '<s>', '</s>', '<unk>', 'n', 's', 't', 'ə', 'l', 'a', 'i', 'k', 'd', 'm', 'ɛ', 'ɾ', 'e', 'ɪ', 'p', 'o',
  'ɐ', 'z', 'ð', 'f', 'j', 'v', 'b', 'ɹ', 'ʁ', 'ʊ', 'iː', 'r', 'w', 'ʌ', 'u', 'ɡ', 'æ', 'aɪ', 'ʃ', 'h', 'ɔ', 'ɑː', 'ŋ', 'ɚ',
  'eɪ', 'uː', 'oʊ', 'θ', 'aʊ', 'dʒ', 'əl', 'ɜː', 'ʒ', 'tʃ', 'ɔː', 'ɑːɹ', 'ɔːɹ', 'ɛɹ', 'ɪɹ', 'ɔɪ', 'ʊɹ', 'ts.'];
const vocab: Record<string, number> = Object.fromEntries(SIMBOLOS.map((s, i) => [s, i]));
const existe = (t: string) => t in vocab;

/** Monta "logits" falsos: cada som ocupa alguns quadros, com brancos entre eles. */
function logitsDe(sons: string[], quadros = 4): { d: Float32Array; T: number; V: number } {
  const V = SIMBOLOS.length;
  const seq: number[] = [0, 0];
  for (const s of sons) { for (let q = 0; q < quadros; q++) seq.push(vocab[s]); seq.push(0); }
  seq.push(0, 0);
  const T = seq.length;
  const d = new Float32Array(T * V).fill(-4);
  seq.forEach((id, t) => { d[t * V + id] = 6; });
  return { d, T, V };
}

describe('IPA do conteúdo -> sons do modelo', () => {
  it('converte as convenções do dicionário', () => {
    expect(ipaParaFones('θriː', existe)).toEqual(['θ', 'ɹ', 'iː']);
    expect(ipaParaFones('bed', existe)).toEqual(['b', 'ɛ', 'd']);
    expect(ipaParaFones('ˈɔːr.ɪndʒ', existe)).toEqual(['ɔːɹ', 'ɪ', 'n', 'dʒ']);
    expect(ipaParaFones('neɪm', existe)).toEqual(['n', 'eɪ', 'm']);
    expect(ipaParaFones('bɝːd', existe)).toEqual(['b', 'ɜː', 'd']);
    expect(ipaParaFones('ˈæpəl', existe)).toEqual(['æ', 'p', 'əl']);
  });

  it('todas as palavras do Iniciante viram uma sequência de sons', () => {
    for (const p of TODAS_PALAVRAS) {
      const f = ipaParaFones(p.ipa, existe);
      expect(f.length, p.en).toBeGreaterThan(0);
    }
  });
});

describe('nota som por som', () => {
  const three = ['θ', 'ɹ', 'iː'];

  it('pronúncia certa dá nota alta em todos os sons', () => {
    const { d, T, V } = logitsDe(three);
    const r = avaliarSons(d, T, V, three, vocab);
    expect(r.nota).toBe(100);
    expect(r.fones.every((f) => f.nota === 100)).toBe(true);
  });

  it('"tri" no lugar de "three": o th sai como t e a nota cai', () => {
    const { d, T, V } = logitsDe(['t', 'ɹ', 'iː']);
    const r = avaliarSons(d, T, V, three, vocab);
    expect(r.fones[0].nota).toBeLessThan(20);
    expect(r.fones[0].ouvido).toBe('t');
    expect(r.fones[1].nota).toBe(100);
    expect(r.nota).toBeLessThan(75);
  });

  it('detecta o "i" a mais no fim ("bédi")', () => {
    const { d, T, V } = logitsDe(['b', 'ɛ', 'd', 'i']);
    const r = avaliarSons(d, T, V, ['b', 'ɛ', 'd'], vocab);
    expect(r.vogalExtra).toBeGreaterThan(0.5);
    expect(r.nota).toBeLessThan(90);
  });

  it('variação normal do americano não é erro (ɑː no lugar de ɔː)', () => {
    const { d, T, V } = logitsDe(['w', 'ɑː', 'k']);
    const r = avaliarSons(d, T, V, ['w', 'ɔː', 'k'], vocab);
    expect(r.nota).toBe(100);
  });

  it('silêncio não ganha nota', () => {
    const V = SIMBOLOS.length, T = 30;
    const d = new Float32Array(T * V).fill(-4);
    for (let t = 0; t < T; t++) d[t * V] = 6;
    const r = avaliarSons(d, T, V, three, vocab);
    expect(r.vazio).toBe(true);
    expect(r.nota).toBe(0);
  });

  it('nomes em português', () => {
    expect(nomeDoSom('θ')).toBe('th');
    expect(nomeDoSom('æ')).toBe('a aberto');
  });
});
