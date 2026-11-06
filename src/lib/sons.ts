// Dicas de pronúncia para brasileiros, tiradas dos símbolos fonéticos (IPA) de cada palavra.
// Cada regra aponta um som do inglês que costuma sair "aportuguesado" e diz como fazer.

export interface DicaSom {
  som: string; // nome curto do som, ex.: "th"
  dica: string;
}

interface Regra extends DicaSom {
  teste: (ipa: string, en: string) => boolean;
}

const CONSOANTE_FINAL = /(p|b|t|d|k|ɡ|g|f|v|s|z|ʃ|ʒ|tʃ|dʒ|θ|ð)$/;

const REGRAS: Regra[] = [
  {
    som: 'th sem voz',
    teste: (ipa) => ipa.includes('θ'),
    dica: 'Ponha a ponta da língua entre os dentes e sopre o ar. Não é "t", nem "f", nem "s".',
  },
  {
    som: 'th com voz',
    teste: (ipa) => ipa.includes('ð'),
    dica: 'Língua entre os dentes, mas com a garganta vibrando. Não troque por "d".',
  },
  {
    som: 'h no começo',
    teste: (ipa) => /^ˈ?h/.test(ipa),
    dica: 'O "h" do inglês é só um sopro, como o "r" de "rato" bem suave. Não deixe mudo.',
  },
  {
    som: 'r do inglês',
    teste: (ipa) => /ɹ|r/.test(ipa.replace(/ɜːr|ər|ɑːr|ɔːr/g, '')) && /^ˈ?(ɹ|r)|[^ɜəɑɔː](ɹ|r)/.test(ipa),
    dica: 'Dobre a ponta da língua um pouco para trás, sem encostar no céu da boca. Não vibre como no "r" de "caro".',
  },
  {
    som: 'r depois de vogal',
    teste: (ipa) => /ɜːr|ər|ɑːr|ɔːr|ɝ|ɚ/.test(ipa),
    dica: 'No inglês americano o "r" depois da vogal aparece: a língua sobe e curva para trás no fim do som.',
  },
  {
    som: 'ng no final',
    teste: (ipa) => /ŋ$/.test(ipa),
    dica: 'Termine com o som saindo pelo nariz, sem acrescentar "gui" ou "gue" no fim.',
  },
  {
    som: 'l no final',
    teste: (ipa) => /l$/.test(ipa),
    dica: 'A ponta da língua encosta atrás dos dentes de cima. Não deixe virar "u" (como em "Brasiu").',
  },
  {
    som: 'm ou n no final',
    teste: (ipa) => /[mn]$/.test(ipa),
    dica: 'No "m" final feche bem os lábios; no "n" final encoste a língua atrás dos dentes. Não deixe o som só "nasal".',
  },
  {
    som: 'final em consoante',
    teste: (ipa) => CONSOANTE_FINAL.test(ipa),
    dica: 'Termine a palavra na consoante, sem acrescentar um "i" no fim (por exemplo, "bed" não é "bédi").',
  },
  {
    som: 'a aberto',
    teste: (ipa) => ipa.includes('æ'),
    dica: 'Abra bem a boca, entre o "é" e o "a" (como em "cat"). É mais aberto que o nosso "é".',
  },
  {
    som: 'i curto',
    teste: (ipa) => /ɪ/.test(ipa.replace(/aɪ|ɔɪ|eɪ|ɪə|ɪr/g, '')),
    dica: 'É um "i" curto e relaxado, quase um "ê" fechado (como em "sit"). Não estique.',
  },
  {
    som: 'i longo',
    teste: (ipa) => ipa.includes('iː'),
    dica: 'É um "i" comprido, com os lábios esticados como num sorriso (como em "see").',
  },
  {
    som: 'u longo',
    teste: (ipa) => ipa.includes('uː'),
    dica: 'Um "u" comprido, com os lábios bem arredondados para a frente.',
  },
  {
    som: 'som neutro',
    teste: (ipa) => /ʌ|ə/.test(ipa),
    dica: 'O som "â" é curto e relaxado, com a boca meio aberta. Não precisa caprichar na vogal.',
  },
  {
    som: 'v',
    teste: (ipa) => ipa.includes('v'),
    dica: 'Encoste os dentes de cima no lábio de baixo e vibre. Não troque por "b".',
  },
  {
    som: 'w',
    teste: (ipa) => /^ˈ?w|[^a-z]w/.test(ipa),
    dica: 'Comece com os lábios em bico, como um "u" rápido que desliza para a vogal.',
  },
  {
    som: 'z',
    teste: (ipa) => /z$/.test(ipa),
    dica: 'O "s" no fim aqui soa como "z", com vibração (como um zumbido).',
  },
];

/** Até `max` dicas para uma palavra, a partir do IPA. */
export function dicasDaPalavra(ipa: string | undefined, en: string, max = 2): DicaSom[] {
  if (!ipa) return [];
  const limpo = ipa.replace(/[/\[\]ˌ.]/g, '').trim();
  const out: DicaSom[] = [];
  for (const r of REGRAS) {
    if (out.length >= max) break;
    try {
      if (r.teste(limpo, en)) out.push({ som: r.som, dica: r.dica });
    } catch { /* regra ignorada */ }
  }
  return out;
}
