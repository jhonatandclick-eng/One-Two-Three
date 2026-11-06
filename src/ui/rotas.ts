import { useEffect, useState } from 'react';

// Navegação por "#", para funcionar no GitHub Pages sem configuração extra.
export function ir(caminho: string) {
  window.location.hash = '#' + caminho;
  window.scrollTo(0, 0);
}

export function useRota(): string {
  const ler = () => window.location.hash.replace(/^#/, '') || '/';
  const [rota, setRota] = useState(ler);
  useEffect(() => {
    const f = () => setRota(ler());
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, []);
  return rota;
}
