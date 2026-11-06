import { useCallback, useEffect, useRef, useState } from 'react';
import { mensagemDaNota, scorerLocal, type Avaliacao, type StatusPalavra } from '../engines/scorer';
import { avaliarSonsAudio, gravarFala, pararGravacao, prepararSons, sonsPronto } from '../engines/sons';
import { motorPorId, motorSugerido, prepararWhisper, whisperPronto, type ProgressoModelo } from '../engines/stt';
import { ttsNavegador } from '../engines/tts';
import { palavrasDaTela } from '../lib/normalize';
import { useEstado } from '../lib/store';

export type EstadoMic = 'parado' | 'preparando' | 'ouvindo' | 'processando';

/** Liga o microfone, ouve a pessoa e devolve a avaliação da pronúncia. */
export function useMicrofone() {
  const { motor, sons } = useEstado();
  const id = motor ?? motorSugerido();
  const [estado, setEstado] = useState<EstadoMic>('parado');
  const [erro, setErro] = useState<string | null>(null);
  const [baixando, setBaixando] = useState<number | null>(null);
  const modoSons = useRef(false);
  const ativo = useRef(true);
  useEffect(() => {
    ativo.current = true;
    return () => { ativo.current = false; motorPorId(id).parar(); pararGravacao(); };
  }, [id]);

  const tratarErro = (e: any) => {
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
  };

  /** Modo som por som: grava a palavra e mede cada som com o modelo de fonemas. */
  const ouvirSons = async (esperado: string, ipa: string): Promise<Avaliacao | null> => {
    modoSons.current = true;
    try {
      if (!sonsPronto()) {
        setEstado('preparando');
        try {
          await prepararSons((p) => p.status === 'baixando' && setBaixando(p.pct ?? 0));
        } catch {
          setEstado('parado');
          setBaixando(null);
          setErro('A avaliação som por som não abriu neste aparelho (falta de internet ou de memória). Tente de novo ou desligue em Ajustes.');
          return null;
        }
        setBaixando(null);
      }
      setEstado('ouvindo');
      const audio = await gravarFala(5000);
      if (!ativo.current) return null;
      setEstado('processando');
      const r = await avaliarSonsAudio(audio, ipa);
      setEstado('parado');
      const tela = palavrasDaTela(esperado);
      const status: StatusPalavra = r.vazio ? 'errada' : r.nota >= 80 ? 'certa' : r.nota >= 45 ? 'quase' : 'errada';
      return {
        nota: r.nota,
        mensagem: r.vazio ? 'Não ouvi nada. Vamos tentar de novo' : mensagemDaNota(r.nota),
        palavras: tela.map((t) => ({ tela: t, status })),
        ouvido: r.vazio ? '' : esperado,
        ouvidas: [],
        sons: r,
      };
    } catch (e) {
      tratarErro(e);
      return null;
    } finally {
      modoSons.current = false;
    }
  };

  const ouvir = useCallback(async (esperado: string, opcoes?: { longo?: boolean; ipa?: string }): Promise<Avaliacao | null> => {
    setErro(null);
    ttsNavegador.parar();
    // Palavras com símbolos fonéticos usam a avaliação som por som, se a pessoa ligou.
    if (sons && opcoes?.ipa && !opcoes.longo && typeof MediaRecorder !== 'undefined') {
      return ouvirSons(esperado, opcoes.ipa);
    }
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
      const r = await engine.ouvir({ maxMs: longo ? 60000 : 8000, continuo: longo });
      if (!ativo.current) return null;
      setEstado('processando');
      const av = scorerLocal.avaliar(esperado, r.alternativas);
      setEstado('parado');
      return av;
    } catch (e: any) {
      tratarErro(e);
      return null;
    }
  }, [id, sons]); // eslint-disable-line react-hooks/exhaustive-deps

  const parar = useCallback(() => {
    if (modoSons.current) pararGravacao();
    else motorPorId(id).parar();
  }, [id]);

  return { estado, erro, baixando, ouvir, parar, motor: id };
}
