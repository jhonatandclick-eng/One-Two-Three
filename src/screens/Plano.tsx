import { useState } from 'react';
import { TODAS_PALAVRAS } from '../content';
import { hoje } from '../lib/dates';
import { palavrasAprendidas } from '../lib/licao';
import { PLANOS, PLANO_PADRAO, preverConclusao, textoDataPrevista, type PlanoId } from '../lib/plan';
import { atualizar, useEstado } from '../lib/store';
import { Icone } from '../ui/Icones';

export function EscolherPlano({ aoSalvar, textoBotao = 'Salvar plano' }: { aoSalvar: () => void; textoBotao?: string }) {
  const e = useEstado();
  const [id, setId] = useState<PlanoId>(e.plano?.id ?? PLANO_PADRAO);
  const inicio = hoje();
  return (
    <>
      <h2>Em quanto tempo você quer chegar ao nível intermediário?</h2>
      <div className="coluna" role="radiogroup">
        {PLANOS.map((p) => (
          <button key={p.id} role="radio" aria-checked={id === p.id}
            className={`cartao escolha-plano${id === p.id ? ' marcado' : ''}`} onClick={() => setId(p.id)}>
            <div className="linha entre">
              <strong>{p.rotulo} · {p.ritmo}{p.id === PLANO_PADRAO ? ' (recomendado)' : ''}</strong>
              {id === p.id && <Icone nome="check" />}
            </div>
            <span className="pequeno secundario">{p.minutosDia} min por dia · cerca de {p.palavrasSemana} palavras novas por semana</span>
            <span className="pequeno">Previsão: {textoDataPrevista(p.id, inicio)}</span>
          </button>
        ))}
      </div>
      <p className="pequeno secundario">A previsão é uma estimativa. Toda semana o app recalcula pelo seu desempenho real.</p>
      <button className="botao principal cheio" onClick={() => {
        atualizar((s) => ({ ...s, plano: { id, inicio: s.plano && s.plano.id === id ? s.plano.inicio : inicio } }));
        aoSalvar();
      }}>{textoBotao}</button>
    </>
  );
}

export function Plano() {
  const e = useEstado();
  const prev = e.plano ? preverConclusao(e.plano.id, e.plano.inicio, hoje(), palavrasAprendidas(e), TODAS_PALAVRAS.length) : null;
  const [salvo, setSalvo] = useState(false);
  return (
    <div className="tela">
      <h1>Seu plano</h1>
      {prev && <div className="cartao dica"><p>{prev.mensagem}</p></div>}
      <EscolherPlano aoSalvar={() => setSalvo(true)} />
      {salvo && <p className="selo certo" role="status">Plano salvo</p>}
    </div>
  );
}
