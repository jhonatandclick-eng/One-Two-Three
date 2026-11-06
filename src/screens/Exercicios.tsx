import { useEffect, useRef, useState } from 'react';
import type { Avaliacao } from '../engines/scorer';
import { corrigirDitado } from '../engines/scorer';
import { ttsNavegador } from '../engines/tts';
import { ipaDe } from '../content';
import type { Item } from '../lib/licao';
import { dicasDaPalavra } from '../lib/sons';
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

/** Dicas de som para o resultado: da palavra treinada, ou das palavras que saíram erradas numa frase. */
function dicasDoResultado(av: Avaliacao, en: string, ipa?: string) {
  const unica = av.palavras.length === 1;
  if (unica) {
    const lista = dicasDaPalavra(ipa ?? ipaDe(en), en, av.nota >= 90 ? 1 : 2);
    return lista.map((d) => ({ palavra: av.palavras[0].tela, ...d }));
  }
  const out: { palavra: string; som: string; dica: string }[] = [];
  for (const p of av.palavras) {
    if (out.length >= 2) break;
    if (p.status === 'certa') continue;
    const d = dicasDaPalavra(ipaDe(p.tela), p.tela, 1)[0];
    if (d) out.push({ palavra: p.tela.replace(/[^\w']/g, ''), ...d });
  }
  return out;
}

function textoClareza(av: Avaliacao): string {
  if (!av.ouvido) return 'Não ouvi nada. Fale mais perto do microfone.';
  if (av.clareza !== undefined && av.clareza < 85) {
    return 'O app chegou nas palavras, mas teve dúvida no som. Capriche nos sons das dicas abaixo.';
  }
  if (av.nota >= 90) return 'O app entendeu você de primeira, com clareza.';
  return 'Algumas palavras saíram diferentes do esperado.';
}

export function CartaoResultado({ av, en, fala, dica, longo, ipa }: { av: Avaliacao; en: string; fala: string[]; dica?: string; longo?: boolean; ipa?: string }) {
  const temErro = av.palavras.some((p) => p.status !== 'certa');
  const sons = dicasDoResultado(av, en, ipa);
  return (
    <div className="cartao" role="status" aria-live="polite">
      <div className="linha">
        <div className={`nota ${classeNota(av.nota)}`} aria-label={`Nota ${av.nota} de 100`}>{av.nota}</div>
        <div className="coluna" style={{ gap: 2 }}>
          <h3>{av.mensagem}</h3>
          <p className="pequeno secundario">{textoClareza(av)}</p>
        </div>
      </div>
      {temErro && <Pronuncia en={en} fala={fala} resultado={av.palavras} longo={longo} />}
      <VoceDisse ouvidas={av.ouvidas} />
      {sons.length > 0 && (
        <div className="coluna sons">
          <span className="rotulo">{av.nota >= 90 ? 'Para soar ainda mais natural' : 'Como soar melhor'}</span>
          {sons.map((s, k) => (
            <div key={k} className="som">
              <div className="linha entre">
                <span><strong lang="en">{s.palavra}</strong> <span className="selo neutro">{s.som}</span></span>
                <button className="icone-botao" aria-label={`Ouvir ${s.palavra} devagar`}
                  onClick={() => ttsNavegador.falar(s.palavra, { devagar: true })}><Icone nome="devagar" tamanho={18} /></button>
              </div>
              <p className="pequeno">{s.dica}</p>
            </div>
          ))}
        </div>
      )}
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

/** O que um exercício de fala passa para o rodapé. */
export interface FalaCfg {
  esperado: string;
  longo?: boolean;
  aoAvaliar: (a: Avaliacao) => void;
  /** nota da última tentativa; null enquanto a pessoa ainda não falou */
  nota: number | null;
  /** troca o "Continuar" da lição (usado no diálogo: vai para a próxima fala) */
  aoContinuar?: () => void;
  rotuloContinuar?: string;
}

/** null = exercício sem fala (só o botão Continuar/Pular da lição). */
export type Rodape = (cfg: FalaCfg | null) => JSX.Element;

/**
 * Rodapé dos exercícios de fala. Muda conforme o momento, para não tocar no botão errado:
 * 1) antes de falar: um botão só, "Toque e fale";
 * 2) ouvindo: o MESMO botão vira "Parar";
 * 3) depois da nota: "Repetir" e "Continuar" (ou "Tentar de novo" e "Pular", se não foi bem).
 */
export function RodapeFala({ cfg, aoContinuar }: { cfg: FalaCfg; aoContinuar: () => void }) {
  const mic = useMicrofone();
  const ouvindo = mic.estado === 'ouvindo';
  const ocupado = mic.estado === 'preparando' || mic.estado === 'processando';
  const falar = async () => {
    if (ouvindo) return mic.parar();
    const av = await mic.ouvir(cfg.esperado, { longo: cfg.longo });
    if (av) cfg.aoAvaliar(av);
  };
  const continuar = cfg.aoContinuar ?? aoContinuar;

  if (cfg.nota === null || ouvindo || ocupado) {
    let rotulo = cfg.longo ? 'Toque e leia em voz alta' : 'Toque e fale';
    if (ouvindo) rotulo = 'Parar';
    if (mic.estado === 'preparando') rotulo = mic.baixando !== null ? `Baixando voz: ${mic.baixando}%` : 'Preparando...';
    if (mic.estado === 'processando') rotulo = 'Analisando...';
    let ajuda = '';
    if (ouvindo) ajuda = cfg.longo ? 'Ouvindo. Leia tudo e toque em Parar.' : 'Ouvindo. Fale agora.';
    return (
      <div className="rodape-exercicio coluna-rodape">
        <button className={`botao-fala${ouvindo ? ' ouvindo' : ''}`} onClick={falar} disabled={ocupado}
          aria-label={ouvindo ? 'Parar de ouvir' : 'Falar no microfone'}>
          <Icone nome={ouvindo ? 'parar' : 'mic'} tamanho={26} /> {rotulo}
        </button>
        {ajuda && <span className="pequeno secundario" role="status">{ajuda}</span>}
        {mic.erro && (
          <div className="coluna" style={{ gap: 4, alignItems: 'center' }}>
            <span className="pequeno" style={{ color: 'var(--errado)', textAlign: 'center' }}>{mic.erro}</span>
            <button className="link pequeno" onClick={continuar}>Pular este exercício</button>
          </div>
        )}
      </div>
    );
  }

  const foiBem = cfg.nota >= 80;
  return (
    <div className="rodape-exercicio">
      <button className={`botao${foiBem ? '' : ' principal'}`} style={{ flex: 1 }} onClick={falar}>
        <Icone nome="repetir" /> {foiBem ? 'Repetir' : 'Tentar de novo'}
      </button>
      <button className={`botao${foiBem ? ' principal' : ''}`} style={{ flex: 1 }} onClick={continuar}>
        {cfg.rotuloContinuar ?? (foiBem ? 'Continuar' : 'Pular')}
      </button>
    </div>
  );
}

/* ---------------- Ouvir e repetir / Leitura ---------------- */

export function ExRepetir({ item, aoAvaliar, rodape }: { item: Extract<Item, { tipo: 'repetir' | 'leitura' }>; aoAvaliar: AoAvaliar; rodape: Rodape }) {
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
      {av && <CartaoResultado av={av} en={item.en} fala={item.fala} dica={dica} longo={longo} ipa={ipa} />}
      {rodape({ esperado: item.en, longo, nota: av?.nota ?? null, aoAvaliar: (a) => { setAv(a); aoAvaliar(a.nota); } })}
    </>
  );
}

/* ---------------- Lembrança ativa ---------------- */

export function ExLembrar({ item, aoAvaliar, rodape }: { item: Extract<Item, { tipo: 'lembrar' }>; aoAvaliar: AoAvaliar; rodape: Rodape }) {
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
      {av && <CartaoResultado av={av} en={item.en} fala={item.fala} dica={item.dica} ipa={item.ipa} />}
      {rodape({ esperado: item.en, nota: av?.nota ?? (mostrar ? 0 : null), aoAvaliar: (a) => { setAv(a); aoAvaliar(a.nota); } })}
    </>
  );
}

/* ---------------- Tradução (escolha) ---------------- */

export function ExEscolha({ item, aoAvaliar, rodape }: { item: Extract<Item, { tipo: 'escolha' }>; aoAvaliar: AoAvaliar; rodape: Rodape }) {
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

export function ExDitado({ item, aoAvaliar, rodape }: { item: Extract<Item, { tipo: 'ditado' }>; aoAvaliar: AoAvaliar; rodape: Rodape }) {
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
  rodape: Rodape;
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
      {fim && <div className="selo certo" role="status"><Icone nome="check" tamanho={18} /> Diálogo concluído</div>}
      {rodape(!fim && linha.quem === 'voce'
        ? {
          esperado: linha.en,
          nota: notas[passo]?.nota ?? null,
          aoAvaliar: (a) => setNotas((n) => ({ ...n, [passo]: a })),
          aoContinuar: () => setPasso(passo + 1),
          rotuloContinuar: 'Próxima fala',
        }
        : null)}
    </>
  );
}
