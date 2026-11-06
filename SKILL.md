---
name: app-ingles-pronuncia
description: Use para criar do zero, no Claude Code, o app web gratuito de inglês com nota de pronúncia, níveis iniciante e intermediário, repetição espaçada e plano por prazo, e publicá-lo no GitHub Pages.
---

# App de inglês com pronúncia — especificação completa

Você vai construir, do zero, um app web (PWA) para brasileiros aprenderem a FALAR e LER inglês. A pessoa que pediu provavelmente não é programadora: converse com ela em português simples, sem jargão, e explique cada passo que ela mesma precisar fazer (criar conta, clicar em botões, permitir microfone).

## Regras que não podem ser quebradas

1. **Custo zero.** Nada de API paga, chave de API, servidor, banco de dados na nuvem, login ou analytics. Tudo roda no navegador do celular.
2. **Hospedagem gratuita** no GitHub Pages, com deploy automático por GitHub Actions.
3. **Dados só no aparelho** (IndexedDB/localStorage), com botão de exportar e importar o progresso (arquivo .json) para backup.
4. **Celular primeiro**, pensado para iPhone (Safari) e Android (Chrome). Largura de referência: 390 px.
5. **Motores trocáveis.** Voz, reconhecimento de fala e avaliação ficam atrás de interfaces (`TtsEngine`, `SttEngine`, `Scorer`), para que no futuro dê para trocar por um serviço pago sem reescrever o app.
6. **Fora do escopo por enquanto:** conversa livre com IA (nível avançado), login, ranking entre usuários, publicação em App Store ou Play Store. Deixe o nível "Avançado" visível como "Em breve".

## Stack

- Vite + React + TypeScript, com `vite-plugin-pwa` (manifest, ícones, funciona offline depois da primeira visita).
- CSS próprio com variáveis de tema. Não use biblioteca de componentes pesada.
- Testes com Vitest para a lógica (pontuação, repetição espaçada, plano).
- `base` do Vite configurado para o caminho do repositório no GitHub Pages.

## Motores de voz

### Voz do app (TTS)
- `window.speechSynthesis`, com `lang: en-US`. Escolha a melhor voz en-US disponível; dê preferência às vozes "Enhanced/Premium/Natural" quando existirem.
- Dois botões: **Ouvir** (velocidade 0.95) e **Devagar** (0.6).

### Ouvir a pessoa (STT), com dois motores e detecção automática
1. **Principal:** Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`), `lang: en-US`, `interimResults: false`, `maxAlternatives: 5`. Na avaliação, use a alternativa que mais se aproxima do texto esperado.
2. **Reserva:** Whisper rodando no próprio navegador com `@huggingface/transformers` (modelo pequeno, só inglês, por exemplo `whisper-tiny.en` ou `whisper-base.en`). O áudio é gravado com `MediaRecorder`/`getUserMedia`. O modelo é baixado uma vez, fica em cache e roda em um Web Worker para não travar a tela. Mostre o progresso do download.
- **Atenção ao iPhone:** no Safari, o reconhecimento da Web Speech API exige o Ditado ativado (Ajustes › Geral › Teclado). Ele costuma NÃO funcionar quando o site é aberto pelo atalho da Tela de Início (modo standalone). Detecte esse modo (`navigator.standalone` ou `matchMedia('(display-mode: standalone)')`) e, nele, use direto o motor reserva.
- Crie uma tela **"Testar microfone"** no primeiro uso. Ela tenta o motor principal e, se falhar, cai para o reserva. Guarde qual funcionou e mostre a escolha em Ajustes, com opção de trocar manualmente.

### Avaliação da pronúncia (Scorer)
- Normalize o texto esperado e o reconhecido: minúsculas, sem pontuação, contrações expandidas (`I'm` = `i am`), números escritos por extenso.
- Alinhe as duas sequências de palavras por programação dinâmica (alinhamento tipo Levenshtein no nível das palavras).
- Classifique cada palavra esperada:
  - **certa**: igual, ou com similaridade alta (distância de edição pequena ou mesmo código fonético Double Metaphone);
  - **quase**: parecida, mas diferente;
  - **errada / não ouvida**: trocada ou ausente.
- Nota de 0 a 100 = média ponderada (certa = 1, quase = 0.5, errada = 0). Se o motor devolver um índice de confiança, use para ajustar levemente.
- Mensagens: ≥ 90 "Excelente!", 70–89 "Quase lá!", < 70 "Vamos tentar de novo".
- Mostre também "Você disse: …", com as palavras erradas destacadas.
- Seja honesto na interface: a nota avalia se as palavras foram entendidas, não o sotaque fino.
- Para palavras soltas (nível iniciante), compare a palavra e as alternativas reconhecidas; aceite variações próximas como "quase".
- Escreva testes unitários do Scorer com casos reais de erro de brasileiros ("a orange" no lugar de "an orange", "juices" no lugar de "juice", palavra omitida).

