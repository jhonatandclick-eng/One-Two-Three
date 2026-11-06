// Voz do app (texto -> fala). Interface trocável.

export interface TtsEngine {
  disponivel(): boolean;
  falar(texto: string, opcoes?: { devagar?: boolean }): Promise<void>;
  parar(): void;
}

let vozEscolhida: SpeechSynthesisVoice | null = null;

function pontuarVoz(v: SpeechSynthesisVoice): number {
  let p = 0;
  if (v.lang === 'en-US' || v.lang === 'en_US') p += 10;
  else if (v.lang.startsWith('en')) p += 3;
  if (/enhanced|premium|natural|neural/i.test(v.name)) p += 6;
  if (/google us english|samantha|ava|allison|aria|jenny|guy/i.test(v.name)) p += 3;
  if (v.localService) p += 1;
  return p;
}

function escolherVoz(): SpeechSynthesisVoice | null {
  if (!('speechSynthesis' in window)) return null;
  const vozes = window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('en'));
  if (!vozes.length) return null;
  return [...vozes].sort((a, b) => pontuarVoz(b) - pontuarVoz(a))[0];
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  vozEscolhida = escolherVoz();
  window.speechSynthesis.addEventListener?.('voiceschanged', () => {
    vozEscolhida = escolherVoz();
  });
}

export const ttsNavegador: TtsEngine = {
  disponivel: () => typeof window !== 'undefined' && 'speechSynthesis' in window,
  falar(texto, opcoes) {
    return new Promise((resolve) => {
      if (!this.disponivel()) return resolve();
      const s = window.speechSynthesis;
      s.cancel();
      const u = new SpeechSynthesisUtterance(texto);
      u.lang = 'en-US';
      if (!vozEscolhida) vozEscolhida = escolherVoz();
      if (vozEscolhida) u.voice = vozEscolhida;
      u.rate = opcoes?.devagar ? 0.6 : 0.95;
      u.onend = () => resolve();
      u.onerror = () => resolve();
      s.speak(u);
    });
  },
  parar() {
    if (this.disponivel()) window.speechSynthesis.cancel();
  },
};

export function nomeDaVoz(): string {
  return vozEscolhida ? vozEscolhida.name : 'voz padrão do aparelho';
}
