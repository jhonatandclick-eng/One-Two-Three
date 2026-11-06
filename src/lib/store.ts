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
  /** a pessoa fechou o aviso "copie seu progresso antes de usar pelo atalho" */
  dicaAtalhoOculta?: boolean;
}

/* ---------- Perfis (várias pessoas no mesmo aparelho, sem login) ---------- */

export interface Perfil { id: string; nome: string }
interface Perfis { atual: string; lista: Perfil[] }

const CHAVE_PERFIS = 'app-ingles:perfis';
// O primeiro perfil usa a chave antiga, para não perder o progresso de quem já usava o app.
const chaveDoPerfil = (id: string) => (id === 'principal' ? 'app-ingles:v1' : `app-ingles:v1:${id}`);

function carregarPerfis(): Perfis {
  try {
    const bruto = localStorage.getItem(CHAVE_PERFIS);
    if (bruto) {
      const p = JSON.parse(bruto) as Perfis;
      if (p.lista?.length && p.lista.some((x) => x.id === p.atual)) return p;
    }
  } catch { /* segue com o padrão */ }
  return { atual: 'principal', lista: [{ id: 'principal', nome: '' }] };
}

let perfis: Perfis = typeof window !== 'undefined' ? carregarPerfis() : { atual: 'principal', lista: [{ id: 'principal', nome: '' }] };

function salvarPerfis() {
  try { localStorage.setItem(CHAVE_PERFIS, JSON.stringify(perfis)); } catch { /* ignora */ }
}

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
    const bruto = localStorage.getItem(chaveDoPerfil(perfis.atual));
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
    localStorage.setItem(chaveDoPerfil(perfis.atual), JSON.stringify(estado));
  } catch {
    /* ignora */
  }
}

function avisar() {
  estado = { ...estado }; // nova referência: faz as telas atualizarem também em mudanças só de perfil
  ouvintes.forEach((o) => o());
}

export function obterPerfis(): Perfis {
  return perfis;
}

export function perfilAtual(): Perfil {
  return perfis.lista.find((p) => p.id === perfis.atual)!;
}

export function usePerfis(): Perfis {
  useEstado(); // re-renderiza junto com as trocas de perfil
  return perfis;
}

export function trocarPerfil(id: string) {
  if (!perfis.lista.some((p) => p.id === id)) return;
  perfis = { ...perfis, atual: id };
  salvarPerfis();
  estado = carregar();
  avisar();
}

/** Cria um perfil novo (começa do zero) e já entra nele. */
export function criarPerfil(nome: string): void {
  const id = `p${Date.now().toString(36)}`;
  perfis = { atual: id, lista: [...perfis.lista, { id, nome: nome.trim() }] };
  salvarPerfis();
  estado = estadoInicial();
  salvar();
  avisar();
}

export function renomearPerfil(id: string, nome: string) {
  perfis = { ...perfis, lista: perfis.lista.map((p) => (p.id === id ? { ...p, nome: nome.trim() } : p)) };
  salvarPerfis();
  avisar();
}

/** Apaga outro perfil (não o que está em uso) e o progresso dele. */
export function apagarPerfil(id: string) {
  if (id === perfis.atual || perfis.lista.length < 2) return;
  try { localStorage.removeItem(chaveDoPerfil(id)); } catch { /* ignora */ }
  perfis = { ...perfis, lista: perfis.lista.filter((p) => p.id !== id) };
  salvarPerfis();
  avisar();
}

export function obter(): Estado {
  return estado;
}

export function atualizar(f: (e: Estado) => Estado) {
  estado = f(estado);
  salvar();
  avisar();
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
  // O motor de voz depende do aparelho (Safari x atalho), então é escolhido de novo aqui.
  atualizar(() => ({ ...estadoInicial(), ...e, motor: null }));
}

/* ---------- Código de transferência (Safari → atalho da Tela de Início, ou outro aparelho) ---------- */

const PREFIXO_Z = 'OTT1-'; // comprimido
const PREFIXO_T = 'OTT0-'; // sem compressão (navegadores antigos)

function paraBase64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function deBase64(b64: string): Uint8Array {
  const s = atob(b64.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}

async function passarPor(bytes: Uint8Array, stream: TransformStream<Uint8Array, Uint8Array>): Promise<Uint8Array> {
  const buf = await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer();
  return new Uint8Array(buf);
}

/** Gera um texto curto com todo o progresso deste perfil, para copiar e colar. */
export async function gerarCodigo(): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(estado));
  if (typeof CompressionStream !== 'undefined') {
    try {
      return PREFIXO_Z + paraBase64(await passarPor(bytes, new CompressionStream('deflate-raw') as any));
    } catch { /* cai para o formato simples */ }
  }
  return PREFIXO_T + paraBase64(bytes);
}

/** Lê um código de transferência e substitui o progresso do perfil atual. */
export async function aplicarCodigo(codigo: string): Promise<void> {
  const limpo = codigo.replace(/\s+/g, '');
  const ini = limpo.search(/OTT[01]-/);
  if (ini < 0) throw new Error('Código não reconhecido');
  const c = limpo.slice(ini);
  let bytes = deBase64(c.slice(5));
  if (c.startsWith(PREFIXO_Z)) bytes = await passarPor(bytes, new DecompressionStream('deflate-raw') as any);
  importarJson(new TextDecoder().decode(bytes));
}

export function temProgresso(e: Estado = estado): boolean {
  return Object.keys(e.srs).length > 0 || Object.keys(e.xpPorDia).length > 0;
}

export function apagarTudo() {
  atualizar(() => estadoInicial());
}
