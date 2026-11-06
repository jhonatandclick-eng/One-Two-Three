import { useEffect, useRef, useState } from 'react';
import type { Avaliacao } from '../engines/scorer';
import { corrigirDitado } from '../engines/scorer';
import { ttsNavegador } from '../engines/tts';
import type { Item } from '../lib/licao';
import { Icone } from '../ui/Icones';
import { Pronuncia, VoceDisse } from '../ui/Pronuncia';
import { useMicrofone } from '../ui/useMicrofone';

export type AoAvaliar = (nota: number) => void;

export function BotoesOuvir({ texto }: { texto: string }) {
  return (
    <div className="linha">
      <button className="botao suave pequeno" onClick={() => ttsNavegador.falar(texto)}>
        <Icone nome="ouvir" /> Ouvir
      </button>
      <button className="botao suave pequeno" onClick={() => ttsNavegador.falar(texto, { devagar: true })}>
        <Icone nome="devagar" /> Devagar
      </button>
    </div>
  );
}

function classeNota(n: number) {
  return n >= 90 ? 'boa' : n >= 70 ? 'media' : 'ruim';
}

export function CartaoResultado({ av, en, fala, dica, longo }: { av: Avaliacao; en: string; fala: string[]; dica?: string; longo?: boolean }) {
  const temErro = av.palavras.some((p) => p.status !== 'certa');
  return (
    <div className="cartao" role="status" aria-live="polite">
      <div className="linha">
        <div className={`nota ${classeNota(av.nota)}`} aria-label={`Nota ${av.nota} de 100`}>{av.nota}</div>
        <div className="coluna" style={{ gap: 2 }}>
          <h3>{av.mensagem}</h3>
          <p className="pequeno secundario">A nota mostra se as palavras foram entendidas, não o sotaque fino.</p>
        </div>
      </div>
      {temErro && <Pronuncia en={en} fala={fala} resultado={av.palavras} longo={longo} />}
      <VoceDisse ouvidas={av.ouvidas} />
      {(temErro || dica) && (
        <div className="cartao dica" style={{ padding: 12 }}>
          <p className="pequeno">
            <strong>Dica: </strong>
            {dica || 'Toque em "Devagar", preste atenção nas palavras marcadas e tente de novo.'}
          </p>
        </div>
      )}
    </div>
  );
}

/** Botão redondo do microfone + mensagens de estado. */
export function BotaoMic({ esperado, aoAvaliar, longo, desabilitado }: {
  esperado: string; aoAvaliar: (a: Avaliacao) => void; longo?: boolean; desabilitado?: boolean;
}) {
  const mic = useMicrofone();
  const ouvindo = mic.estado === 'ouvindo';
  const ocupado = mic.estado === 'preparando' || mic.estado === 'processando';
  const clicar = async () => {
    if (ouvindo) return mic.parar();
    const av = await mic.ouvir(esperado, { longo });
    if (av) aoAvaliar(av);
  };
  let legenda = longo ? 'Toque e leia em voz alta. Toque de novo para terminar.' : 'Toque e fale';
  if (ouvindo) legenda = mic.motor === 'whisper' || longo ? 'Ouvindo... toque para terminar' : 'Ouvindo...';
  if (mic.estado === 'preparando') legenda = mic.baixando !== null ? `Baixando o reconhecimento de voz: ${mic.baixando}%` : 'Preparando...';
  if (mic.estado === 'processando') legenda = 'Analisando...';
  return (
    <div className="linha" style={{ flex: 1 }}>
      <button className={`mic${ouvindo ? ' ouvindo' : ''}`} onClick={clicar} disabled={ocupado || desabilitado}
        aria-label={ouvindo ? 'Parar de ouvir' : 'Falar no microfone'}>
        <Icone nome={ouvindo ? 'parar' : 'mic'} tamanho={32} />
      </button>
      <div className="coluna" style={{ gap: 2 }}>
        <span className="pequeno" style={{ fontWeight: 700 }}>{legenda}</span>
        {mic.erro && <span className="pequeno" style={{ color: 'var(--errado)' }}>{mic.erro}</span>}
      </div>
    </div>
  );
}

/* ---------------- Ouvir e repetir / Leitura ---------------- */

