/// <reference lib="webworker" />
// Roda o Whisper (só inglês) dentro do navegador, num Web Worker para não travar a tela.
// O modelo é baixado uma vez e fica guardado no cache do navegador.
import { pipeline, env } from '@huggingface/transformers';

env.allowLocalModels = false;

const MODELO = 'Xenova/whisper-tiny.en';
let transcritor: any = null;
let carregando: Promise<any> | null = null;

function carregar() {
  if (transcritor) return Promise.resolve(transcritor);
  if (carregando) return carregando;
  const arquivos = new Map<string, { carregado: number; total: number }>();
  carregando = pipeline('automatic-speech-recognition', MODELO, {
    dtype: 'q8',
    progress_callback: (p: any) => {
      if (p.status === 'progress' && p.file) {
        arquivos.set(p.file, { carregado: p.loaded ?? 0, total: p.total ?? 0 });
        let c = 0, t = 0;
        arquivos.forEach((a) => { c += a.carregado; t += a.total; });
        if (t > 0) self.postMessage({ tipo: 'progresso', pct: Math.round((c / t) * 100) });
      }
    },
  } as any)
    .then((t) => {
      transcritor = t;
      self.postMessage({ tipo: 'pronto' });
      return t;
    })
    .catch((e) => {
      carregando = null;
      self.postMessage({ tipo: 'erro-modelo', msg: String(e?.message || e) });
      throw e;
    });
  return carregando;
}

self.onmessage = async (ev: MessageEvent) => {
  const d = ev.data;
  if (d.tipo === 'carregar') {
    carregar().catch(() => {});
    return;
  }
  if (d.tipo === 'transcrever') {
    try {
      const t = await carregar();
      const out = await t(d.audio);
      const texto = Array.isArray(out) ? out.map((o: any) => o.text).join(' ') : out.text;
      // O Whisper às vezes devolve marcações como [BLANK_AUDIO]
      self.postMessage({ tipo: 'texto', id: d.id, texto: String(texto || '').replace(/\[[^\]]*\]|\([^)]*\)/g, '').trim() });
    } catch (e: any) {
      self.postMessage({ tipo: 'erro', id: d.id, msg: String(e?.message || e) });
    }
  }
};
