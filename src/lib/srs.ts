// Repetição espaçada (sistema Leitner): caixas 1 a 5, intervalos de 1, 3, 7, 14 e 30 dias.
import { somarDias } from './dates';

export const INTERVALOS = [1, 3, 7, 14, 30];
export const NOTA_ACERTO = 80;
export const CAIXA_DOMINADA = 4;

export interface CartaoSrs {
  caixa: number; // 1..5
  vence: string; // AAAA-MM-DD
  ultima: number; // última nota
  melhor: number; // melhor nota
  vezes: number;
}

export function novoCartao(dia: string): CartaoSrs {
  return { caixa: 1, vence: dia, ultima: 0, melhor: 0, vezes: 0 };
}

/** Atualiza o cartão depois de uma tentativa. */
export function registrar(c: CartaoSrs | undefined, nota: number, dia: string): CartaoSrs {
  const atual = c ?? novoCartao(dia);
  const acertou = nota >= NOTA_ACERTO;
  const caixa = acertou ? Math.min(5, atual.caixa + 1) : 1;
  const intervalo = acertou ? INTERVALOS[caixa - 1] : 1;
  return {
    caixa,
    vence: somarDias(dia, intervalo),
    ultima: nota,
    melhor: Math.max(atual.melhor, nota),
    vezes: atual.vezes + 1,
  };
}

export function estaVencido(c: CartaoSrs, dia: string): boolean {
  return c.vence <= dia;
}

/** IDs vencidos, os mais atrasados e de caixa mais baixa primeiro. */
export function vencidos(cartoes: Record<string, CartaoSrs>, dia: string): string[] {
  return Object.entries(cartoes)
    .filter(([, c]) => estaVencido(c, dia))
    .sort((a, b) => (a[1].vence === b[1].vence ? a[1].caixa - b[1].caixa : a[1].vence < b[1].vence ? -1 : 1))
    .map(([id]) => id);
}

export function porCaixa(cartoes: Record<string, CartaoSrs>): number[] {
  const r = [0, 0, 0, 0, 0];
  Object.values(cartoes).forEach((c) => r[c.caixa - 1]++);
  return r;
}
