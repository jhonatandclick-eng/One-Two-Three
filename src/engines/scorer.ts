import { doubleMetaphone } from 'double-metaphone';
import { normalizarPalavra, normalizarTexto, palavrasDaTela } from '../lib/normalize';

export type StatusPalavra = 'certa' | 'quase' | 'errada';

export interface Alternativa {
  text: string;
  confidence?: number;
}

export interface ResultadoPalavra {
  /** palavra como aparece na tela */
  tela: string;
  status: StatusPalavra;
}

export interface ResultadoOuvida {
  palavra: string;
  /** true quando a palavra não corresponde ao esperado (trocada ou a mais) */
  erro: boolean;
}

export interface Avaliacao {
  nota: number; // 0 a 100
  mensagem: string;
  palavras: ResultadoPalavra[];
  ouvido: string;
  ouvidas: ResultadoOuvida[];
}

/** Interface trocável: no futuro pode virar um serviço externo. */
export interface Scorer {
  avaliar(esperado: string, alternativas: Alternativa[]): Avaliacao;
}

export function distancia(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

function similaridade(a: string, b: string): number {
  const max = Math.max(a.length, b.length) || 1;
  return 1 - distancia(a, b) / max;
}

const cacheFonetico = new Map<string, [string, string]>();
function fonetico(p: string): [string, string] {
  let v = cacheFonetico.get(p);
  if (!v) {
    v = doubleMetaphone(p) as [string, string];
    cacheFonetico.set(p, v);
  }
  return v;
}

function mesmoSom(a: string, b: string): boolean {
  const [a1, a2] = fonetico(a);
  const [b1, b2] = fonetico(b);
  if (!a1 || !b1) return false;
  return a1 === b1 || a1 === b2 || a2 === b1;
}

/** Compara duas palavras já normalizadas. */
export function compararPalavra(esperada: string, ouvida: string): StatusPalavra {
  if (esperada === ouvida) return 'certa';
  const d = distancia(esperada, ouvida);
  const sim = similaridade(esperada, ouvida);
  // Mesmo som (ex.: two/to, there/their) conta como certa.
  if (mesmoSom(esperada, ouvida) && d <= 2) return 'certa';
  // Erro de digitação/reconhecimento mínimo em palavra longa.
  if (esperada.length >= 6 && d === 1 && !ouvida.startsWith(esperada)) return 'certa';
  if (sim >= 0.5 || (mesmoSom(esperada, ouvida) && sim >= 0.34)) return 'quase';
  return 'errada';
}

const PESO: Record<StatusPalavra, number> = { certa: 1, quase: 0.5, errada: 0 };
const CUSTO: Record<StatusPalavra, number> = { certa: 0, quase: 0.6, errada: 1.4 };

interface Par {
  e: number | null; // índice na lista esperada
  o: number | null; // índice na lista ouvida
  status: StatusPalavra;
}

/** Alinhamento tipo Levenshtein no nível das palavras (programação dinâmica). */
export function alinhar(esp: string[], ouv: string[]): Par[] {
  const m = esp.length, n = ouv.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  const st: StatusPalavra[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill('errada'));
  for (let i = 1; i <= m; i++) dp[i][0] = i;
  for (let j = 1; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const s = compararPalavra(esp[i - 1], ouv[j - 1]);
      st[i][j] = s;
      dp[i][j] = Math.min(dp[i - 1][j - 1] + CUSTO[s], dp[i - 1][j] + 1, dp[i][j - 1] + 1);
    }
  }
  const pares: Par[] = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + CUSTO[st[i][j]]) {
      pares.push({ e: i - 1, o: j - 1, status: st[i][j] });
      i--; j--;
    } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
      pares.push({ e: i - 1, o: null, status: 'errada' });
      i--;
    } else {
      pares.push({ e: null, o: j - 1, status: 'errada' });
      j--;
    }
  }
  return pares.reverse();
}

export function mensagemDaNota(nota: number): string {
  if (nota >= 90) return 'Excelente!';
  if (nota >= 70) return 'Quase lá!';
  return 'Vamos tentar de novo';
}

const PIOR: Record<StatusPalavra, number> = { certa: 0, quase: 1, errada: 2 };

function avaliarUma(esperado: string, alt: Alternativa): Avaliacao {
  const tela = palavrasDaTela(esperado);
  const esp: string[] = [];
  const dono: number[] = [];
  tela.forEach((t, idx) => {
    for (const p of normalizarPalavra(t)) {
      esp.push(p);
      dono.push(idx);
    }
  });
  const ouvidasBrutas = palavrasDaTela(alt.text.replace(/[-–—:/]/g, ' '));
  const ouv: string[] = [];
  const donoOuv: number[] = [];
  ouvidasBrutas.forEach((t, idx) => {
    for (const p of normalizarPalavra(t)) {
      ouv.push(p);
      donoOuv.push(idx);
    }
  });

  const pares = alinhar(esp, ouv);
  const statusEsp: StatusPalavra[] = esp.map(() => 'errada');
  const erroOuv = ouvidasBrutas.map(() => false);
  for (const p of pares) {
    if (p.e !== null) statusEsp[p.e] = p.o !== null ? p.status : 'errada';
    if (p.o !== null && (p.e === null || p.status !== 'certa')) erroOuv[donoOuv[p.o]] = true;
  }

  const palavras: ResultadoPalavra[] = tela.map((t) => ({ tela: t, status: 'certa' as StatusPalavra }));
  // palavras de tela sem nada para comparar (ex.: só pontuação) ficam como certas
  statusEsp.forEach((s, k) => {
    const alvo = palavras[dono[k]];
    if (PIOR[s] > PIOR[alvo.status]) alvo.status = s;
  });

  let nota = esp.length
    ? (statusEsp.reduce((soma, s) => soma + PESO[s], 0) / esp.length) * 100
    : 0;
  // Palavras a mais diminuem um pouco a nota.
  const extras = pares.filter((p) => p.e === null).length;
  if (extras > 0 && esp.length) nota -= Math.min(15, (extras / esp.length) * 30);
  // Ajuste leve pela confiança do motor, quando existir.
  if (typeof alt.confidence === 'number' && alt.confidence > 0 && alt.confidence <= 1) {
    nota *= 0.92 + 0.08 * alt.confidence;
  }
  nota = Math.max(0, Math.min(100, Math.round(nota)));
  if (!ouv.length) nota = 0;

  return {
    nota,
    mensagem: mensagemDaNota(nota),
    palavras,
    ouvido: alt.text.trim(),
    ouvidas: ouvidasBrutas.map((palavra, k) => ({ palavra, erro: erroOuv[k] })),
  };
}

export const scorerLocal: Scorer = {
  avaliar(esperado, alternativas) {
    const alts = alternativas.filter((a) => a.text && a.text.trim());
    if (!alts.length) {
      return {
        nota: 0,
        mensagem: 'Não ouvi nada. Vamos tentar de novo',
        palavras: palavrasDaTela(esperado).map((tela) => ({ tela, status: 'errada' })),
        ouvido: '',
        ouvidas: [],
      };
    }
    // Usa a alternativa que mais se aproxima do texto esperado.
    let melhor = avaliarUma(esperado, alts[0]);
    for (const a of alts.slice(1)) {
      const r = avaliarUma(esperado, a);
      if (r.nota > melhor.nota) melhor = r;
    }
    return melhor;
  },
};

/** Compara um texto digitado (ditado). Sem ajuste de confiança. */
export function corrigirDitado(esperado: string, digitado: string): Avaliacao {
  return scorerLocal.avaliar(esperado, [{ text: digitado }]);
}

export { normalizarTexto };