export function ExRepetir({ item, aoAvaliar, rodape }: { item: Extract<Item, { tipo: 'repetir' | 'leitura' }>; aoAvaliar: AoAvaliar; rodape: (mic: JSX.Element) => JSX.Element }) {
  const [av, setAv] = useState<Avaliacao | null>(null);
  const [detalhes, setDetalhes] = useState(false);
  const longo = item.tipo === 'leitura' && item.en.split(' ').length > 20;
  const ipa = item.tipo === 'repetir' ? item.ipa : undefined;
  const exemplo = item.tipo === 'repetir' ? item.exemplo : undefined;
  const dica = item.tipo === 'repetir' ? item.dica : undefined;
  useEffect(() => { setAv(null); setDetalhes(false); }, [item]);
  return (
    <>
      <h2>{item.tipo === 'leitura' ? (item.titulo ? `Leitura: ${item.titulo}` : 'Leia em voz alta') : item.novo ? 'Palavra nova: ouça e repita' : 'Ouça e repita'}</h2>
      <div className="cartao">
        <Pronuncia en={item.en} fala={item.fala} grande={!longo && item.en.split(' ').length === 1} longo={longo} />
        <p className="secundario">{item.pt}</p>
        <BotoesOuvir texto={item.en} />
        {(ipa || exemplo) && (
          <button className="link" onClick={() => setDetalhes(!detalhes)} aria-expanded={detalhes}>
            {detalhes ? 'Esconder detalhes' : 'Ver detalhes'}
          </button>
        )}
        {detalhes && (
          <div className="coluna">
            {ipa && <p className="pequeno secundario">Símbolos fonéticos (IPA): /{ipa}/</p>}
            {exemplo && (
              <div className="coluna" style={{ gap: 6 }}>
                <span className="rotulo">Exemplo</span>
                <Pronuncia en={exemplo.en} fala={exemplo.fala} />
                <p className="pequeno secundario">{exemplo.pt}</p>
                <BotoesOuvir texto={exemplo.en} />
              </div>
            )}
          </div>
        )}
        {dica && !av && (
          <div className="cartao dica" style={{ padding: 12 }}><p className="pequeno"><strong>Para lembrar: </strong>{dica}</p></div>
        )}
      </div>
      {av && <CartaoResultado av={av} en={item.en} fala={item.fala} dica={dica} longo={longo} />}
      {rodape(<BotaoMic esperado={item.en} longo={longo} aoAvaliar={(a) => { setAv(a); aoAvaliar(a.nota); }} />)}
    </>
  );
}

/* ---------------- Lembrança ativa ---------------- */

export function ExLembrar({ item, aoAvaliar, rodape }: { item: Extract<Item, { tipo: 'lembrar' }>; aoAvaliar: AoAvaliar; rodape: (mic: JSX.Element) => JSX.Element }) {
  const [av, setAv] = useState<Avaliacao | null>(null);
  const [mostrar, setMostrar] = useState(false);
  useEffect(() => { setAv(null); setMostrar(false); }, [item]);
  const revelado = mostrar || !!av;
  return (
    <>
      <h2>Como se diz em inglês?</h2>
      <div className="cartao">
        <p style={{ fontSize: 28, fontWeight: 800 }}>{item.pt}</p>
        {!revelado && <p className="secundario pequeno">Fale a palavra em inglês sem olhar a resposta.</p>}
        {revelado && (
          <>
            <Pronuncia en={item.en} fala={item.fala} grande resultado={av?.palavras} />
            <BotoesOuvir texto={item.en} />
          </>
        )}
        {!revelado && (
          <button className="link" onClick={() => { setMostrar(true); aoAvaliar(0); }}>Não lembro, mostrar a resposta</button>
        )}
      </div>
      {av && <CartaoResultado av={av} en={item.en} fala={item.fala} dica={item.dica} />}
      {rodape(<BotaoMic esperado={item.en} aoAvaliar={(a) => { setAv(a); aoAvaliar(a.nota); }} />)}
    </>
  );
}

/* ---------------- Tradução (escolha) ---------------- */

export function ExEscolha({ item, aoAvaliar, rodape }: { item: Extract<Item, { tipo: 'escolha' }>; aoAvaliar: AoAvaliar; rodape: (mic: JSX.Element | null) => JSX.Element }) {
  const [marcada, setMarcada] = useState<string | null>(null);
  useEffect(() => setMarcada(null), [item]);
  const ingles = item.sentido === 'en-pt';
  return (
    <>
      <h2>{ingles ? 'O que significa?' : 'Escolha a tradução em inglês'}</h2>
      <div className="cartao">
        {ingles ? (
          <>
            <Pronuncia en={item.pergunta} fala={item.falaPergunta ?? []} grande />
            <BotoesOuvir texto={item.pergunta} />
          </>
        ) : (
          <p style={{ fontSize: 24, fontWeight: 800 }}>{item.pergunta}</p>
        )}
      </div>
      <div className="coluna" role="group" aria-label="Opções">
        {item.opcoes.map((o) => {
          const cls = marcada ? (o === item.correta ? ' certa' : o === marcada ? ' errada' : '') : '';
          return (
            <button key={o} className={`opcao${cls}`} disabled={!!marcada} lang={ingles ? 'pt-BR' : 'en'}
              onClick={() => {
                setMarcada(o);
                aoAvaliar(o === item.correta ? 100 : 0);
                if (!ingles) ttsNavegador.falar(item.correta);
              }}>
              {o}
            </button>
          );
        })}
      </div>
      {marcada && (
        <div className={`selo ${marcada === item.correta ? 'certo' : 'errado'}`} role="status">
          <Icone nome={marcada === item.correta ? 'check' : 'fechar'} tamanho={18} />
          {marcada === item.correta ? 'Certo!' : `Resposta: ${item.correta}`}
        </div>
      )}
      {rodape(null)}
    </>
  );
}

