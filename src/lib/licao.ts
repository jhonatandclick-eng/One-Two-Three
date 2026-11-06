// Monta as lições (cerca de 10 itens, revisões vencidas primeiro) e calcula o progresso.
import { UNIDADES_INICIANTE, UNIDADES_INTERMEDIARIO, TODAS_PALAVRAS, ehPalavra, itemPorId, unidadeDoItem } from '../content';
import type { FalaDialogo, Frase, Palavra } from '../content/types';
import { hoje } from './dates';
import { palavrasNovasPorDia } from './plan';
import { CAIXA_DOMINADA, vencidos } from './srs';
import type { Estado } from './store';

export type Item =
  | { tipo: 'repetir'; id: string | null; en: string; pt: string; fala: string[]; ipa?: string; dica?: string; exemplo?: Palavra['exemplo']; novo?: boolean }
  | { tipo: 'leitura'; id: string | null; titulo?: string; en: string; pt: string; fala: string[] }
  | { tipo: 'lembrar'; id: string; en: string; pt: string; fala: string[]; ipa?: string; dica?: string }
  | { tipo: 'escolha'; id: string | null; sentido: 'en-pt' | 'pt-en'; pergunta: string; falaPergunta?: string[]; opcoes: string[]; correta: string }
  | { tipo: 'ditado'; id: string | null; en: string; pt: string; fala: string[] }
  | { tipo: 'dialogo'; titulo: string; falas: FalaDialogo[] };

export const TOTAL_ITENS = 10;

function embaralhar<T>(a: T[]): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

function falaLista(p: Palavra): string[] {
  return [p.fala];
}

export function itemRepetirPalavra(p: Palavra, novo = false): Item {
  return { tipo: 'repetir', id: p.id, en: p.en, pt: p.pt, fala: falaLista(p), ipa: p.ipa, dica: p.gancho || undefined, exemplo: p.exemplo, novo };
}

function itemLembrar(p: Palavra): Item {
  return { tipo: 'lembrar', id: p.id, en: p.en, pt: p.pt, fala: falaLista(p), ipa: p.ipa, dica: p.gancho || undefined };
}

function distratores<T>(certo: T, todos: T[], n = 3): T[] {
  return embaralhar(todos.filter((x) => x !== certo)).slice(0, n);
}

function itemEscolhaPalavra(p: Palavra, sentido: 'en-pt' | 'pt-en', base: Palavra[]): Item {
  const outros = distratores(p, base);
  if (sentido === 'en-pt') {
    return { tipo: 'escolha', id: p.id, sentido, pergunta: p.en, falaPergunta: [p.fala], correta: p.pt, opcoes: embaralhar([p.pt, ...outros.map((o) => o.pt)]) };
  }
  return { tipo: 'escolha', id: p.id, sentido, pergunta: p.pt, correta: p.en, opcoes: embaralhar([p.en, ...outros.map((o) => o.en)]) };
}

function itemEscolhaFrase(f: Frase, base: Frase[]): Item {
  const outros = distratores(f, base);
  return { tipo: 'escolha', id: f.id, sentido: 'pt-en', pergunta: f.pt, correta: f.en, opcoes: embaralhar([f.en, ...outros.map((o) => o.en)]) };
}

function itemDeRevisao(id: string): Item | null {
  const x = itemPorId(id);
  if (!x) return null;
  if (ehPalavra(x)) return itemLembrar(x);
  return { tipo: 'repetir', id: x.id, en: x.en, pt: x.pt, fala: x.fala };
}

export function revisoesVencidas(e: Estado): string[] {
  return vencidos(e.srs, hoje()).filter((id) => itemPorId(id));
}

function novasRestantesHoje(e: Estado): number {
  const plano = e.plano?.id ?? '3m';
  return palavrasNovasPorDia(plano) - (e.novasPorDia[hoje()] ?? 0);
}

export function licaoIniciante(unidadeId: string, e: Estado): Item[] {
  const u = UNIDADES_INICIANTE.find((x) => x.id === unidadeId)!;
  const itens: Item[] = [];
  const revisoes = revisoesVencidas(e).slice(0, 3);
  revisoes.forEach((id) => {
    const it = itemDeRevisao(id);
    if (it) itens.push(it);
  });
  const naoVistas = u.palavras.filter((p) => !e.srs[p.id]);
  // Pelo menos uma palavra nova por lição, para a unidade avançar mesmo no ritmo mais calmo.
  const qtdNovas = Math.min(naoVistas.length, Math.max(1, Math.min(4, novasRestantesHoje(e))));
  const novas = naoVistas.slice(0, qtdNovas);
  novas.forEach((p) => itens.push(itemRepetirPalavra(p, true)));

  const vistas = u.palavras.filter((p) => e.srs[p.id] && !revisoes.includes(p.id));
  const fracas = vistas.filter((p) => (e.srs[p.id]?.caixa ?? 1) < CAIXA_DOMINADA);
  const praticar = embaralhar(fracas.length ? fracas : vistas).slice(0, 3);
  praticar.forEach((p, i) => itens.push(i % 2 === 0 ? itemLembrar(p) : itemEscolhaPalavra(p, 'pt-en', u.palavras)));

  novas.forEach((p, i) => itens.push(itemEscolhaPalavra(p, i % 2 === 0 ? 'en-pt' : 'pt-en', u.palavras)));

  const frase = embaralhar(u.frases)[0];
  if (frase) itens.push({ tipo: 'leitura', id: frase.id, en: frase.en, pt: frase.pt, fala: frase.fala });

  // Completa com exemplos das palavras já vistas (ou novas) até ~10 itens.
  const extras = embaralhar([...novas, ...vistas]);
  for (const p of extras) {
    if (itens.length >= TOTAL_ITENS) break;
    itens.push({ tipo: 'repetir', id: null, en: p.exemplo.en, pt: p.exemplo.pt, fala: p.exemplo.fala });
  }
  return itens.slice(0, TOTAL_ITENS);
}

