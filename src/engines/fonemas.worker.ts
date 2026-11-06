// Web Worker: modelo de fonemas no próprio aparelho (baixa uma vez e fica guardado).
import { AutoFeatureExtractor, AutoModelForCTC, env } from '@huggingface/transformers';
import { avaliarSons, ipaParaFones } from '../lib/fonemas';

const MODELO_FONEMAS = 'onnx-community/wav2vec2-lv-60-espeak-cv-ft-ONNX';

env.allowLocalModels = false;

let pronto: Promise<{ extractor: any; model: any; vocab: Record<string, number> }> | null = null;

async function lerVocab(): Promise<Record<string, number>> {
  const url = `https://huggingface.co/${MODELO_FONEMAS}/resolve/main/vocab.json`;
  try {
    const cache = await caches.open('fonemas-vocab');
    const salvo = await cache.match(url);
    if (salvo) return salvo.json();
    const r = await fetch(url);
    await cache.put(url, r.clone());
    return r.json();
  } catch {
    return (await fetch(url)).json();
  }
}

function carregar() {
  if (pronto) return pronto;
  const arquivos = new Map<string, { carregado: number; total: number }>();
  const progresso = (p: any) => {
    if (p.status !== 'progress' || !p.total) return;
    arquivos.set(p.file, { carregado: p.loaded, total: p.total });
    let c = 0, t = 0;
    arquivos.forEach((a) => { c += a.carregado; t += a.total; });
    (self as any).postMessage({ tipo: 'progresso', pct: Math.min(99, Math.round((c / t) * 100)) });
  };
  pronto = (async () => {
    const [extractor, vocab] = await Promise.all([AutoFeatureExtractor.from_pretrained(MODELO_FONEMAS), lerVocab()]);
    // Placa de vídeo (WebGPU) quando o aparelho tem: bem mais rápido. Senão, processador (WASM).
    let model: any = null;
    if ((self.navigator as any).gpu) {
      try {
        const adaptador = await (self.navigator as any).gpu.requestAdapter();
        if (adaptador) {
          model = await AutoModelForCTC.from_pretrained(MODELO_FONEMAS, { dtype: 'q4', device: 'webgpu', progress_callback: progresso } as any);
          // aquece e confere se funciona de verdade
          await model(await extractor(new Float32Array(16000)));
        }
      } catch {
        model = null;
      }
    }
    if (!model) model = await AutoModelForCTC.from_pretrained(MODELO_FONEMAS, { dtype: 'q4', device: 'wasm', progress_callback: progresso } as any);
    return { extractor, model, vocab };
  })();
  pronto.catch(() => { pronto = null; });
  return pronto;
}

self.onmessage = async (ev: MessageEvent) => {
  const d = ev.data;
  if (d.tipo === 'carregar') {
    try {
      await carregar();
      (self as any).postMessage({ tipo: 'pronto' });
    } catch (e: any) {
      (self as any).postMessage({ tipo: 'erro-modelo', msg: String(e?.message || e) });
    }
  }
  if (d.tipo === 'avaliar') {
    try {
      const { extractor, model, vocab } = await carregar();
      const fones = ipaParaFones(d.ipa, (t) => t in vocab);
      const { logits } = await model(await extractor(d.audio));
      const [, T, V] = logits.dims;
      const resultado = avaliarSons(logits.data, T, V, fones, vocab);
      (self as any).postMessage({ tipo: 'resultado', id: d.id, resultado });
    } catch (e: any) {
      (self as any).postMessage({ tipo: 'erro', id: d.id, msg: String(e?.message || e) });
    }
  }
};