## Pronúncia "do jeito que se fala"

TODA palavra e TODA frase mostradas no app têm, embaixo de cada palavra, a pronúncia escrita como soa em português, num selo azul. Exemplo:

| Inglês | Como se fala |
|---|---|
| I | ai |
| would | uud |
| like | laik |
| an | én |
| orange | ó-rindj |
| juice | djus |

- Esse campo (`fala`) é escrito à mão no arquivo de conteúdo, palavra por palavra, pensando em um falante do português brasileiro. Nunca gere por algoritmo.
- Guarde também o IPA (`ipa`), exibido só em "ver detalhes".
- Revise toda a pronúncia aportuguesada ao terminar o conteúdo; ela é um dos recursos principais do app.

## Metodologia de memorização (obrigatória)

1. **Repetição espaçada (sistema Leitner):** caixas com intervalos de 1, 3, 7, 14 e 30 dias. Acertou (nota ≥ 80), a palavra sobe uma caixa. Errou, volta para a caixa 1 e reaparece no dia seguinte. A tela "Revisar erros" e o início de cada sessão puxam primeiro o que está vencido.
2. **Lembrança ativa:** um exercício mostra a palavra em português e a pessoa precisa FALAR em inglês sem ver a resposta. Depois o app mostra a resposta, a pronúncia e a nota.
3. **Associação:** cada palavra vem com uma frase-exemplo curta do dia a dia (inglês + tradução) e, quando fizer sentido, um "gancho" em português que ajude a lembrar. Exemplo: juice → "djus" → "deu suco". Ganchos ruins ou forçados não entram; o campo é opcional.

## Conteúdo (arquivos JSON em `src/content/`)

Formato de uma palavra:

```json
{ "id": "fruit-orange", "en": "orange", "pt": "laranja", "fala": "ó-rindj", "ipa": "ˈɔːr.ɪndʒ",
  "exemplo": { "en": "I like orange juice.", "pt": "Eu gosto de suco de laranja.",
               "fala": ["ai", "laik", "ó-rindj", "djus"] },
  "gancho": "" }
```

- **Iniciante:** pelo menos 12 unidades temáticas com 12 palavras cada (cumprimentos, números, cores, frutas, comida, família, casa, corpo, roupas, animais, tempo e dias, verbos do dia a dia), além de frases curtas de leitura por unidade.
- **Intermediário:** frases compostas, textos curtos (60–120 palavras) com leitura em voz alta, ditados e diálogos prontos em que a pessoa faz um dos papéis. O conteúdo cobre situações reais: restaurante, viagem, trabalho, compras, apresentações.
- O inglês deve ser natural e correto (inglês americano). Revise a gramática e as traduções.

## Exercícios

- **Ouvir e repetir:** palavra ou frase + Ouvir/Devagar + microfone + nota + palavras marcadas + dica.
- **Leitura:** o texto aparece com a pronúncia embaixo; a pessoa lê em voz alta e recebe nota por palavra.
- **Tradução:** de português para inglês (falando ou escolhendo opções) e de inglês para português (escolha).
- **Lembrança ativa:** como descrita acima.
- **Ditado (intermediário):** o app fala, a pessoa digita, e o app corrige.
- **Diálogo (intermediário):** o app fala uma parte, a pessoa responde a sua e recebe nota.
- Cada lição tem cerca de 10 itens, misturando tipos, com revisões vencidas no começo.

## Níveis, progresso e motivação

- Níveis: Iniciante → Intermediário (liberado com média ≥ 80% nas unidades do Iniciante) → Avançado ("Em breve").
- XP por exercício (certo +10, quase +5), meta diária de XP, sequência de dias, recordes pessoais (maior sequência, mais XP num dia, palavras dominadas = caixa 4 ou mais).
- Tela **Progresso** com o ranking pessoal: semana atual contra as anteriores, gráfico simples de XP por dia, palavras por caixa.

## Plano por prazo

Tela **"Seu plano"** com a pergunta: "Em quanto tempo você quer chegar ao nível intermediário?"

| Opção | Ritmo | Minutos/dia | Palavras novas/semana |
|---|---|---|---|
| 1 mês | Intensivo | 45 | ~35 |
| 3 meses | Progressivo (padrão) | 20 | ~15 |
| 6 meses | Tranquilo | 10 | ~8 |
| Sem prazo | No seu tempo | 5 | ~4 |