export function licaoIntermediario(unidadeId: string, e: Estado): Item[] {
  const u = UNIDADES_INTERMEDIARIO.find((x) => x.id === unidadeId)!;
  const itens: Item[] = [];
  revisoesVencidas(e).slice(0, 2).forEach((id) => {
    const it = itemDeRevisao(id);
    if (it) itens.push(it);
  });
  const frases = embaralhar(u.frases);
  frases.slice(0, 2).forEach((f) => itens.push({ tipo: 'repetir', id: f.id, en: f.en, pt: f.pt, fala: f.fala }));
  itens.push(itemEscolhaFrase(frases[2] ?? frases[0], u.frases));
  itens.push({ tipo: 'ditado', id: null, en: (frases[3] ?? frases[0]).en, pt: (frases[3] ?? frases[0]).pt, fala: (frases[3] ?? frases[0]).fala });
  itens.push({ tipo: 'leitura', id: null, titulo: u.texto.titulo, en: u.texto.en, pt: u.texto.pt, fala: u.texto.fala });
  itens.push({ tipo: 'dialogo', titulo: u.dialogo.titulo, falas: u.dialogo.falas });
  return itens;
}

/* ---------- Praticar avulso ---------- */

function palavrasVistas(e: Estado): Palavra[] {
  const v = TODAS_PALAVRAS.filter((p) => e.srs[p.id]);
  return v.length ? v : UNIDADES_INICIANTE[0].palavras;
}

export type ModoPratica = 'repetir' | 'leitura' | 'traducao' | 'revisar';

export function licaoPratica(modo: ModoPratica, e: Estado): Item[] {
  const vistas = palavrasVistas(e);
  if (modo === 'repetir') {
    return embaralhar(vistas).slice(0, TOTAL_ITENS).map((p) => itemRepetirPalavra(p));
  }
  if (modo === 'traducao') {
    return embaralhar(vistas).slice(0, TOTAL_ITENS).map((p, i) => itemEscolhaPalavra(p, i % 2 ? 'pt-en' : 'en-pt', TODAS_PALAVRAS));
  }
  if (modo === 'leitura') {
    const unidades = new Set(vistas.map((p) => unidadeDoItem(p.id)?.id));
    const frases = UNIDADES_INICIANTE.filter((u) => unidades.has(u.id)).flatMap((u) => u.frases);
    const itens: Item[] = embaralhar(frases).slice(0, 5).map((f) => ({ tipo: 'leitura', id: f.id, en: f.en, pt: f.pt, fala: f.fala }));
    if (intermediarioLiberado(e)) {
      const u = embaralhar(UNIDADES_INTERMEDIARIO)[0];
      itens.push({ tipo: 'leitura', id: null, titulo: u.texto.titulo, en: u.texto.en, pt: u.texto.pt, fala: u.texto.fala });
    }
    return itens;
  }
  return revisoesVencidas(e).slice(0, 15).map(itemDeRevisao).filter((x): x is Item => !!x);
}

/* ---------- Progresso ---------- */

/** Média das melhores notas das palavras da unidade (palavras não vistas contam 0). */
export function progressoUnidade(unidadeId: string, e: Estado): number {
  const u = UNIDADES_INICIANTE.find((x) => x.id === unidadeId);
  if (u) {
    const soma = u.palavras.reduce((s, p) => s + (e.srs[p.id]?.melhor ?? 0), 0);
    return Math.round(soma / u.palavras.length);
  }
  const ui = UNIDADES_INTERMEDIARIO.find((x) => x.id === unidadeId);
  if (!ui) return 0;
  const soma = ui.frases.reduce((s, f) => s + (e.srs[f.id]?.melhor ?? 0), 0);
  return Math.round(soma / ui.frases.length);
}

export function mediaIniciante(e: Estado): number {
  const notas = UNIDADES_INICIANTE.map((u) => progressoUnidade(u.id, e));
  return Math.round(notas.reduce((a, b) => a + b, 0) / notas.length);
}

export function intermediarioLiberado(e: Estado): boolean {
  return mediaIniciante(e) >= 80;
}

export function palavrasAprendidas(e: Estado): number {
  return TODAS_PALAVRAS.filter((p) => (e.srs[p.id]?.caixa ?? 0) >= 2).length;
}

export function palavrasDominadas(e: Estado): number {
  return Object.values(e.srs).filter((c) => c.caixa >= CAIXA_DOMINADA).length;
}

/** Próxima lição sugerida: primeira unidade com progresso abaixo de 80 no nível atual. */
export function licaoAtual(e: Estado): { nivel: 'iniciante' | 'intermediario'; id: string; nome: string; progresso: number; numero: number } {
  if (intermediarioLiberado(e)) {
    const i = UNIDADES_INTERMEDIARIO.findIndex((u) => progressoUnidade(u.id, e) < 80);
    const k = i < 0 ? 0 : i;
    const u = UNIDADES_INTERMEDIARIO[k];
    return { nivel: 'intermediario', id: u.id, nome: u.nome, progresso: progressoUnidade(u.id, e), numero: k + 1 };
  }
  const i = UNIDADES_INICIANTE.findIndex((u) => progressoUnidade(u.id, e) < 80);
  const k = i < 0 ? 0 : i;
  const u = UNIDADES_INICIANTE[k];
  return { nivel: 'iniciante', id: u.id, nome: u.nome, progresso: progressoUnidade(u.id, e), numero: k + 1 };
}
