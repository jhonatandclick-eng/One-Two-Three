import { describe, expect, it } from 'vitest';
import { scorerLocal, compararPalavra, corrigirDitado } from '../engines/scorer';
import { normalizarTexto } from '../lib/normalize';

const avaliar = (esp: string, ...ouvido: string[]) => scorerLocal.avaliar(esp, ouvido.map((text) => ({ text })));

describe('normalização', () => {
  it('expande contrações e números', () => {
    expect(normalizarTexto("I'm 12, don't worry!")).toEqual(['i', 'am', 'twelve', 'do', 'not', 'worry']);
    expect(normalizarTexto('It is 8:30')).toEqual(['it', 'is', 'eight', 'thirty']);
  });
});

describe('Scorer', () => {
  it('frase perfeita dá 100', () => {
    const r = avaliar('I would like an orange juice.', 'I would like an orange juice');
    expect(r.nota).toBe(100);
    expect(r.mensagem).toBe('Excelente!');
  });

  it('"a orange" no lugar de "an orange" marca "an" como quase', () => {
    const r = avaliar('I would like an orange juice.', 'I would like a orange juice');
    const an = r.palavras.find((p) => p.tela === 'an')!;
    expect(an.status).toBe('quase');
    expect(r.nota).toBeGreaterThanOrEqual(85);
    expect(r.nota).toBeLessThan(100);
  });

  it('"juices" no lugar de "juice" fica como quase', () => {
    const r = avaliar('I like orange juice.', 'I like orange juices');
    expect(r.palavras[3].status).toBe('quase');
  });

  it('palavra omitida fica errada', () => {
    const r = avaliar('I would like an orange juice.', 'I like an orange juice');
    expect(r.palavras.find((p) => p.tela === 'would')!.status).toBe('errada');
    expect(r.nota).toBeLessThan(90);
  });

  it('contração reconhecida conta como certa', () => {
    const r = avaliar('I am fine, thanks.', "I'm fine thanks");
    expect(r.nota).toBe(100);
  });

  it('número em dígito conta como certo', () => {
    expect(avaliar('Two coffees, please.', '2 coffees please').nota).toBe(100);
  });

  it('usa a melhor alternativa, mas desconta quando ela não foi a 1ª opção', () => {
    const r = avaliar('juice', 'deuce', 'juice');
    expect(r.nota).toBe(80); // o app entendeu primeiro "deuce": pronúncia ambígua
  });

  it('nota graduada: palavra quase certa ganha nota parcial, não 0 nem 100', () => {
    const r = avaliar('three', 'tree');
    expect(r.nota).toBeGreaterThan(30);
    expect(r.nota).toBeLessThan(80);
  });

  it('confiança baixa do reconhecimento diminui a nota', () => {
    const clara = scorerLocal.avaliar('hello', [{ text: 'hello', confidence: 0.95 }]).nota;
    const duvidosa = scorerLocal.avaliar('hello', [{ text: 'hello', confidence: 0.55 }]).nota;
    expect(clara).toBe(100);
    expect(duvidosa).toBeLessThan(80);
    expect(duvidosa).toBeGreaterThan(60);
  });

  it('notas diferentes para erros diferentes', () => {
    const notas = new Set([
      avaliar('I would like an orange juice', 'I would like an orange juice').nota,
      avaliar('I would like an orange juice', 'I would like a orange juice').nota,
      avaliar('I would like an orange juice', 'I like an orange juice').nota,
      avaliar('I would like an orange juice', 'I like orange shoes').nota,
    ]);
    expect(notas.size).toBe(4);
  });

  it('homófonos são aceitos', () => {
    expect(compararPalavra('two', 'to')).toBe('certa');
    expect(compararPalavra('their', 'there')).toBe('certa');
  });

  it('"tree" no lugar de "three" (erro do th) não passa como certa', () => {
    expect(compararPalavra('three', 'tree')).toBe('quase');
    expect(compararPalavra('think', 'fink')).not.toBe('certa');
  });

  it('palavra totalmente diferente é errada', () => {
    expect(compararPalavra('kitchen', 'chicken')).not.toBe('certa');
    expect(compararPalavra('dog', 'banana')).toBe('errada');
  });

  it('sem fala nenhuma dá zero', () => {
    expect(avaliar('hello').nota).toBe(0);
  });

  it('marca palavras erradas no "Você disse"', () => {
    const r = avaliar('I like orange juice.', 'I like orange shoes');
    expect(r.ouvidas.find((o) => o.palavra === 'shoes')!.erro).toBe(true);
    expect(r.ouvidas.find((o) => o.palavra === 'like')!.erro).toBe(false);
  });

  it('ditado ignora maiúsculas e pontuação', () => {
    expect(corrigirDitado('Can we get the check, please?', 'can we get the check please').nota).toBe(100);
  });

  it('mensagens por faixa', () => {
    expect(avaliar('one two three four five six seven eight nine ten', 'one two three four five six seven eight').mensagem).toBe('Quase lá!');
    expect(avaliar('I would like an orange juice', 'hello').mensagem).toBe('Vamos tentar de novo');
  });
});
