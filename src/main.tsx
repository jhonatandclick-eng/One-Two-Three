import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App';
import './styles.css';

// Atualização automática: o app procura versão nova ao abrir, ao voltar para ele e a cada hora.
// Quando acha, instala e recarrega sozinho. Ninguém precisa apagar o atalho para atualizar.
registerSW({
  immediate: true,
  onRegisteredSW(_url, reg) {
    if (!reg) return;
    const procurar = () => { if (navigator.onLine) reg.update().catch(() => {}); };
    let saiuEm = 0;
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') saiuEm = Date.now();
      // Só procura se ficou fora um tempinho, para não recarregar no meio de uma troca rápida de app.
      else if (Date.now() - saiuEm > 2 * 60 * 1000) procurar();
    });
    setInterval(procurar, 60 * 60 * 1000);
    procurar();
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
