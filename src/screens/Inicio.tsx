import { hoje } from '../lib/dates';
import { licaoAtual, intermediarioLiberado, mediaIniciante, revisoesVencidas } from '../lib/licao';
import { opcao, semanaAtual } from '../lib/plan';
import { sequencia, useEstado } from '../lib/store';
import { Icone } from '../ui/Icones';
import { ir } from '../ui/rotas';

function saudacao() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

export function Inicio() {
  const e = useEstado();
  const plano = opcao(e.plano?.id ?? '3m');
  const xpHoje = e.xpPorDia[hoje()] ?? 0;
  const seq = sequencia(e.xpPorDia);
  const atual = licaoAtual(e);
  const revisar = revisoesVencidas(e).length;
  const liberado = intermediarioLiberado(e);
  const semana = e.plano ? semanaAtual(e.plano.inicio, hoje()) : 1;
  const linhaPlano = plano.semanas
    ? `Plano de ${plano.rotulo} · semana ${Math.min(semana, plano.semanas)} de ${plano.semanas}`
    : 'Plano sem prazo · no seu tempo';

  return (
    <div className="tela">
      <div className="linha entre">
        <div className="coluna" style={{ gap: 2 }}>
          <span className="secundario">{saudacao()}!</span>
          <h1>Vamos praticar?</h1>
        </div>
        <span className="selo seq" aria-label={`Sequência de ${seq} dias`}><Icone nome="fogo" tamanho={18} /> {seq} {seq === 1 ? 'dia' : 'dias'}</span>
      </div>

      <div className="cartao">
        <div className="linha entre">
          <h3>Meta do dia</h3>
          <span className="pequeno secundario" style={{ fontWeight: 700 }}>{xpHoje}/{plano.metaXp} XP</span>
        </div>
        <div className="barra" role="progressbar" aria-valuenow={xpHoje} aria-valuemax={plano.metaXp}>
          <div style={{ width: `${Math.min(100, (xpHoje / plano.metaXp) * 100)}%` }} />
        </div>
        <div className="linha entre">
          <span className="pequeno secundario">{linhaPlano}</span>
          <button className="link pequeno" onClick={() => ir('/plano')}>Ajustar</button>
        </div>
      </div>

      <div className="cartao destaque">
        <span className="rotulo">{atual.nivel === 'iniciante' ? 'Iniciante' : 'Intermediário'} · Unidade {atual.numero}</span>
        <h2>{atual.nome}</h2>
        <div className="barra"><div style={{ width: `${atual.progresso}%` }} /></div>
        <span className="pequeno secundario">{atual.progresso}% dominado</span>
        <button className="botao principal cheio" onClick={() => ir(`/licao/${atual.nivel}/${atual.id}`)}>
          Continuar lição <Icone nome="seta" />
        </button>
      </div>

      <h3>Praticar</h3>
      <div className="grade2">
        <button className="pratica" onClick={() => ir('/praticar/repetir')}>
          <span className="ic"><Icone nome="ouvir" /></span><strong>Ouvir e repetir</strong>
        </button>
        <button className="pratica" onClick={() => ir('/praticar/leitura')}>
          <span className="ic"><Icone nome="texto" /></span><strong>Leitura</strong>
        </button>
        <button className="pratica" onClick={() => ir('/praticar/traducao')}>
          <span className="ic"><Icone nome="traduzir" /></span><strong>Tradução</strong>
        </button>
        <button className="pratica" onClick={() => ir('/praticar/revisar')}>
          <span className="linha" style={{ width: '100%' }}>
            <span className="ic"><Icone nome="revisar" /></span>
            {revisar > 0 && <span className="contador" aria-label={`${revisar} para revisar`}>{revisar}</span>}
          </span>
          <strong>Revisar erros</strong>
        </button>
      </div>

      <h3>Níveis</h3>
      <div className="coluna">
        <div className="cartao" style={{ flexDirection: 'row', alignItems: 'center' }}>
          <div className="coluna" style={{ gap: 2, flex: 1 }}>
            <strong>Iniciante</strong>
            <span className="pequeno secundario">Média atual: {mediaIniciante(e)}%</span>
          </div>
          {!liberado && <span className="selo neutro">Atual</span>}
        </div>
        <div className={`cartao${liberado ? '' : ' bloqueado'}`} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <div className="coluna" style={{ gap: 2, flex: 1 }}>
            <strong>Intermediário</strong>
            <span className="pequeno secundario">{liberado ? 'Liberado' : 'Libera com média de 80% no Iniciante'}</span>
          </div>
          {liberado ? <span className="selo neutro">Atual</span> : <Icone nome="cadeado" />}
        </div>
        <div className="cartao bloqueado" style={{ flexDirection: 'row', alignItems: 'center' }}>
          <div className="coluna" style={{ gap: 2, flex: 1 }}>
            <strong>Avançado</strong>
            <span className="pequeno secundario">Conversa livre · Em breve</span>
          </div>
          <Icone nome="cadeado" />
        </div>
      </div>
    </div>
  );
}
