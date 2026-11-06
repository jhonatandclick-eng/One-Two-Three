# One Two Three

Link do app: https://jhonatandclick-eng.github.io/One-Two-Three/

App gratuito para brasileiros aprenderem a **falar e ler inglês**, com nota de pronúncia na hora.
Funciona no navegador do celular (iPhone e Android), sem login, sem anúncios e sem servidor:
o progresso fica guardado só no aparelho.

## O que o app faz

- **Ouvir e repetir**: o app fala, você repete no microfone e recebe uma nota de 0 a 100, com as palavras erradas marcadas.
- **Pronúncia "do jeito que se fala"**: embaixo de cada palavra aparece como ela soa em português (ex.: *juice* → **djus**).
- **Leitura em voz alta**, **tradução**, **lembrança ativa** (você vê em português e fala em inglês), **ditado** e **diálogos**.
- **Repetição espaçada** (caixas de 1, 3, 7, 14 e 30 dias): o que você erra volta no dia seguinte.
- **Plano por prazo** (1, 3, 6 meses ou sem prazo), XP, meta diária, sequência de dias e ranking pessoal.
- Níveis: **Iniciante** (12 unidades, 144 palavras) → **Intermediário** (libera com média de 80%) → Avançado (em breve).
- Backup: exportar e importar o progresso em Ajustes.

A nota avalia se as palavras foram **entendidas**, não o sotaque fino.

## Como rodar no computador

Precisa do [Node.js](https://nodejs.org) (versão 20 ou mais nova).

```bash
npm install
```

```bash
npm run dev
```

Abra o endereço que aparecer (ex.: http://localhost:5173).

Para abrir no celular na mesma rede Wi-Fi: `npm run dev -- --host` e use o endereço "Network".
**Atenção:** o microfone no celular só funciona com HTTPS, então o teste real no iPhone é feito pelo link do GitHub Pages.

Outros comandos:

```bash
npm test
```

```bash
npm run build
```

## Como editar o conteúdo

O conteúdo fica em `src/content/`:

- `iniciante.json`: unidades com palavras (`en`, `pt`, `fala`, `ipa`, `exemplo`, `gancho`) e frases de leitura.
- `intermediario.json`: frases, texto de leitura, e diálogo de cada unidade.

Regras:

- `fala` é a pronúncia escrita como soa em português, **escrita à mão**.
- Nas frases, `fala` é uma lista com **um item por palavra** do texto em inglês, na mesma ordem.
- Rode `npm test`: ele avisa se alguma frase ficou com a quantidade de pronúncias diferente da de palavras.

## Como publicar uma atualização

Toda vez que você envia as mudanças para o GitHub (branch `main`), o GitHub Actions roda os testes,
gera o app e publica no GitHub Pages sozinho, em 1 a 2 minutos.

```bash
git add .
```

```bash
git commit -m "Descreva a mudança"
```

```bash
git push
```

Primeira vez: no repositório do GitHub, vá em **Settings › Pages › Source: GitHub Actions**.

## Como abrir no iPhone

1. Abra o link do app no **Safari**.
2. Quando pedir, toque em **Permitir** o microfone.
3. Para o reconhecimento do navegador funcionar, ative o Ditado: **Ajustes › Geral › Teclado › Ativar Ditado**.
4. (Opcional) **Compartilhar › Adicionar à Tela de Início**. Pelo atalho, o app usa o reconhecimento que roda no
   próprio aparelho (baixa uma vez, cerca de 40 MB).

## Por dentro (para quem programa)

- Vite + React + TypeScript, PWA com `vite-plugin-pwa`.
- Voz do app: `speechSynthesis` (en-US). Reconhecimento: Web Speech API, com reserva em Whisper
  (`@huggingface/transformers`, `whisper-tiny.en`) rodando num Web Worker.
- Motores trocáveis: `TtsEngine` (`src/engines/tts.ts`), `SttEngine` (`src/engines/stt.ts`) e `Scorer` (`src/engines/scorer.ts`).
- Avaliação: normalização (contrações, números), alinhamento de palavras por programação dinâmica e Double Metaphone.