- Mostre a data prevista calculada a partir de hoje (mês/ano).
- O plano define a meta diária e quantas palavras novas entram por dia.
- Toda semana o app recalcula a previsão pelo desempenho real e avisa com gentileza se a pessoa está adiantada ou atrasada. Deixe claro que é uma estimativa.
- No Início, mostre algo como "Plano de 3 meses · semana 2 de 12 · Ajustar".

## Visual (seguir à risca)

- Fonte: Plus Jakarta Sans (Google Fonts), pesos 400–800. Títulos em 800 com letter-spacing -0.02em.
- Tema claro e tema escuro: segue o sistema por padrão, com troca manual em Ajustes.
- Paleta:
  - **Claro:** fundo `#F6F6F3`, superfície `#FFFFFF`, texto `#17181C`, texto secundário `#5A5C66`, linha `#E4E4DF`, destaque `#3B4FD8`, destaque suave `#E8EBFC`, texto destaque `#2F3FB8`, sequência `#A4480A` sobre `#FDEEDD`, certo `#0F6E64` sobre `#DDF3EF`, errado `#B03A0A` sobre `#FDE6D8`, dica sobre `#FFF6E5`.
  - **Escuro:** fundo `#111216`, superfície `#1B1C22`, texto `#F1F1F3`, texto secundário `#A3A5AE`, linha `#2C2D35`, destaque `#7C8CF5` (texto sobre ele `#111216`), destaque suave `#23264A`, texto destaque `#AEB8FB`, sequência `#F5A25B` sobre `#3A2714`, certo `#5ED3C2` sobre `#13302C`, errado `#FF9D6B` sobre `#3A1E12`, dica sobre `#2A2416`.
- Cantos arredondados (cartões 18–24 px, botões 14–18 px), bordas de 1 px, sem sombras pesadas, sem gradientes, sem emoji (ícones SVG de traço).
- Áreas de toque de no mínimo 44 px. Contraste mínimo de 4.5:1. Erro marcado com cor E com sublinhado ondulado, nunca só com cor.

### Telas
- **Início:** saudação; selo de sequência; cartão da meta do dia (barra de XP + linha do plano); cartão em destaque com a lição atual (nível · unidade, nome, progresso, botão "Continuar lição"); grade de 2 colunas "Praticar" (Ouvir e repetir, Leitura, Tradução, Revisar erros com contador); níveis (atual, e o próximo bloqueado com o critério); barra inferior Início / Lições / Progresso / Ajustes.
- **Exercício "Ouça e repita":** botão fechar, barra de progresso da lição (7/10), título do tipo de exercício, cartão com as palavras em inglês e a pronúncia embaixo de cada uma, tradução, botões Ouvir/Devagar; depois de falar, o cartão de resultado (círculo com a nota, mensagem, palavras marcadas, "Você disse", dica); embaixo, botão redondo do microfone e botão principal "Continuar".
- **Seu plano**, **Lições** (unidades por nível com progresso), **Progresso**, **Ajustes** (tema, motor de voz, testar microfone, exportar/importar progresso, apagar dados com confirmação).
- **Primeiro uso:** boas-vindas → escolher o plano → testar o microfone (com instruções de Ditado no iPhone) → primeira lição.

## Como trabalhar (Claude Code)

1. Pergunte o nome que a pessoa quer dar ao app e o usuário dela no GitHub. Se ela não tiver conta, explique como criar uma gratuita.
2. Crie o projeto e mostre como rodar localmente (`npm install`, `npm run dev`). Para testar no celular na mesma rede Wi-Fi, use `--host`. Avise que o microfone no celular exige HTTPS, então o teste real no iPhone é feito pelo link do GitHub Pages.
3. Construa nesta ordem, conferindo cada etapa antes de seguir:
   a) estrutura, temas e navegação;
   b) motores de voz + Scorer + testes;
   c) conteúdo do Iniciante;
   d) exercícios e repetição espaçada;
   e) plano, XP, sequência e progresso;
   f) conteúdo e exercícios do Intermediário;
   g) PWA e deploy.
4. Rode os testes e o build (`npm run build`) sem erros antes de publicar.
5. Configure o GitHub Actions para publicar no GitHub Pages e guie a pessoa, clique a clique, para ativar o Pages (Settings › Pages › Source: GitHub Actions).
6. Entregue o link final e um passo a passo curto para abrir no iPhone: Safari → link → permitir microfone → (opcional) Compartilhar › Adicionar à Tela de Início.
7. Termine com um README em português: o que o app faz, como rodar, como editar o conteúdo e como publicar uma atualização.
