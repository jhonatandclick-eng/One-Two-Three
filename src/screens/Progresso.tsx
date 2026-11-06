import { TODAS_PALAVRAS } from '../content';
import { hoje, inicioDaSemana, somarDias, deTexto } from '../lib/dates';
import { palavrasAprendidas, palavrasDominadas } from '../lib/licao';
import { preverConclusao } from '../lib/plan';
import { porCaixa } from '../lib/srs';
import { sequencia, useEstado } from '../lib/store';

const DIAS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const dias = (n: number) => `${n} ${n === 1 ? 'dia' : 'dias'}`;

export function Progresso() {
  const e = useEstado();
  const dia = hoje();
  const ultimos = Array.from({ length: 14 }, (_, k) => somarDias(dia, k - 13));
  const max = Math.max(10, ...ultimos.map((d) => e.xpPorDia[d] ?? 0));

  // XP por semana (segunda a domingo)
  const semanas = new Map<string, number>();
  Object.entries(e.xpPorDia).forEach(([d, xp]) => {
    const s = inicioDaSemana(d);
    semanas.set(s, (semanas.get(s) ?? 0) + xp);
  });
  const atual = inicioDaSemana(dia);
  if (!semanas.has(atual)) semanas.set(atual, 0);
  const ranking = [...semanas.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const posicao = [...semanas.entries()].sort((a, b) => b[1] - a[1]).findIndex(([s]) => s === atual) + 1;

  const caixas = porCaixa(e.srs);
  const prev = e.plano ? preverConclusao(e.plano.id, e.plano.inicio, dia, palavrasAprendidas(e), TODAS_PALAVRAS.length) : null;
  const fmt = (s: string) => { const d = deTexto(s); return `${d.getDate()}/${d.getMonth() + 1}`; };

  return (
    <div className="tela">
      <h1>Progresso</h1>

      <div className="grade2">
        <div className="cartao"><span className="rotulo">Sequência</span><h2>{dias(sequencia(e.xpPorDia))}</h2></div>
        <div className="cartao"><span className="rotulo">Maior sequência</span><h2>{dias(e.recordes.maiorSequencia)}</h2></div>
        <div className="cartao"><span className="rotulo">Mais XP num dia</span><h2>{e.recordes.maiorXpDia}</h2></div>
        <div className="cartao"><span className="rotulo">Dominadas</span><h2>{palavrasDominadas(e)}</h2></div>
      </div>

      <div className="cartao">
        <h3>XP por dia</h3>
        <div className="grafico" role="img" aria-label="XP dos últimos 14 dias">
          {ultimos.map((d) => {
            const xp = e.xpPorDia[d] ?? 0;
            return (
              <div className="col" key={d} title={`${fmt(d)}: ${xp} XP`}>
                <div className={`bar${d === dia ? ' hoje' : ''}`} style={{ height: `${(xp / max) * 100}%` }} />
                <span className="dia">{DIAS[deTexto(d).getDay()]}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="cartao">
        <h3>Seu ranking pessoal</h3>
        <p className="pequeno secundario">Esta semana está em {posicao}º lugar entre as suas semanas.</p>
        <table className="tabela">
          <tbody>
            {ranking.map(([s, xp], k) => (
              <tr key={s} className={s === atual ? 'atual' : ''}>
                <td>{k + 1}º</td>
                <td>{s === atual ? 'Esta semana' : `Semana de ${fmt(s)}`}</td>
                <td style={{ textAlign: 'right' }}>{xp} XP</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="cartao">
        <h3>Palavras por caixa</h3>
        <p className="pequeno secundario">Caixa 1 revisa amanhã; caixa 5 só daqui a 30 dias. Da caixa 4 em diante a palavra conta como dominada.</p>
        {caixas.map((n, k) => (
          <div key={k} className="linha">
            <span style={{ width: 70 }} className="pequeno">Caixa {k + 1}</span>
            <div className="barra" style={{ flex: 1 }}><div style={{ width: `${Math.min(100, (n / Math.max(1, ...caixas)) * 100)}%` }} /></div>
            <span className="pequeno" style={{ width: 32, textAlign: 'right' }}>{n}</span>
          </div>
        ))}
      </div>

      {prev && (
        <div className="cartao dica">
          <h3>Previsão do plano</h3>
          <p>{prev.mensagem}</p>
          <p className="pequeno secundario">É uma estimativa, recalculada pelo seu desempenho real.</p>
        </div>
      )}
    </div>
  );
}
