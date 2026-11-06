import { useCallback, useEffect, useRef, useState } from 'react';
import { scorerLocal, type Avaliacao } from '../engines/scorer';
import { motorPorId, motorSugerido, prepararWhisper, whisperPronto, type ProgressoModelo } from '../engines/stt';
import { ttsNavegador } from '../engines/tts';
import { useEstado } from '../lib/store';

export type EstadoMic = 'parado' | 'preparando' | 'ouvindo' | 'processando';

/** Liga o microfone, ouve a pessoa e devolve a avaliação da pronúncia. */
export function useMicrofone() {
  const { motor } = useEstado();
  const id = motor ?? motorSugerido();
  const [estado, setEstado] = useState<EstadoMic>('parado');
  const [erro, setErro] = useState<string | null>(null);
  const [baixando, setBaixando] = useState<number | null>(null);
  const ativo = useRef(true);
  useEffect(() => () => { ativo.current = false; motorPorId(id).parar(); }, [id]);

  const ouvir = useCallback(async (esperado: string, opcoes?: { longo?: boolean }): Promise<Avaliacao | null> => {
    setErro(null);
    ttsNavegador.parar();
    const engine = motorPorId(id);
    if (!engine.disponivel()) {
      setErro('Este navegador não consegue usar o microfone. Tente o Safari (iPhone) ou o Chrome (Android).');
      return null;
    }
    try {
      if (id === 'whisper' && !whisperPronto()) {
        setEstado('preparando');
        await prepararWhisper((p: ProgressoModelo) => p.status === 'baixando' && setBaixando(p.pct ?? 0));
        setBaixando(null);
      }
      setEstado('ouvindo');
      const longo = !!opcoes?.longo;
      const ouvido = engine.ouvir({ maxMs: longo ? 60000 : 8000, continuo: longo });
      // Para o Whisper, "processando" começa quando a gravação termina; mostramos "ouvindo" até lá.
      const r = await ouvido;
      if (!ativo.current) return null;
      setEstado('processando');
      const av = scorerLocal.avaliar(esperado, r.alternativas);
      setEstado('parado');
      return av;
    } catch (e: any) {
      setEstado('parado');
      setBaixando(null);
      const msg = String(e?.message || e);
      if (/not-allowed|Permission|NotAllowed/i.test(msg)) {
        setErro('O microfone não foi liberado. Permita o acesso ao microfone nas configurações do navegador e tente de novo.');
      } else if (/service-not-allowed|network/i.test(msg)) {
        setErro('O reconhecimento do navegador não respondeu. No iPhone, ative o Ditado (Ajustes › Geral › Teclado) ou troque o motor de voz em Ajustes.');
      } else {
        setErro('Não deu para ouvir agora. Tente de novo ou troque o motor de voz em Ajustes.');
      }
      return null;
    }
  }, [id]);

  const parar = useCallback(() => motorPorId(id).parar(), [id]);

  return { estado, erro, baixando, ouvir, parar, motor: id };
}
