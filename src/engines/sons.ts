// Avaliação som por som: grava a palavra e manda para o modelo de fonemas (no Web Worker).
import type { ResultadoSons } from '../lib/fonemas';
import { paraAudio16k } from './stt';

export type ProgressoSons = { status: 'baixando' | 'pronto' | 'erro'; pct?: number; msg?: string };

let worker: Worker | null = null;
let modeloPronto = false;
let pedido = 0;
const pendentes = new Map<number, { resolve: (r: ResultadoSons) => void; reject: (e: Error) => void }>();
const ouvintes = new Set<(p: ProgressoSons) => void>();

function obterWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL('./fonemas.worker.ts', import.meta.url), { type: 'module' });
  worker.onmessage = (ev: MessageEvent) => {
    const d = ev.data;
    if (d.tipo === 'progresso') ouvintes.forEach((f) => f({ status: 'baixando', pct: d.pct }));
    if (d.tipo === 'pronto') { modeloPronto = true; ouvintes.forEach((f) => f({ status: 'pronto', pct: 100 })); }
    if (d.tipo === 'erro-modelo') ouvintes.forEach((f) => f({ status: 'erro', msg: d.msg }));
    if (d.tipo === 'resultado' || d.tipo === 'erro') {
      const p = pendentes.get(d.id);
      if (!p) return;
      pendentes.delete(d.id);
      if (d.tipo === 'resultado') p.resolve(d.resultado);
      else p.reject(new Error(d.msg));
    }
  };
  return worker;
}

export function sonsPronto(): boolean {
  return modeloPronto;
}

/** Baixa (uma vez) e carrega o modelo de fonemas. */
export function prepararSons(onProgresso?: (p: ProgressoSons) => void): Promise<void> {
  if (modeloPronto) { onProgresso?.({ status: 'pronto', pct: 100 }); return Promise.resolve(); }
  return new Promise((resolve, reject) => {
    const f = (p: ProgressoSons) => {
      onProgresso?.(p);
      if (p.status === 'pronto') { ouvintes.delete(f); resolve(); }
      if (p.status === 'erro') { ouvintes.delete(f); reject(new Error(p.msg)); }
    };
    ouvintes.add(f);
    obterWorker().postMessage({ tipo: 'carregar' });
  });
}

/* ---------- Gravação com detecção de fim de fala ---------- */

let pararAgora: (() => void) | null = null;

export function pararGravacao() {
  pararAgora?.();
}

/**
 * Grava até a pessoa terminar de falar (ou até `maxMs`), e devolve o áudio em 16 kHz.
 * Para sozinho cerca de 0,7 s depois que a fala acaba.
 */
export async function gravarFala(maxMs = 5000): Promise<Float32Array> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  });
  const tipo = ['audio/webm', 'audio/mp4', 'audio/ogg'].find((t) => (window as any).MediaRecorder?.isTypeSupported?.(t));
  const rec = new MediaRecorder(stream, tipo ? { mimeType: tipo } : undefined);
  const pedacos: Blob[] = [];
  const Ctx = window.AudioContext || (window as any).webkitAudioContext;
  const ctx: AudioContext = new Ctx();
  const fonte = ctx.createMediaStreamSource(stream);
  const analisador = ctx.createAnalyser();
  analisador.fftSize = 1024;
  fonte.connect(analisador);
  const buf = new Float32Array(analisador.fftSize);

  const fim = new Promise<Blob>((resolve) => {
    rec.ondataavailable = (e) => { if (e.data.size) pedacos.push(e.data); };
    rec.onstop = () => resolve(new Blob(pedacos, { type: rec.mimeType }));
  });
  rec.start();

  const inicio = Date.now();
  let ruido = 0, amostras = 0, falou = false, ultimoSom = 0;
  const parar = () => { if (rec.state !== 'inactive') rec.stop(); };
  pararAgora = parar;
  const timer = window.setInterval(() => {
    analisador.getFloatTimeDomainData(buf);
    let s = 0;
    for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
    const rms = Math.sqrt(s / buf.length);
    const agora = Date.now() - inicio;
    if (agora < 250) { ruido += rms; amostras++; return; } // mede o ruído do ambiente
    const limiar = Math.max(0.012, (ruido / Math.max(1, amostras)) * 3);
    if (rms > limiar) { falou = true; ultimoSom = agora; }
    if ((falou && agora - ultimoSom > 700) || (!falou && agora > 4000) || agora > maxMs) parar();
  }, 50);

  const blob = await fim;
  window.clearInterval(timer);
  pararAgora = null;
  stream.getTracks().forEach((t) => t.stop());
  ctx.close?.();
  return paraAudio16k(blob);
}

/** Corta o silêncio do começo e do fim (deixa 0,2 s de folga): menos áudio, análise mais rápida. */
export function apararSilencio(audio: Float32Array, taxa = 16000): Float32Array {
  const janela = Math.round(taxa * 0.02);
  const energias: number[] = [];
  for (let i = 0; i + janela <= audio.length; i += janela) {
    let s = 0;
    for (let j = i; j < i + janela; j++) s += audio[j] * audio[j];
    energias.push(Math.sqrt(s / janela));
  }
  if (!energias.length) return audio;
  const max = Math.max(...energias);
  const limiar = Math.max(0.008, max * 0.08);
  const ini = energias.findIndex((e) => e > limiar);
  let fim = energias.length - 1;
  while (fim > 0 && energias[fim] <= limiar) fim--;
  if (ini < 0) return audio;
  const folga = Math.round(0.2 * taxa);
  return audio.slice(Math.max(0, ini * janela - folga), Math.min(audio.length, (fim + 1) * janela + folga));
}

/** Avalia os sons de uma palavra a partir do áudio gravado. */
export async function avaliarSonsAudio(bruto: Float32Array, ipa: string): Promise<ResultadoSons> {
  await prepararSons();
  const audio = apararSilencio(bruto);
  const id = ++pedido;
  return new Promise((resolve, reject) => {
    pendentes.set(id, { resolve, reject });
    obterWorker().postMessage({ tipo: 'avaliar', id, audio, ipa }, [audio.buffer]);
  });
}
