// Avaliação som por som (GOP, "goodness of pronunciation").
// O modelo de fonemas diz, a cada 20 ms de áudio, a chance de cada som. Aqui:
// 1) transformamos o IPA da palavra nos sons que o modelo conhece;
// 2) alinhamos esses sons ao áudio (alinhamento forçado CTC, por Viterbi);
// 3) em cada trecho, comparamos a chance do som esperado com a do som mais provável.
// Funções puras: rodam no Web Worker do app e nos testes.

export interface ResultadoFone {
  /** som esperado (símbolo do modelo) */
  fone: string;
  /** 0 a 100 */
  nota: number;
  /** som que pareceu sair no lugar, quando foi outro */
  ouvido?: string;
}

export interface ResultadoSons {
  fones: ResultadoFone[];
  /** chance de ter saído uma vogal a mais no fim (o "i" do "bédi") */
  vogalExtra: number;
  /** nota geral da pronúncia, 0 a 100 */
  nota: number;
  /** não deu para avaliar (sem fala ou palavra sem IPA) */
  vazio?: boolean;
}

/** Converte o IPA escrito no conteúdo (estilo dicionário) para os símbolos do modelo (espeak, en-US). */
export function ipaParaFones(ipa: string, existe: (t: string) => boolean): string[] {
  let s = ipa.replace(/[ˈˌ.\/\[\]\s]/g, '');
  s = s.replace(/ɝː|ɝ/g, 'ɜː').replace(/ɡ/g, 'ɡ').replace(/g/g, 'ɡ');
  // "e" sozinho no IPA de dicionário americano é o "é" (ɛ) do espeak; "eɪ" continua "eɪ"
  s = s.replace(/e(?!ɪ)/g, 'ɛ');
  s = s.replace(/r/g, 'ɹ');
  const out: string[] = [];
  let i = 0;
  while (i < s.length) {
    let achou = '';
    for (let n = 4; n >= 1; n--) {
      const pedaco = s.slice(i, i + n);
      if (pedaco.length === n && existe(pedaco)) { achou = pedaco; break; }
    }
    if (!achou) { i++; continue; } // símbolo desconhecido: ignora
    out.push(achou);
    i += achou.length;
  }
  return out;
}

/**
 * Sons que contam como o mesmo (variações normais do inglês americano ou do jeito que o modelo escreve).
 * Não incluímos aqui as trocas típicas de brasileiro (θ→t, ɹ→r, h→r...): essas devem baixar a nota.
 */
const GRUPOS: string[][] = [
  ['ɑː', 'ɑ', 'ɔː', 'ɔ', 'aː', 'ɒ'],
  ['ɔː', 'ɔ', 'ɑː', 'ɑ', 'ɒ'], // no inglês americano "caught" e "cot" costumam soar iguais
  ['ə', 'ʌ', 'ɐ', 'ɜ', 'əɜ', 'ᵻ'],
  ['ɪ', 'ᵻ', 'ɨ', 'ə'],
  ['i', 'iː'],
  ['u', 'uː', 'ʉ'],
  ['ɛ', 'e', 'eː', 'ɛː'],
  ['oʊ', 'o', 'oː', 'əʊ'],
  ['eɪ', 'e', 'eː'],
  ['ɚ', 'ɜː', 'ɜ', 'ɜːɹ'],
  ['ɜː', 'ɚ', 'ɜ'],
  ['ɑːɹ', 'ɑː', 'ɑ'],
  ['ɔːɹ', 'oːɹ', 'ɔː', 'oː'],
  ['ɛɹ', 'ɛ', 'e'],
  ['ɪɹ', 'ɪ', 'iə', 'i'],
  ['ʊɹ', 'ʊ'],
  ['əl', 'l', 'ɫ'],
  ['l', 'ɫ', 'əl'],
  ['t', 'ɾ', 'ʔ', 'th', 't̪'],
  ['d', 'ɾ', 'd̪'],
  ['k', 'kh'],
  ['p', 'ph'],
  ['ɹ', 'ɻ'],
  ['aɪ', 'aɪə', 'aɪɚ'],
  ['aʊ', 'aʊə'],
];

export function grupoDe(fone: string): string[] {
  const g = new Set([fone]);
  for (const grupo of GRUPOS) if (grupo[0] === fone) grupo.forEach((x) => g.add(x));
  return [...g];
}

