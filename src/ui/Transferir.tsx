import { useState } from 'react';
import { aplicarCodigo, gerarCodigo, temProgresso } from '../lib/store';
import { Icone } from './Icones';

/** Botão "Copiar código": põe o progresso na área de transferência. */
export function CopiarCodigo({ classe = 'botao pequeno' }: { classe?: string }) {
  const [msg, setMsg] = useState('');
  const [codigo, setCodigo] = useState('');

  const copiar = async () => {
    setMsg('');
    const promessa = gerarCodigo();
    let c = '';
    try {
      // O Safari só deixa copiar "dentro" do toque; o ClipboardItem aceita o texto ainda sendo gerado.
      if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
        const blob = promessa.then((t) => new Blob([t], { type: 'text/plain' }));
        await navigator.clipboard.write([new ClipboardItem({ 'text/plain': blob })]);
        c = await promessa;
      } else {
        c = await promessa;
        await navigator.clipboard.writeText(c);
      }
      setCodigo('');
      setMsg('Código copiado. Agora abra o app pelo atalho (ou no outro aparelho) e toque em "Colar código".');
    } catch {
      setCodigo(c || (await promessa));
      setMsg('Não consegui copiar sozinho. Selecione o código abaixo, copie e cole no outro lugar.');
    }
  };

  return (
    <div className="coluna">
      <button className={classe} onClick={copiar}><Icone nome="baixar" /> Copiar código do progresso</button>
      {msg && <p className="pequeno" role="status">{msg}</p>}
      {codigo && <textarea className="campo codigo" readOnly value={codigo} rows={4} onFocus={(e) => e.currentTarget.select()} />}
    </div>
  );
}

/** Botão "Colar código": lê o código e substitui o progresso deste perfil. */
export function ColarCodigo({ aoAplicar }: { aoAplicar?: () => void }) {
  const [manual, setManual] = useState(false);
  const [texto, setTexto] = useState('');
  const [msg, setMsg] = useState('');
  const [confirmar, setConfirmar] = useState<string | null>(null);

  const aplicar = async (c: string) => {
    try {
      await aplicarCodigo(c);
      setMsg('Progresso recuperado!');
      setConfirmar(null);
      setManual(false);
      aoAplicar?.();
    } catch {
      setMsg('Esse código não funcionou. Confira se copiou ele inteiro.');
    }
  };

  const pedir = (c: string) => (temProgresso() ? setConfirmar(c) : aplicar(c));

  const colar = async () => {
    setMsg('');
    try {
      const c = await navigator.clipboard.readText();
      if (!/OTT[01]-/.test(c)) throw new Error('vazio');
      pedir(c);
    } catch {
      setManual(true);
      setMsg('Toque e segure na caixa abaixo, escolha "Colar" e depois "Usar este código".');
    }
  };

  return (
    <div className="coluna">
      <button className="botao pequeno" onClick={colar}><Icone nome="subir" /> Colar código do progresso</button>
      {manual && (
        <>
          <textarea className="campo codigo" rows={4} value={texto} placeholder="Cole aqui o código (começa com OTT)"
            onChange={(e) => setTexto(e.target.value)} />
          <button className="botao pequeno suave" disabled={!texto.trim()} onClick={() => pedir(texto)}>Usar este código</button>
        </>
      )}
      {confirmar && (
        <div className="cartao dica">
          <p className="pequeno"><strong>Substituir o progresso?</strong> O progresso que está aqui agora será trocado pelo do código.</p>
          <div className="linha">
            <button className="botao pequeno perigo" onClick={() => aplicar(confirmar)}>Sim, substituir</button>
            <button className="botao pequeno" onClick={() => setConfirmar(null)}>Cancelar</button>
          </div>
        </div>
      )}
      {msg && <p className="pequeno" role="status">{msg}</p>}
    </div>
  );
}