/* ---------------- Ditado ---------------- */

export function ExDitado({ item, aoAvaliar, rodape }: { item: Extract<Item, { tipo: 'ditado' }>; aoAvaliar: AoAvaliar; rodape: (mic: JSX.Element | null) => JSX.Element }) {
  const [texto, setTexto] = useState('');
  const [av, setAv] = useState<Avaliacao | null>(null);
  useEffect(() => { setTexto(''); setAv(null); }, [item]);
  return (
    <>
      <h2>Ditado: ouça e escreva</h2>
      <div className="cartao">
        <p className="secundario">Ouça quantas vezes quiser e escreva a frase em inglês.</p>
        <BotoesOuvir texto={item.en} />
        <label className="coluna" style={{ gap: 6 }}>
          <span className="rotulo">Sua resposta</span>
          <textarea className="campo" rows={3} value={texto} onChange={(e) => setTexto(e.target.value)}
            autoCapitalize="off" autoCorrect="off" spellCheck={false} lang="en" disabled={!!av} />
        </label>
        {!av && (
          <button className="botao suave" disabled={!texto.trim()} onClick={() => {
            const r = corrigirDitado(item.en, texto);
            setAv(r);
            aoAvaliar(r.nota);
          }}>Corrigir</button>
        )}
      </div>
      {av && (
        <div className="cartao" role="status">
          <div className="linha">
            <div className={`nota ${classeNota(av.nota)}`}>{av.nota}</div>
            <h3>{av.mensagem}</h3>
          </div>
          <Pronuncia en={item.en} fala={item.fala} resultado={av.palavras} />
          <p className="secundario pequeno">{item.pt}</p>
          <p><span className="secundario">Você escreveu: </span>
            {av.ouvidas.map((o, i) => <span key={i}>{i > 0 && ' '}<span className={o.erro ? 'ouvido-erro' : ''}>{o.palavra}</span></span>)}
          </p>
        </div>
      )}
      {rodape(null)}
    </>
  );
}

/* ---------------- Diálogo ---------------- */

export function ExDialogo({ item, aoAvaliar, aoMudarPronto, rodape }: {
  item: Extract<Item, { tipo: 'dialogo' }>; aoAvaliar: AoAvaliar; aoMudarPronto: (pronto: boolean) => void;
  rodape: (mic: JSX.Element | null) => JSX.Element;
}) {
  const [passo, setPasso] = useState(0);
  const [notas, setNotas] = useState<Record<number, Avaliacao>>({});
  const falado = useRef(-1);
  const linha = item.falas[passo];
  const fim = passo >= item.falas.length;

  useEffect(() => { setPasso(0); setNotas({}); falado.current = -1; }, [item]);
  useEffect(() => {
    if (fim) {
      const lista = Object.values(notas);
      aoAvaliar(lista.length ? Math.round(lista.reduce((s, a) => s + a.nota, 0) / lista.length) : 0);
      aoMudarPronto(true);
      return;
    }
    aoMudarPronto(false);
    if (linha.quem === 'app' && falado.current !== passo) {
      falado.current = passo;
      ttsNavegador.falar(linha.en).then(() => setPasso((p) => (p === passo ? p + 1 : p)));
    }
  }, [passo, fim]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <h2>Diálogo: {item.titulo}</h2>
      <p className="secundario pequeno">O app faz um papel e você faz o outro. Quando for a sua vez, fale a frase destacada.</p>
      <div className="coluna">
        {item.falas.slice(0, Math.min(passo + 1, item.falas.length)).map((f, i) => (
          <div key={i} className={`cartao${f.quem === 'voce' ? ' destaque' : ''}`} style={{ padding: 14 }}>
            <div className="linha entre">
              <span className="rotulo">{f.quem === 'app' ? 'App' : 'Você'}</span>
              <button className="icone-botao" aria-label="Ouvir esta fala" onClick={() => ttsNavegador.falar(f.en)}><Icone nome="ouvir" /></button>
            </div>
            <Pronuncia en={f.en} fala={f.fala} resultado={notas[i]?.palavras} />
            <p className="pequeno secundario">{f.pt}</p>
            {notas[i] && (
              <div className="linha"><span className={`selo ${notas[i].nota >= 70 ? 'certo' : 'errado'}`}>{notas[i].nota} · {notas[i].mensagem}</span></div>
            )}
            {notas[i] && <VoceDisse ouvidas={notas[i].ouvidas} />}
          </div>
        ))}
      </div>
      {!fim && linha.quem === 'voce' && notas[passo] && (
        <div className="linha">
          <button className="botao suave cheio" onClick={() => setPasso(passo + 1)}>Próxima fala</button>
        </div>
      )}
      {fim && <div className="selo certo" role="status"><Icone nome="check" tamanho={18} /> Diálogo concluído</div>}
      {rodape(!fim && linha.quem === 'voce'
        ? <BotaoMic esperado={linha.en} aoAvaliar={(a) => setNotas((n) => ({ ...n, [passo]: a }))} />
        : null)}
    </>
  );
}
