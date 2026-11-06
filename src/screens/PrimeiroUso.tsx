import { useState } from 'react';
import { UNIDADES_INICIANTE } from '../content';
import { atualizar } from '../lib/store';
import { Logo } from '../ui/Logo';
import { Pronuncia } from '../ui/Pronuncia';
import { ColarCodigo } from '../ui/Transferir';
import { ir } from '../ui/rotas';
import { TestarMicrofone } from './Microfone';
import { EscolherPlano } from './Plano';

export function PrimeiroUso() {
  const [passo, setPasso] = useState(0);
  const [jaTenho, setJaTenho] = useState(false);
  const terminar = () => {
    atualizar((e) => ({ ...e, primeiroUsoFeito: true }));
    ir(`/licao/iniciante/${UNIDADES_INICIANTE[0].id}`);
  };
  return (
    <div className="tela sem-barra">
      <div className="barra" role="progressbar" aria-valuenow={passo + 1} aria-valuemax={3}>
        <div style={{ width: `${((passo + 1) / 3) * 100}%` }} />
      </div>
      {passo === 0 && (
        <>
          <div className="boas-vindas">
            <Logo />
            <h1 className="grande">Ouça. Repita. Acerte.</h1>
          </div>
          <p className="secundario">Em três passos: você ouve, repete e recebe uma nota na hora. Embaixo de cada palavra aparece como ela soa:</p>
          <div className="cartao">
            <Pronuncia en="I would like an orange juice." fala={['ai', 'uud', 'laik', 'én', 'ó-rindj', 'djus']} />
            <p className="secundario pequeno">Eu gostaria de um suco de laranja.</p>
          </div>
          <div className="cartao">
            <p className="pequeno">Grátis, sem login e sem anúncios. Seu progresso fica guardado só neste aparelho.</p>
          </div>
          <button className="botao principal cheio" onClick={() => setPasso(1)}>Começar</button>
          {!jaTenho ? (
            <button className="link" onClick={() => setJaTenho(true)}>Já usei o app no Safari ou em outro celular</button>
          ) : (
            <div className="cartao">
              <h3>Trazer o seu progresso</h3>
              <p className="pequeno secundario">
                Onde você já estudava (por exemplo, no Safari), vá em <strong>Ajustes › Copiar código do progresso</strong>.
                Depois volte aqui e toque em colar.
              </p>
              <ColarCodigo aoAplicar={() => ir('/')} />
            </div>
          )}
        </>
      )}
      {passo === 1 && <EscolherPlano textoBotao="Continuar" aoSalvar={() => setPasso(2)} />}
      {passo === 2 && (
        <>
          <h1>Vamos testar o microfone</h1>
          <TestarMicrofone aoTerminar={terminar} />
        </>
      )}
    </div>
  );
}
