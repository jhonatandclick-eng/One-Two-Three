import iniciante from './iniciante.json';
import intermediario from './intermediario.json';
import type { Frase, Palavra, UnidadeIniciante, UnidadeIntermediario } from './types';

export const UNIDADES_INICIANTE = iniciante.unidades as UnidadeIniciante[];
export const UNIDADES_INTERMEDIARIO = intermediario.unidades as UnidadeIntermediario[];

export type Nivel = 'iniciante' | 'intermediario';

export const TODAS_PALAVRAS: Palavra[] = UNIDADES_INICIANTE.flatMap((u) => u.palavras);

const porId = new Map<string, Palavra | Frase>();
UNIDADES_INICIANTE.forEach((u) => {
  u.palavras.forEach((p) => porId.set(p.id, p));
  u.frases.forEach((f) => porId.set(f.id, f));
});
UNIDADES_INTERMEDIARIO.forEach((u) => u.frases.forEach((f) => porId.set(f.id, f)));

export function itemPorId(id: string): Palavra | Frase | undefined {
  return porId.get(id);
}

export function ehPalavra(x: Palavra | Frase): x is Palavra {
  return typeof (x as Palavra).fala === 'string';
}

export function unidadeDoItem(id: string): { nivel: Nivel; id: string; nome: string } | undefined {
  for (const u of UNIDADES_INICIANTE) {
    if (u.palavras.some((p) => p.id === id) || u.frases.some((f) => f.id === id)) return { nivel: 'iniciante', id: u.id, nome: u.nome };
  }
  for (const u of UNIDADES_INTERMEDIARIO) {
    if (u.frases.some((f) => f.id === id)) return { nivel: 'intermediario', id: u.id, nome: u.nome };
  }
  return undefined;
}

/** Dicionário palavra -> pronúncia, montado a partir do conteúdo escrito à mão. */
const dicionario = new Map<string, string>();
function chave(w: string) {
  return w.toLowerCase().replace(/[^a-z']/g, '');
}
function alimentar(en: string, fala: string[]) {
  en.split(/\s+/).forEach((w, i) => {
    const k = chave(w);
    if (k && fala[i] && !dicionario.has(k)) dicionario.set(k, fala[i]);
  });
}
UNIDADES_INICIANTE.forEach((u) => {
  u.palavras.forEach((p) => {
    dicionario.set(chave(p.en), p.fala);
    alimentar(p.exemplo.en, p.exemplo.fala);
  });
  u.frases.forEach((f) => alimentar(f.en, f.fala));
});
UNIDADES_INTERMEDIARIO.forEach((u) => {
  u.frases.forEach((f) => alimentar(f.en, f.fala));
  alimentar(u.texto.en, u.texto.fala);
  u.dialogo.falas.forEach((f) => alimentar(f.en, f.fala));
});

export function falaDe(palavra: string): string {
  return dicionario.get(chave(palavra)) ?? '';
}
