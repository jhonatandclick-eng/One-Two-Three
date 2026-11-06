import type { ResultadoPalavra, ResultadoOuvida } from '../engines/scorer';
import { palavrasDaTela } from '../lib/normalize';
import { falaDe } from '../content';

/** Mostra cada palavra em inglês com a pronúncia "do jeito que se fala" embaixo. */
export function Pronuncia({ en, fala, resultado, grande, longo }: {
  en: string;
  fala: string[] | string;
  resultado?: ResultadoPalavra[];
  grande?: boolean;
  longo?: boolean;
}) {
  const palavras = palavrasDaTela(en);
  const lista = typeof fala === 'string' ? [fala] : fala;
  return (
    <div className={`palavras${grande ? ' grande' : ''}${longo ? ' texto-longo' : ''}`} lang="en">
      {palavras.map((p, i) => {
        const st = resultado?.[i]?.status;
        const pron = lista[i] || falaDe(p);
        return (
          <span key={i} className={`palavra${st && st !== 'certa' ? ' ' + st : ''}`}>
            <span className="en">{p}</span>
            {pron && <span className="fala" lang="pt-BR">{pron}</span>}
            {st && st !== 'certa' && <span className="sr-only" style={{ position: 'absolute', left: -9999 }}>{st === 'quase' ? '(quase)' : '(errada)'}</span>}
          </span>
        );
      })}
    </div>
  );
}

export function VoceDisse({ ouvidas }: { ouvidas: ResultadoOuvida[] }) {
  if (!ouvidas.length) return <p className="secundario">Não consegui ouvir nada.</p>;
  return (
    <p>
      <span className="secundario">Você disse: </span>
      <span lang="en">
        {ouvidas.map((o, i) => (
          <span key={i}>
            {i > 0 && ' '}
            <span className={o.erro ? 'ouvido-erro' : ''}>{o.palavra}</span>
          </span>
        ))}
      </span>
    </p>
  );
}
