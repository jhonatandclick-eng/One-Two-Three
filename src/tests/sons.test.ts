import { describe, expect, it } from 'vitest';
import { TODAS_PALAVRAS } from '../content';
import { dicasDaPalavra } from '../lib/sons';

const sons = (ipa: string, en: string) => dicasDaPalavra(ipa, en, 5).map((d) => d.som);

describe('dicas de som', () => {
  it('reconhece os sons difíceis para brasileiros', () => {
    expect(sons('θriː', 'three')).toContain('th sem voz');
    expect(sons('ðə', 'the')).toContain('th com voz');
    expect(sons('haʊs', 'house')).toContain('h no começo');
    expect(sons('red', 'red')).toContain('r do inglês');
    expect(sons('bed', 'bed')).toContain('final em consoante');
    expect(sons('bɔːl', 'ball')).toContain('l no final');
    expect(sons('kæt', 'cat')).toContain('a aberto');
  });

  it('"orange" não recebe a dica de r inicial, só a de r depois de vogal', () => {
    const s = sons('ˈɔːr.ɪndʒ', 'orange');
    expect(s).toContain('r depois de vogal');
    expect(s).not.toContain('r do inglês');
  });

  it('a maioria das palavras do Iniciante tem pelo menos uma dica', () => {
    const com = TODAS_PALAVRAS.filter((p) => dicasDaPalavra(p.ipa, p.en).length > 0).length;
    expect(com / TODAS_PALAVRAS.length).toBeGreaterThan(0.85);
  });
});
