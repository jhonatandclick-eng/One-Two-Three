import { useState } from 'react';
import { scorerLocal } from '../engines/scorer';
import { ehIphone, modoTelaDeInicio, motorPorId, prepararWhisper, sttWebSpeech, type MotorId } from '../engines/stt';
import { ttsNavegador } from '../engines/tts';
import { atualizar } from '../lib/store';
import { Icone } from '../ui/Icones';

type Fase = 'pronto' | 'ouvindo' | 'baixando' | 'ok' | 'falhou';

/** Testa o microfone: tenta o motor principal e, se falhar, cai para o reserva. */
export function TestarMicrofone({ aoTerminar }: { aoTerminar?: () => void }) {
  const [fase, setFase] = useState<Fase>('pronto');
  const [motor, setMotor] = useState<MotorId | null>(null);
  const [pct, setPct] = useState(0);
  const [ouvido, setOuvido] = useState('');
  const [aviso, setAviso] = useState('');
  const iphone = ehIphone();
  const standalone = modoTelaDeInicio();

  const tentar = async (id: MotorId): Promise<boolean> => {
    const eng = motorPorId(id);
    if (!eng.disponivel()) return false;
    try {
      if (id === 'whisper') {
        setFase('baixando');
        await prepararWhisper((p) => p.status === 'baixando' && setPct(p.pct ?? 0));
      }
      setMotor(id);
      setFase('ouvindo');
      const r = await eng.ouvir({ maxMs: 6000 });
      const av = scorerLocal.avaliar('hello', r.alternativas);
      setOuvido(r.alternativas[0]?.text ?? '');
      return r.alternativas.length > 0 && av.nota > 0;
    } catch {
      return false;
    }
  };

  const testar = async () => {
    setAviso('');
    ttsNavegador.parar();
    const primeiro: MotorId = iphone && standalone ? 'whisper' : sttWebSpeech.disponivel() ? 'webspeech' : 'whisper';
    let ok = await tentar(primeiro);
    let usado: MotorId = primeiro;
    if (!ok && primeiro === 'webspeech') {
      setAviso('O reconhecimento do navegador não funcionou. Vamos tentar o reconhecimento que roda no próprio aparelho (baixa uma vez, cerca de 40 MB). Quando aparecer "Ouvindo", diga "hello" de novo.');
      ok = await tentar('whisper');
      usado = 'whisper';
    }
    if (ok) {
      atualizar((e) => ({ ...e, motor: usado }));
      setMotor(usado);
      setFase('ok');
    } else {
      setFase('falhou');
    }
  };

  return (
    <div className="coluna" style={{ gap: 16 }}>
      <div className="cartao">
        <h3>Testar o microfone</h3>
        <p>Toque em "Testar" e diga, em inglês:</p>
        <p style={{ fontSize: 30, fontWeight: 800 }} lang="en">hello <span className="selo neutro" lang="pt-BR">rê-lôu</span></p>
        <button className="botao suave pequeno" onClick={() => ttsNavegador.falar('hello')}><Icone nome="ouvir" /> Ouvir</button>
      </div>

      {iphone && (
        <div className="cartao dica">
          <strong>No iPhone</strong>
          <p className="pequeno">1. Quando o Safari perguntar, toque em <strong>Permitir</strong> o microfone.</p>
          <p className="pequeno">2. Para o reconhecimento do navegador funcionar, ative o Ditado: <strong>Ajustes › Geral › Teclado › Ativar Ditado</strong>.</p>
          {standalone && <p className="pequeno">Você abriu pelo atalho da Tela de Início. Nesse modo usamos o reconhecimento que roda no próprio aparelho.</p>}
        </div>
      )}

      {aviso && <div className="cartao dica"><p className="pequeno">{aviso}</p></div>}

      {fase === 'baixando' && (
        <div className="cartao">
          <p>Baixando o reconhecimento de voz: {pct}%</p>
          <div className="barra"><div style={{ width: `${pct}%` }} /></div>
          <p className="pequeno secundario">Só acontece uma vez. Depois funciona até sem internet.</p>
        </div>
      )}
      {fase === 'ouvindo' && <div className="cartao destaque" role="status"><strong>Ouvindo... diga "hello"</strong>
        {motor === 'whisper' && <button className="botao pequeno" onClick={() => motorPorId('whisper').parar()}>Terminei de falar</button>}
      </div>}
      {fase === 'ok' && (
        <div className="cartao" role="status">
          <span className="selo certo"><Icone nome="check" tamanho={18} /> Funcionou!</span>
          <p>Ouvi: <strong lang="en">{ouvido}</strong></p>
          <p className="pequeno secundario">Motor escolhido: {motorPorId(motor!).nome}. Dá para trocar em Ajustes.</p>
        </div>
      )}
      {fase === 'falhou' && (
        <div className="cartao" role="status">
          <span className="selo errado">Não consegui ouvir</span>
          <p className="pequeno">Confira se o microfone foi permitido e se você está num lugar silencioso. Você pode tentar de novo agora ou depois, em Ajustes.</p>
        </div>
      )}

      <button className="botao principal cheio" onClick={testar} disabled={fase === 'ouvindo' || fase === 'baixando'}>
        <Icone nome="mic" /> {fase === 'ok' || fase === 'falhou' ? 'Testar de novo' : 'Testar'}
      </button>
      {aoTerminar && (
        <button className="botao cheio" onClick={aoTerminar}>{fase === 'ok' ? 'Continuar' : 'Pular por enquanto'}</button>
      )}
    </div>
  );
}
