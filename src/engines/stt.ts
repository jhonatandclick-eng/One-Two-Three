// Reconhecimento de fala (ouvir a pessoa). Dois motores atrás da mesma interface.
import type { Alternativa } from './scorer';

export type MotorId = 'webspeech' | 'whisper';

export interface SttResultado {
  alternativas: Alternativa[];
}

export interface SttEngine {
  id: MotorId;
  nome: string;
  disponivel(): boolean;
  /** Começa a ouvir. A promessa termina com o que foi entendido. */
  ouvir(opcoes?: { maxMs?: number; continuo?: boolean }): Promise<SttResultado>;
  /** Pede para terminar de ouvir agora (o resultado chega pela promessa de ouvir). */
  parar(): void;
}

export function modoTelaDeInicio(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true || window.matchMedia?.('(display-mode: standalone)').matches;
}

export function ehIphone(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/* ---------------- Motor principal: Web Speech API ---------------- */

type Rec = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: any) => void) | null;
  onerror: ((e: any) => void) | null;
  onend: (() => void) | null;
};

function construtorRec(): (new () => Rec) | null {
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

let recAtual: Rec | null = null;
let permissaoOk = false;

/**
 * Na primeira vez, o navegador pergunta se pode usar o microfone. Se o reconhecimento já estiver
 * contando o tempo nessa hora, ele acaba antes de a pessoa falar. Por isso pedimos a permissão
 * antes, esperamos a resposta e só depois começamos a ouvir.
 */
async function garantirPermissao(): Promise<void> {
  if (permissaoOk || !navigator.mediaDevices?.getUserMedia) return;
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  stream.getTracks().forEach((t) => t.stop());
  permissaoOk = true;
  // Dá um respiro para o sistema liberar o microfone antes do reconhecimento pegar.
  await new Promise((r) => setTimeout(r, 250));
}

export const sttWebSpeech: SttEngine = {
  id: 'webspeech',
  nome: 'Reconhecimento do navegador',
  disponivel: () => typeof window !== 'undefined' && !!construtorRec(),
  async ouvir(opcoes) {
    try {
      await garantirPermissao();
    } catch (e: any) {
      throw new Error(e?.name === 'NotAllowedError' ? 'not-allowed' : String(e?.message || e));
    }
    if (recAtual) { try { recAtual.abort(); } catch { /* já tinha parado */ } recAtual = null; }
    return new Promise((resolve, reject) => {
      const C = construtorRec();
      if (!C) return reject(new Error('indisponivel'));
      const rec = new C() as Rec & { onstart: (() => void) | null };
      recAtual = rec;
      rec.lang = 'en-US';
      rec.interimResults = false;
      rec.maxAlternatives = 5;
      rec.continuous = !!opcoes?.continuo;
      let alternativas: Alternativa[] = [];
      let erro: string | null = null;
      // O tempo só começa a contar quando o reconhecimento realmente começou a ouvir.
      let timer = 0;
      const limite = () => { timer = window.setTimeout(() => rec.stop(), opcoes?.maxMs ?? 12000); };
      rec.onstart = limite;
      const reserva = window.setTimeout(() => { if (!timer) limite(); }, 3000);
      rec.onresult = (e: any) => {
        if (e.results.length > 1) {
          // Leitura longa: junta os trechos, usando a melhor opção de cada um.
          const partes: string[] = [];
          for (let i = 0; i < e.results.length; i++) partes.push(e.results[i][0].transcript);
          alternativas = [{ text: partes.join(' ') }];
          return;
        }
        const res = e.results[0];
        const lista: Alternativa[] = [];
        for (let i = 0; i < res.length; i++) {
          lista.push({ text: res[i].transcript, confidence: res[i].confidence || undefined });
        }
        alternativas = lista;
      };
      rec.onerror = (e: any) => {
        erro = e.error || 'erro';
      };
      rec.onend = () => {
        window.clearTimeout(timer);
        window.clearTimeout(reserva);
        recAtual = null;
        if (erro && erro !== 'no-speech' && erro !== 'aborted') reject(new Error(erro));
        else resolve({ alternativas });
      };
      try {
        rec.start();
      } catch (err) {
        window.clearTimeout(timer);
        window.clearTimeout(reserva);
        recAtual = null;
        reject(err);
      }
    });
  },
  parar() {
    recAtual?.stop();
  },
};

/* ---------------- Motor reserva: Whisper no próprio aparelho ---------------- */

export type ProgressoModelo = { status: 'baixando' | 'pronto' | 'erro'; pct?: number; msg?: string };

let worker: Worker | null = null;
let modeloPronto = false;
let pedidoId = 0;
const pendentes = new Map<number, { resolve: (t: string) => void; reject: (e: Error) => void }>();
const ouvintesProgresso = new Set<(p: ProgressoModelo) => void>();

function obterWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL('./whisper.worker.ts', import.meta.url), { type: 'module' });
  worker.onmessage = (ev: MessageEvent) => {
    const d = ev.data;
    if (d.tipo === 'progresso') ouvintesProgresso.forEach((f) => f({ status: 'baixando', pct: d.pct }));
    if (d.tipo === 'pronto') {
      modeloPronto = true;
      ouvintesProgresso.forEach((f) => f({ status: 'pronto', pct: 100 }));
    }
    if (d.tipo === 'erro-modelo') ouvintesProgresso.forEach((f) => f({ status: 'erro', msg: d.msg }));
    if (d.tipo === 'texto' || d.tipo === 'erro') {
      const p = pendentes.get(d.id);
      if (!p) return;
      pendentes.delete(d.id);
      if (d.tipo === 'texto') p.resolve(d.texto);
      else p.reject(new Error(d.msg));
    }
  };
  return worker;
}

