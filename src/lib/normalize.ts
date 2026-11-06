// Normalização de texto para comparar o que era esperado com o que foi reconhecido.

const CONTRACOES: Record<string, string> = {
  "i'm": 'i am', "you're": 'you are', "we're": 'we are', "they're": 'they are',
  "he's": 'he is', "she's": 'she is', "it's": 'it is', "that's": 'that is',
  "what's": 'what is', "there's": 'there is', "where's": 'where is', "how's": 'how is',
  "who's": 'who is', "let's": 'let us',
  "i've": 'i have', "you've": 'you have', "we've": 'we have', "they've": 'they have',
  "i'll": 'i will', "you'll": 'you will', "we'll": 'we will', "they'll": 'they will',
  "he'll": 'he will', "she'll": 'she will', "it'll": 'it will',
  "i'd": 'i would', "you'd": 'you would', "we'd": 'we would', "they'd": 'they would',
  "he'd": 'he would', "she'd": 'she would',
  "don't": 'do not', "doesn't": 'does not', "didn't": 'did not',
  "isn't": 'is not', "aren't": 'are not', "wasn't": 'was not', "weren't": 'were not',
  "can't": 'can not', cannot: 'can not', "won't": 'will not', "wouldn't": 'would not',
  "couldn't": 'could not', "shouldn't": 'should not', "haven't": 'have not',
  "hasn't": 'has not', "o'clock": 'oclock',
  gonna: 'going to', wanna: 'want to',
};

const UNIDADES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const DEZENAS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

export function numeroPorExtenso(n: number): string {
  if (n < 20) return UNIDADES[n];
  if (n < 100) return DEZENAS[Math.floor(n / 10)] + (n % 10 ? ' ' + UNIDADES[n % 10] : '');
  if (n < 1000) {
    const resto = n % 100;
    return UNIDADES[Math.floor(n / 100)] + ' hundred' + (resto ? ' ' + numeroPorExtenso(resto) : '');
  }
  if (n < 1_000_000) {
    const resto = n % 1000;
    return numeroPorExtenso(Math.floor(n / 1000)) + ' thousand' + (resto ? ' ' + numeroPorExtenso(resto) : '');
  }
  return String(n);
}

function semAcentos(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Normaliza UMA palavra (como aparece na tela) em zero ou mais palavras comparáveis. */
export function normalizarPalavra(bruta: string): string[] {
  let p = semAcentos(bruta.toLowerCase()).replace(/[’‘`´]/g, "'");
  p = p.replace(/^[^a-z0-9']+|[^a-z0-9']+$/g, '');
  if (!p) return [];
  if (CONTRACOES[p]) return CONTRACOES[p].split(' ');
  // possessivo / contrações não listadas: "mom's" -> "moms"
  p = p.replace(/'/g, '');
  if (/^\d+$/.test(p)) return numeroPorExtenso(parseInt(p, 10)).split(' ');
  // "8th", "1st"... mantém só os dígitos por extenso
  const ordinal = p.match(/^(\d+)(st|nd|rd|th)$/);
  if (ordinal) return numeroPorExtenso(parseInt(ordinal[1], 10)).split(' ');
  const partes = p.split(/[^a-z0-9]+/).filter(Boolean);
  return partes.flatMap((x) => (/^\d+$/.test(x) ? numeroPorExtenso(parseInt(x, 10)).split(' ') : [x]));
}

/** Divide o texto como ele aparece na tela (por espaços). */
export function palavrasDaTela(texto: string): string[] {
  return texto.trim().split(/\s+/).filter(Boolean);
}

/** Normaliza um texto inteiro para uma lista de palavras. */
export function normalizarTexto(texto: string): string[] {
  const t = texto.replace(/[-–—:/]/g, ' ');
  return palavrasDaTela(t).flatMap(normalizarPalavra);
}
