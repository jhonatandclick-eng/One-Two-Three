import { useRef, useState } from 'react';
import { motorSugerido, type MotorId } from '../engines/stt';
import { nomeDaVoz } from '../engines/tts';
import { opcao } from '../lib/plan';
import { apagarTudo, atualizar, exportarJson, importarJson, useEstado, type Tema } from '../lib/store';
import { Icone } from '../ui/Icones';
import { ir } from '../ui/rotas';
import { TestarMicrofone } from './Microfone';

export function Ajustes() {
  const e = useEstado();
  const [testando, setTestando] = useState(false);
  const [msg, setMsg] = useState('');
  const [confirmar, setConfirmar] = useState(false);
  const arquivo = useRef<HTMLInputElement>(null);
  const motor: MotorId = e.motor ?? motorSugerido();

  const exportar = () => {
    const blob = new Blob([exportarJson()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `progresso-ingles-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importar = async (f: File | undefined) => {
    if (!f) return;
    try {
      importarJson(await f.text());
      setMsg('Progresso importado com sucesso.');
    } catch {
      setMsg('Não consegui ler esse arquivo. Use um arquivo exportado por este app.');
    }
  };

  const temas: { id: Tema; rotulo: string }[] = [
    { id: 'sistema', rotulo: 'Automático' },
    { id: 'claro', rotulo: 'Claro' },
    { id: 'escuro', rotulo: 'Escuro' },
  ];

  return (
    <div className="tela">
      <h1>Ajustes</h1>

      <div className="cartao">
        <h3>Tema</h3>
        <div className="linha" role="radiogroup">
          {temas.map((t) => (
            <button key={t.id} role="radio" aria-checked={e.tema === t.id}
              className={`botao pequeno${e.tema === t.id ? ' suave' : ''}`} style={{ flex: 1 }}
              onClick={() => atualizar((s) => ({ ...s, tema: t.id }))}>{t.rotulo}</button>
          ))}
        </div>
      </div>

      <div className="cartao">
        <h3>Plano</h3>
        <p className="pequeno secundario">{e.plano ? `${opcao(e.plano.id).rotulo} · ${opcao(e.plano.id).ritmo}` : 'Nenhum plano escolhido'}</p>
        <button className="botao pequeno" onClick={() => ir('/plano')}><Icone nome="calendario" /> Ver ou mudar o plano</button>
      </div>

      <div className="cartao">
        <h3>Motor de voz</h3>
        <p className="pequeno secundario">Como o app ouve você. {e.motor ? 'Escolhido no teste do microfone.' : 'Ainda não testado.'}</p>
        <div className="coluna" role="radiogroup">
          {([['webspeech', 'Reconhecimento do navegador', 'Rápido. No iPhone precisa do Ditado ativado.'],
            ['whisper', 'Whisper no aparelho', 'Baixa uma vez (~40 MB) e funciona offline. Um pouco mais lento.']] as const).map(([id, nome, desc]) => (
            <button key={id} role="radio" aria-checked={motor === id}
              className={`cartao escolha-plano${motor === id ? ' marcado' : ''}`} style={{ padding: 14 }}
              onClick={() => atualizar((s) => ({ ...s, motor: id }))}>
              <div className="linha entre"><strong>{nome}</strong>{motor === id && <Icone nome="check" />}</div>
              <span className="pequeno secundario">{desc}</span>
            </button>
          ))}
        </div>
        <p className="pequeno secundario">Voz do app: {nomeDaVoz()}</p>
        <button className="botao pequeno" onClick={() => setTestando(!testando)}><Icone nome="mic" /> {testando ? 'Fechar teste' : 'Testar microfone'}</button>
        {testando && <TestarMicrofone />}
      </div>

      <div className="cartao">
        <h3>Seu progresso</h3>
        <p className="pequeno secundario">Tudo fica guardado só neste aparelho. Faça um backup de vez em quando.</p>
        <button className="botao pequeno" onClick={exportar}><Icone nome="baixar" /> Exportar progresso</button>
        <button className="botao pequeno" onClick={() => arquivo.current?.click()}><Icone nome="subir" /> Importar progresso</button>
        <input ref={arquivo} type="file" accept="application/json,.json" hidden onChange={(ev) => importar(ev.target.files?.[0])} />
        {msg && <p className="pequeno" role="status">{msg}</p>}
        {!confirmar ? (
          <button className="botao pequeno perigo" onClick={() => setConfirmar(true)}><Icone nome="lixo" /> Apagar meus dados</button>
        ) : (
          <div className="cartao dica">
            <p className="pequeno"><strong>Tem certeza?</strong> Isso apaga todo o progresso deste aparelho e não dá para desfazer (a não ser que você tenha um backup).</p>
            <div className="linha">
              <button className="botao pequeno perigo" onClick={() => { apagarTudo(); setConfirmar(false); ir('/'); }}>Sim, apagar tudo</button>
              <button className="botao pequeno" onClick={() => setConfirmar(false)}>Cancelar</button>
            </div>
          </div>
        )}
      </div>

      <p className="pequeno secundario">Gratuito, sem login e sem anúncios. A nota de pronúncia avalia se as palavras foram entendidas, não o sotaque fino.</p>
    </div>
  );
}