export function prepararWhisper(onProgresso?: (p: ProgressoModelo) => void): Promise<void> {
  if (onProgresso) ouvintesProgresso.add(onProgresso);
  if (modeloPronto) {
    onProgresso?.({ status: 'pronto', pct: 100 });
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const f = (p: ProgressoModelo) => {
      if (p.status === 'pronto') { ouvintesProgresso.delete(f); resolve(); }
      if (p.status === 'erro') { ouvintesProgresso.delete(f); reject(new Error(p.msg)); }
    };
    ouvintesProgresso.add(f);
    obterWorker().postMessage({ tipo: 'carregar' });
  });
}

export function whisperPronto(): boolean {
  return modeloPronto;
}

export async function paraAudio16k(blob: Blob): Promise<Float32Array> {
  const buf = await blob.arrayBuffer();
  const Ctx = window.AudioContext || (window as any).webkitAudioContext;
  const ctx = new Ctx();
  const audio = await new Promise<AudioBuffer>((res, rej) => ctx.decodeAudioData(buf, res, rej));
  ctx.close?.();
  const alvo = 16000;
  const offline = new OfflineAudioContext(1, Math.ceil(audio.duration * alvo), alvo);
  const src = offline.createBufferSource();
  src.buffer = audio;
  src.connect(offline.destination);
  src.start();
  const out = await offline.startRendering();
  return out.getChannelData(0);
}

let gravador: MediaRecorder | null = null;

export const sttWhisper: SttEngine = {
  id: 'whisper',
  nome: 'Whisper no aparelho',
  disponivel: () =>
    typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined',
  async ouvir(opcoes) {
    await prepararWhisper();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const pedacos: Blob[] = [];
    const tipo = ['audio/webm', 'audio/mp4', 'audio/ogg'].find((t) => MediaRecorder.isTypeSupported?.(t));
    const rec = new MediaRecorder(stream, tipo ? { mimeType: tipo } : undefined);
    gravador = rec;
    const fim = new Promise<Blob>((resolve) => {
      rec.ondataavailable = (e) => e.data.size && pedacos.push(e.data);
      rec.onstop = () => resolve(new Blob(pedacos, { type: rec.mimeType }));
    });
    rec.start();
    const timer = window.setTimeout(() => rec.state !== 'inactive' && rec.stop(), opcoes?.maxMs ?? 8000);
    const blob = await fim;
    window.clearTimeout(timer);
    stream.getTracks().forEach((t) => t.stop());
    gravador = null;
    const audio = await paraAudio16k(blob);
    const id = ++pedidoId;
    const texto = await new Promise<string>((resolve, reject) => {
      pendentes.set(id, { resolve, reject });
      obterWorker().postMessage({ tipo: 'transcrever', id, audio }, [audio.buffer]);
    });
    return { alternativas: texto.trim() ? [{ text: texto.trim() }] : [] };
  },
  parar() {
    if (gravador && gravador.state !== 'inactive') gravador.stop();
  },
};

export function motorPorId(id: MotorId): SttEngine {
  return id === 'whisper' ? sttWhisper : sttWebSpeech;
}

/** Motor sugerido quando a pessoa ainda não testou o microfone. */
export function motorSugerido(): MotorId {
  if (ehIphone() && modoTelaDeInicio()) return 'whisper';
  return sttWebSpeech.disponivel() ? 'webspeech' : 'whisper';
}
