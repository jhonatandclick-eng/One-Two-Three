// Progresso guardado só no aparelho (localStorage), com exportar/importar.
import { useSyncExternalStore } from 'react';
import type { MotorId } from '../engines/stt';
import { hoje, somarDias } from './dates';
import type { PlanoId } from './plan';
import { registrar, type CartaoSrs } from './srs';

export type Tema = 'sistema' | 'claro' | 'escuro';

export interface Estado {
  versao: 1;
  primeiroUsoFeito: boolean;
  plano: { id: PlanoId; inicio: string } | null;
  tema: Tema;
  motor: MotorId | null;
  srs: Record<string, CartaoSrs>;
  xpPorDia: Record<string, number>;
  /** quantas lições cada unidade já teve */
  licoes: Record<string, number>;
  recordes: { maiorSequencia: number; maiorXpDia: number };
  /** palavras novas apresentadas por dia (para respeitar o ritmo do plano) */
  novasPorDia: Record<string, number>;
}

const CHAVE = 'app-ingles:v1';

export function estadoInicial(): Estado {
  return {
    versao: 1,
    primeiroUsoFeito: false,
    plano: null,
    tema: 'sistema',
    motor: null,
    srs: {},
    xpPorDia: {},
    licoes: {},
    recordes: { maiorSequencia: 0, maiorXpDia: 0 },
    novasPorDia: {},
  };
}

function carregar(): Estado {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (bruto) return { ...estadoInicial(), ...JSON.parse(bruto) };
  } catch {
    /* sem armazenamento: segue com estado vazio */
  }
  return estadoInicial();
}

let estado: Estado = typeof window !== 'undefined' ? carregar() : estadoInicial();
const ouvintes = new Set<() => void>();

function salvar() {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(estado));
  } catch {
    /* ignora */
  }
}

export function obter(): Estado {
  return estado;
}

export function atualizar(f: (e: Estado) => Estado) {
  estado = f(estado);
  salvar();
  ouvintes.forEach((o) => o());
}

export function useEstado(): Estado {
  return useSyncExternalStore(
    (cb) => {
      ouvintes.add(cb);
      return () => ouvintes.delete(cb);
    },
    () => estado,
  );
}

/* ---------- XP, sequência e recordes ---------- */

export function xpDaNota(nota: number): number {
  if (nota >= 80) return 10;
  if (nota >= 50) return 5;
  return 0;
}

export function sequencia(xpPorDia: Record<string, number>, dia = hoje()): number {
  let n = 0;
  let d = (xpPorDia[dia] ?? 0) > 0 ? dia : somarDias(dia, -1);
  while ((xpPorDia[d] ?? 0) > 0) {
    n++;
    d = somarDias(d, -1);
  }
  return n;
}

/** Registra uma tentativa de um item: atualiza repetição espaçada, XP e recordes. Devolve o XP ganho. */
export function registrarTentativa(itemId: string | null, nota: number, novo = false): number {
  const dia = hoje();
  const xp = xpDaNota(nota);
  atualizar((e) => {
    const srs = itemId ? { ...e.srs, [itemId]: registrar(e.srs[itemId], nota, dia) } : e.srs;
    const xpPorDia = { ...e.xpPorDia, [dia]: (e.xpPorDia[dia] ?? 0) + xp };
    const seq = sequencia(xpPorDia, dia);
    const novasPorDia = novo ? { ...e.novasPorDia, [dia]: (e.novasPorDia[dia] ?? 0) + 1 } : e.novasPorDia;
    return {
      ...e,
      srs,
      xpPorDia,
      novasPorDia,
      recordes: {
        maiorSequencia: Math.max(e.recordes.maiorSequencia, seq),
        maiorXpDia: Math.max(e.recordes.maiorXpDia, xpPorDia[dia]),
      },
    };
  });
  return xp;
}

export function concluirLicao(unidadeId: string) {
  atualizar((e) => ({ ...e, licoes: { ...e.licoes, [unidadeId]: (e.licoes[unidadeId] ?? 0) + 1 } }));
}

/* ---------- Backup ---------- */

export function exportarJson(): string {
  return JSON.stringify({ app: 'app-ingles', exportadoEm: new Date().toISOString(), estado }, null, 2);
}

export function importarJson(texto: string): void {
  const dados = JSON.parse(texto);
  const e = dados?.estado ?? dados;
  if (!e || e.versao !== 1 || typeof e.srs !== 'object') throw new Error('Arquivo não reconhecido');
  atualizar(() => ({ ...estadoInicial(), ...e }));
}

export function apagarTudo() {
  atualizar(() => estadoInicial());
}
