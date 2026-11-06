import { useMemo, useState } from 'react';
import { ttsNavegador } from '../engines/tts';
import type { Item } from '../lib/licao';
import { concluirLicao, registrarTentativa, xpDaNota } from '../lib/store';
import { Icone } from '../ui/Icones';
import { ExDialogo, ExDitado, ExEscolha, ExLembrar, ExRepetir, RodapeFala, type Rodape } from './Exercicios';
import { ir } from '../ui/rotas';

export function Licao({ titulo, itens, unidadeId }: { titulo: string; itens: Item[]; unidadeId?: string }) {
  const lista = useMemo(() => itens, [itens]);
  const [i, setI] = useState(0);
  const [melhor, setMelhor] = useState<number | null>(null);
  const [dialogoPronto, setDialogoPronto] = useState(false);
  const [xpTotal, setXpTotal] = useState(0);
  const [notas, setNotas] = useState<number[]>([]);

  if (!lista.length) {
    return (
      <div className="tela sem-barra">
        <h1>{titulo}</h1>
        <div className="cartao"><p>Nada para revisar agora. Volte amanhã ou faça uma lição nova.</p></div>
        <button className="botao principal cheio" onClick={() => ir('/')}>Voltar ao início</button>
      </div>
    );
  }

  if (i >= lista.length) {
    const media = notas.length ? Math.round(notas.reduce((a, b) => a + b, 0) / notas.length) : 0;
    return (
      <div className="tela sem-barra">
        <h1>Lição concluída!</h1>
        <div className="cartao destaque">
          <div className="linha entre"><span>XP ganho</span><strong>+{xpTotal}</strong></div>
          <div className="linha entre"><span>Média da lição</span><strong>{media}</strong></div>
        </div>
        <p className="secundario">As palavras que você errou vão voltar amanhã na revisão. As que acertou voltam daqui a alguns dias.</p>
        <button className="botao principal cheio" onClick={() => ir('/')}>Continuar</button>
      </div>
    );
  }

  const item = lista[i];
  const podeContinuar = item.tipo === 'dialogo' ? dialogoPronto : melhor !== null;

  const avancar = () => {
    ttsNavegador.parar();
    const nota = melhor ?? 0;
    if (melhor !== null) {
      const id = 'id' in item ? item.id : null;
      const novo = item.tipo === 'repetir' && !!item.novo;
      const xp = registrarTentativa(id, nota, novo);
      setXpTotal((x) => x + xp);
      setNotas((n) => [...n, nota]);
    }
    setMelhor(null);
    setDialogoPronto(false);
    if (i + 1 >= lista.length && unidadeId) concluirLicao(unidadeId);
    setI(i + 1);
  };

  const aoAvaliar = (n: number) => setMelhor((m) => (m === null ? n : Math.max(m, n)));

  const rodape: Rodape = (cfg) =>
    cfg ? (
      <RodapeFala key={`${i}-${cfg.esperado}`} cfg={cfg} aoContinuar={avancar} />
    ) : (
      <div className="rodape-exercicio">
        <div style={{ flex: 1 }} />
        <button className="botao principal" onClick={avancar} disabled={!podeContinuar && item.tipo === 'dialogo'}
          style={{ minWidth: 132 }}>
          {podeContinuar ? 'Continuar' : 'Pular'}
        </button>
      </div>
    );

  return (
    <div className="tela sem-barra">
      <div className="linha">
        <button className="icone-botao" aria-label="Fechar lição" onClick={() => { ttsNavegador.parar(); ir('/'); }}>
          <Icone nome="fechar" />
        </button>
        <div className="barra" style={{ flex: 1 }} role="progressbar" aria-valuenow={i} aria-valuemax={lista.length}>
          <div style={{ width: `${(i / lista.length) * 100}%` }} />
        </div>
        <span className="pequeno secundario" style={{ fontWeight: 700 }}>{i + 1}/{lista.length}</span>
      </div>
      <p className="rotulo">{titulo}</p>
      {melhor !== null && item.tipo !== 'dialogo' && (
        <span className="pequeno secundario">+{xpDaNota(melhor)} XP</span>
      )}
      {(item.tipo === 'repetir' || item.tipo === 'leitura') && <ExRepetir key={i} item={item} aoAvaliar={aoAvaliar} rodape={rodape} />}
      {item.tipo === 'lembrar' && <ExLembrar key={i} item={item} aoAvaliar={aoAvaliar} rodape={rodape} />}
      {item.tipo === 'escolha' && <ExEscolha key={i} item={item} aoAvaliar={aoAvaliar} rodape={rodape} />}
      {item.tipo === 'ditado' && <ExDitado key={i} item={item} aoAvaliar={aoAvaliar} rodape={rodape} />}
      {item.tipo === 'dialogo' && (
        <ExDialogo key={i} item={item} aoAvaliar={(n) => setMelhor(n)} aoMudarPronto={setDialogoPronto} rodape={rodape} />
      )}
    </div>
  );
}
