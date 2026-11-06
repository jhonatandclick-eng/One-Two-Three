import { useRef, useState } from 'react';
import { motorSugerido, type MotorId } from '../engines/stt';
import { nomeDaVoz } from '../engines/tts';
import { opcao } from '../lib/plan';
import {
  apagarPerfil, apagarTudo, atualizar, criarPerfil, exportarJson, importarJson, renomearPerfil, trocarPerfil,
  useEstado, usePerfis, type Tema,
} from '../lib/store';
import { Icone } from '../ui/Icones';
import { ColarCodigo, CopiarCodigo } from '../ui/Transferir';
import { ir } from '../ui/rotas';
import { TestarMicrofone } from './Microfone';

function Perfis() {
  const p = usePerfis();
  const [novo, setNovo] = useState<string | null>(null);
  const [editando, setEditando] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [apagar, setApagar] = useState<string | null>(null);
  const rotulo = (n: string) => n || 'Principal';

  return (
    <div className="cartao">
      <h3>Quem está estudando</h3>
      <p className="pequeno secundario">Cada pessoa que usa este aparelho pode ter o seu perfil, com progresso separado. Em outro celular o progresso já é separado.</p>
      <div className="coluna">
        {p.lista.map((x) => {
          const atual = x.id === p.atual;
          return (
            <div key={x.id} className={`cartao escolha-plano${atual ? ' marcado' : ''}`} style={{ padding: 10 }}>
              {editando === x.id ? (
                <div className="linha">
                  <input className="campo" value={nome} autoFocus maxLength={24} placeholder="Nome"
                    onChange={(e) => setNome(e.target.value)} style={{ flex: 1 }} />
                  <button className="botao pequeno suave" onClick={() => { renomearPerfil(x.id, nome); setEditando(null); }}>Salvar</button>
                </div>
              ) : (
                <div className="perfil">
                  <span className="avatar" aria-hidden="true">{rotulo(x.nome).charAt(0).toUpperCase()}</span>
                  <div className="coluna" style={{ gap: 0, flex: 1 }}>
                    <strong>{rotulo(x.nome)}</strong>
                    {atual && <span className="pequeno secundario">Em uso agora</span>}
                  </div>
                  {!atual && <button className="botao pequeno" onClick={() => trocarPerfil(x.id)}>Usar</button>}
                  <button className="icone-botao" aria-label={`Mudar o nome de ${rotulo(x.nome)}`}
                    onClick={() => { setEditando(x.id); setNome(x.nome); }}><Icone nome="editar" tamanho={18} /></button>
                  {!atual && <button className="icone-botao" aria-label={`Apagar o perfil ${rotulo(x.nome)}`}
                    onClick={() => setApagar(x.id)}><Icone nome="lixo" tamanho={18} /></button>}
                </div>
              )}
              {apagar === x.id && (
                <div className="cartao dica">
                  <p className="pequeno"><strong>Apagar {rotulo(x.nome)}?</strong> O progresso desse perfil some e não dá para desfazer.</p>
                  <div className="linha">
                    <button className="botao pequeno perigo" onClick={() => { apagarPerfil(x.id); setApagar(null); }}>Sim, apagar</button>
                    <button className="botao pequeno" onClick={() => setApagar(null)}>Cancelar</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {novo === null ? (
        <button className="botao pequeno" onClick={() => setNovo('')}>+ Adicionar pessoa</button>
      ) : (
        <div className="linha">
          <input className="campo" value={novo} autoFocus maxLength={24} placeholder="Nome da pessoa"
            onChange={(e) => setNovo(e.target.value)} style={{ flex: 1 }} />
          <button className="botao pequeno principal" disabled={!novo.trim()}
            onClick={() => { criarPerfil(novo); setNovo(null); ir('/'); }}>Criar</button>
        </div>
      )}
    </div>
  );
}

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

      <Perfis />
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
        <h3>Levar o progresso para outro lugar</h3>
        <p className="pequeno secundario">
          No iPhone, o app aberto no Safari e o app aberto pelo atalho da Tela de Início guardam o progresso separados.
          Para levar de um para o outro (ou para outro celular): copie o código aqui e cole lá.
        </p>
        <CopiarCodigo />
        <ColarCodigo aoAplicar={() => setMsg('')} />
      </div>

      <div className="cartao">
        <h3>Backup em arquivo</h3>
        <p className="pequeno secundario">Tudo fica guardado só neste aparelho. Faça um backup de vez em quando, principalmente antes de apagar o atalho da Tela de Início: apagar o atalho apaga o progresso dele.</p>
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
      <p className="pequeno secundario">Versão de {__VERSAO__}. O app se atualiza sozinho quando você o abre.</p>
    </div>
  );
}
