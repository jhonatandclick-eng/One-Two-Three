import { useEffect, useMemo } from 'react';
import { UNIDADES_INICIANTE, UNIDADES_INTERMEDIARIO } from './content';
import { licaoIniciante, licaoIntermediario, licaoPratica, type ModoPratica } from './lib/licao';
import { obter, useEstado } from './lib/store';
import { Ajustes } from './screens/Ajustes';
import { Inicio } from './screens/Inicio';
import { Licao } from './screens/Licao';
import { Licoes } from './screens/Licoes';
import { Plano } from './screens/Plano';
import { PrimeiroUso } from './screens/PrimeiroUso';
import { Progresso } from './screens/Progresso';
import { Icone } from './ui/Icones';
import { useRota } from './ui/rotas';

const TITULOS_PRATICA: Record<ModoPratica, string> = {
  repetir: 'Ouvir e repetir',
  leitura: 'Leitura',
  traducao: 'Tradução',
  revisar: 'Revisar erros',
};

function Nav({ rota }: { rota: string }) {
  const abas = [
    { href: '/', nome: 'Início', icone: 'inicio' },
    { href: '/licoes', nome: 'Lições', icone: 'licoes' },
    { href: '/progresso', nome: 'Progresso', icone: 'progresso' },
    { href: '/ajustes', nome: 'Ajustes', icone: 'ajustes' },
  ];
  return (
    <nav className="nav" aria-label="Navegação principal">
      <div className="nav-interno">
        {abas.map((a) => (
          <a key={a.href} href={'#' + a.href} className={rota === a.href ? 'ativo' : ''} aria-current={rota === a.href ? 'page' : undefined}>
            <Icone nome={a.icone} />
            {a.nome}
          </a>
        ))}
      </div>
    </nav>
  );
}

export function App() {
  const e = useEstado();
  const rota = useRota();

  useEffect(() => {
    const raiz = document.documentElement;
    if (e.tema === 'sistema') raiz.removeAttribute('data-theme');
    else raiz.setAttribute('data-theme', e.tema);
  }, [e.tema]);

  // Monta a lição uma vez ao entrar na rota (não muda no meio da lição).
  const licao = useMemo(() => {
    const s = obter();
    const m = rota.match(/^\/licao\/(iniciante|intermediario)\/([\w-]+)/);
    if (m) {
      if (m[1] === 'iniciante') {
        const u = UNIDADES_INICIANTE.find((x) => x.id === m[2]);
        if (u) return { titulo: `Iniciante · ${u.nome}`, itens: licaoIniciante(u.id, s), unidadeId: u.id };
      } else {
        const u = UNIDADES_INTERMEDIARIO.find((x) => x.id === m[2]);
        if (u) return { titulo: `Intermediário · ${u.nome}`, itens: licaoIntermediario(u.id, s), unidadeId: u.id };
      }
    }
    const p = rota.match(/^\/praticar\/(repetir|leitura|traducao|revisar)/);
    if (p) {
      const modo = p[1] as ModoPratica;
      return { titulo: TITULOS_PRATICA[modo], itens: licaoPratica(modo, s), unidadeId: undefined };
    }
    return null;
  }, [rota]);

  if (!e.primeiroUsoFeito && !licao) return <PrimeiroUso />;
  if (licao) return <Licao key={rota} titulo={licao.titulo} itens={licao.itens} unidadeId={licao.unidadeId} />;

  let tela: JSX.Element;
  if (rota === '/licoes') tela = <Licoes />;
  else if (rota === '/progresso') tela = <Progresso />;
  else if (rota === '/ajustes') tela = <Ajustes />;
  else if (rota === '/plano') tela = <Plano />;
  else tela = <Inicio />;

  return (
    <>
      <main>{tela}</main>
      <Nav rota={rota} />
    </>
  );
}
