import { UNIDADES_INICIANTE, UNIDADES_INTERMEDIARIO } from '../content';
import { intermediarioLiberado, progressoUnidade } from '../lib/licao';
import { useEstado } from '../lib/store';
import { Icone } from '../ui/Icones';
import { ir } from '../ui/rotas';

export function Licoes() {
  const e = useEstado();
  const liberado = intermediarioLiberado(e);
  return (
    <div className="tela">
      <h1>Lições</h1>
      <h3>Iniciante</h3>
      <div className="coluna">
        {UNIDADES_INICIANTE.map((u, k) => {
          const p = progressoUnidade(u.id, e);
          return (
            <button key={u.id} className="cartao" style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => ir(`/licao/iniciante/${u.id}`)}>
              <div className="linha entre">
                <div className="coluna" style={{ gap: 2 }}>
                  <span className="rotulo">Unidade {k + 1}</span>
                  <strong>{u.nome}</strong>
                </div>
                <Icone nome="seta" />
              </div>
              <div className="barra"><div style={{ width: `${p}%` }} /></div>
              <span className="pequeno secundario">{p}% · {u.palavras.length} palavras</span>
            </button>
          );
        })}
      </div>
      <h3>Intermediário</h3>
      {!liberado && <p className="secundario pequeno">Libera quando a média do Iniciante chegar a 80%.</p>}
      <div className="coluna">
        {UNIDADES_INTERMEDIARIO.map((u, k) => {
          const p = progressoUnidade(u.id, e);
          return (
            <button key={u.id} className={`cartao${liberado ? '' : ' bloqueado'}`} style={{ textAlign: 'left', cursor: liberado ? 'pointer' : 'default' }}
              disabled={!liberado} onClick={() => ir(`/licao/intermediario/${u.id}`)}>
              <div className="linha entre">
                <div className="coluna" style={{ gap: 2 }}>
                  <span className="rotulo">Unidade {k + 1}</span>
                  <strong>{u.nome}</strong>
                </div>
                <Icone nome={liberado ? 'seta' : 'cadeado'} />
              </div>
              <div className="barra"><div style={{ width: `${p}%` }} /></div>
              <span className="pequeno secundario">Frases, texto, ditado e diálogo</span>
            </button>
          );
        })}
      </div>
      <h3>Avançado</h3>
      <div className="cartao bloqueado"><strong>Conversa livre</strong><span className="pequeno secundario">Em breve</span></div>
    </div>
  );
}