export function logSoftmax(d: ArrayLike<number>, T: number, V: number): Float32Array {
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

/** Alinhamento forçado CTC (Viterbi). emis[k][t] = log-prob do som k no quadro t. Devolve [início, fim] de cada som. */
export function alinharCtc(emis: Float32Array[], branco: Float32Array, T: number): [number, number][] {
  const K = emis.length;
  const S = 2 * K + 1;
  const e = (s: number, t: number) => (s % 2 === 0 ? branco[t] : emis[(s - 1) / 2][t]);
  const NEG = -1e9;
  let dp = new Float64Array(S).fill(NEG);
  const volta: Int16Array[] = [new Int16Array(S).fill(-1)];
  dp[0] = e(0, 0);
  if (S > 1) dp[1] = e(1, 0);
  for (let t = 1; t < T; t++) {
    const nd = new Float64Array(S).fill(NEG);
    const vb = new Int16Array(S);
    for (let s = 0; s < S; s++) {
      let melhor = dp[s], de = s;
      if (s > 0 && dp[s - 1] > melhor) { melhor = dp[s - 1]; de = s - 1; }
      // pula o branco entre dois sons diferentes
      if (s > 1 && s % 2 === 1 && dp[s - 2] > melhor) { melhor = dp[s - 2]; de = s - 2; }
      nd[s] = melhor + e(s, t);
      vb[s] = de;
    }
    dp = nd;
    volta.push(vb);
  }
  let s = S > 1 && dp[S - 2] > dp[S - 1] ? S - 2 : S - 1;
  const seg: [number, number][] = Array.from({ length: K }, () => [Infinity, -1]);
  for (let t = T - 1; t >= 0; t--) {
    if (s % 2 === 1) {
      const k = (s - 1) / 2;
      seg[k][0] = Math.min(seg[k][0], t);
      seg[k][1] = Math.max(seg[k][1], t);
    }
    s = volta[t][s];
    if (s < 0) break;
  }
  return seg;
}

/** GOP -> nota de 0 a 100. 0 = o som esperado foi o mais provável. */
export function notaDoGop(gop: number): number {
  return Math.round(100 * Math.exp(Math.max(-6, Math.min(0, gop)) / 2));
}

const VOGAIS_EXTRA = ['i', 'iː', 'ɪ', 'ᵻ', 'ə', 'ɨ'];
const TERMINA_EM_CONSOANTE = /^(p|b|t|d|k|ɡ|f|v|s|z|ʃ|ʒ|tʃ|dʒ|θ|ð|m|n|ŋ|l)$/;

/**
 * Avalia os sons de uma palavra.
 * @param logits saída do modelo (T x V)
 * @param vocab símbolo -> id
 */
export function avaliarSons(logits: ArrayLike<number>, T: number, V: number, fones: string[], vocab: Record<string, number>): ResultadoSons {
  if (!fones.length || T < 3) return { fones: [], vogalExtra: 0, nota: 0, vazio: true };
  const porId: string[] = [];
  for (const [k, v] of Object.entries(vocab)) porId[v] = k;
  const lp = logSoftmax(logits, T, V);
  const ignorar = new Set([0, 1, 2, 3].filter((x) => x < V)); // <pad>(branco), <s>, </s>, <unk>

  // Tem fala? Se quase todos os quadros são "branco", não houve fala.
  let quadrosComSom = 0;
  for (let t = 0; t < T; t++) if (lp[t * V] < Math.log(0.5)) quadrosComSom++;
  if (quadrosComSom < 2) return { fones: fones.map((f) => ({ fone: f, nota: 0 })), vogalExtra: 0, nota: 0, vazio: true };

  const grupos = fones.map((f) => grupoDe(f).map((x) => vocab[x]).filter((x) => x !== undefined));
  const emis = grupos.map((g) => {
    const a = new Float32Array(T);
    for (let t = 0; t < T; t++) { let m = -Infinity; for (const id of g) m = Math.max(m, lp[t * V + id]); a[t] = m; }
    return a;
  });
  const branco = new Float32Array(T);
  for (let t = 0; t < T; t++) branco[t] = lp[t * V];
  const seg = alinharCtc(emis, branco, T);

  const res: ResultadoFone[] = fones.map((fone, k) => {
    const [ini, fim] = seg[k];
    if (fim < 0) return { fone, nota: 0 };
    const n = fim - ini + 1;
    const somaGrupo = emis[k].slice(ini, fim + 1).reduce((a, b) => a + b, 0) / n;
    const soma = new Float64Array(V);
    for (let t = ini; t <= fim; t++) for (let v = 0; v < V; v++) soma[v] += lp[t * V + v];
    const noGrupo = new Set(grupos[k]);
    let melhor = -1;
    for (let v = 0; v < V; v++) {
      if (ignorar.has(v) || noGrupo.has(v)) continue;
      if (melhor < 0 || soma[v] > soma[melhor]) melhor = v;
    }
    const gop = somaGrupo - soma[melhor] / n;
    const nota = notaDoGop(gop);
    return nota < 60 ? { fone, nota, ouvido: porId[melhor] } : { fone, nota };
  });

  // Vogal a mais depois do último som (só importa se a palavra termina em consoante)
  let vogalExtra = 0;
  const ultimo = seg[seg.length - 1][1];
  if (TERMINA_EM_CONSOANTE.test(fones[fones.length - 1]) && ultimo >= 0) {
    const ids = VOGAIS_EXTRA.map((x) => vocab[x]).filter((x) => x !== undefined);
    for (let t = ultimo + 1; t < T; t++) for (const id of ids) vogalExtra = Math.max(vogalExtra, Math.exp(lp[t * V + id]));
  }

  let nota = res.reduce((a, r) => a + r.nota, 0) / res.length;
  if (vogalExtra > 0.5) nota -= 15 * vogalExtra;
  return { fones: res, vogalExtra: Math.round(vogalExtra * 100) / 100, nota: Math.max(0, Math.round(nota)) };
}

/* ---------- Nomes e dicas em português para cada som ---------- */

const NOMES: Record<string, string> = {
  'θ': 'th', 'ð': 'th', 'ɹ': 'r', 'h': 'h', 'æ': 'a aberto', 'ŋ': 'ng', 'ɪ': 'i curto', 'iː': 'i longo', 'i': 'i',
  'uː': 'u longo', 'ʊ': 'u curto', 'ʌ': 'â', 'ə': 'â fraco', 'ɚ': 'er', 'ɜː': 'er', 'ɑː': 'á', 'ɔː': 'ó', 'ɔːɹ': 'ór',
  'ɑːɹ': 'ár', 'ɛɹ': 'ér', 'ɪɹ': 'ir', 'ɛ': 'é', 'eɪ': 'ei', 'aɪ': 'ai', 'aʊ': 'au', 'oʊ': 'ou', 'ɔɪ': 'ói',
  'tʃ': 'tch', 'dʒ': 'dj', 'ʃ': 'ch', 'ʒ': 'j', 'j': 'i (y)', 'w': 'u (w)', 'əl': 'l final', 'l': 'l',
};

export function nomeDoSom(f: string): string {
  return NOMES[f] ?? f;
}

/** Como o som que saiu no lugar soa para um brasileiro. */
const PARECE: Record<string, string> = {
  't': 't', 'd': 'd', 's': 's', 'f': 'f', 'z': 'z', 'v': 'v', 'r': 'r vibrado', 'ɾ': 'r de "caro"', 'ʁ': 'r de "rato"',
  'x': 'r de "rato"', 'h': 'h', 'i': 'i', 'iː': 'i', 'e': 'ê', 'ɛ': 'é', 'a': 'a', 'aː': 'a', 'o': 'ô', 'u': 'u',
  'dʒ': 'dj', 'tʃ': 'tch', 'ts.': 'tch', 'ts.h': 'tch', 'ts': 'ts', 'k': 'k', 'p': 'p', 'b': 'b', 'n': 'n', 'm': 'm',
  'ʃ': 'ch', 'l': 'l', 'w': 'u', 'ɐ': 'a', 'ə': 'â', 'ʊ': 'u', 'ŋ': 'ng', 'ɡ': 'g', 'eɪ': 'ei', 'oʊ': 'ou', 'aɪ': 'ai',
  'ɑ̃': 'ã', 'ɐ̃': 'ã', 'ẽ': 'ẽ', 'ĩ': 'ĩ', 'õ': 'õ', 'ũ': 'ũ', 'i5': 'i', 'kh': 'k', 's.': 's', 'ɕ': 'ch', 'tɕ': 'tch', 'dʑ': 'dj', 'iɛ5': 'é', 'ɑ': 'á', 'ɔ': 'ó',
};

export function soaComo(f: string | undefined): string | undefined {
  return f ? PARECE[f] : undefined;
}

const DICAS: Record<string, string> = {
  'θ': 'Ponha a ponta da língua entre os dentes e sopre. Não é "t", "f" nem "s".',
  'ð': 'Língua entre os dentes, com a garganta vibrando. Não troque por "d".',
  'ɹ': 'Dobre a ponta da língua para trás sem encostar no céu da boca. Não vibre.',
  'h': 'É só um sopro suave, sem raspar a garganta.',
  'æ': 'Abra bem a boca, entre "é" e "a".',
  'ŋ': 'Termine com o som saindo pelo nariz, sem "gui" no fim.',
  'ɪ': 'Um "i" curto e relaxado, quase "ê".',
  'iː': 'Um "i" comprido, lábios esticados como num sorriso.',
  'uː': 'Um "u" comprido, lábios bem para a frente.',
  'ɚ': 'Curve a língua para trás no fim, como um "r" americano.',
  'ɜː': 'Vogal com a língua curvada para trás, como um "âr" americano.',
  'ɔːɹ': 'Um "ó" seguido do "r" americano, com a língua curvada.',
  'ɑːɹ': 'Um "á" seguido do "r" americano, com a língua curvada.',
  'ɛɹ': 'Um "é" seguido do "r" americano.',
  'əl': 'A ponta da língua encosta atrás dos dentes. Não vire "u".',
  'l': 'A ponta da língua encosta atrás dos dentes. Não vire "u".',
  'd': 'Um "d" seco, sem virar "dj".',
  't': 'Um "t" seco, sem virar "tch".',
  'v': 'Dentes de cima no lábio de baixo, com vibração.',
  'eɪ': 'Deslize de "é" para "i": "ei".',
  'oʊ': 'Deslize de "ô" para "u": "ou".',
  'z': 'Com vibração, como um zumbido.',
  's': 'Sem vibração, como um assobio.',
};

export function dicaDoSom(f: string): string | undefined {
  return DICAS[f];
}
