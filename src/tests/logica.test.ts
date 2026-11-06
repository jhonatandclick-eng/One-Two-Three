import { describe, expect, it } from 'vitest';
import { registrar, vencidos, novoCartao } from '../lib/srs';
import { preverConclusao, dataPrevista, palavrasNovasPorDia, semanaAtual } from '../lib/plan';
import { sequencia } from '../lib/store';
import { UNIDADES_INICIANTE, UNIDADES_INTERMEDIARIO } from '../content';
import { palavrasDaTela } from '../lib/normalize';

describe('repetição espaçada', () => {
  it('acerto sobe de caixa com o intervalo certo', () => {
    let c = registrar(undefined, 90, '2026-01-01');
    expect(c.caixa).toBe(2);
    expect(c.vence).toBe('2026-01-04');
    c = registrar(c, 85, '2026-01-04');
    expect(c.caixa).toBe(3);
    expect(c.vence).toBe('2026-01-11');
  });
  it('erro volta para a caixa 1 e reaparece amanhã', () => {
    const c = registrar({ ...novoCartao('2026-01-01'), caixa: 4 }, 50, '2026-01-10');
    expect(c.caixa).toBe(1);
    expect(c.vence).toBe('2026-01-11');
  });
  it('lista vencidos', () => {
    const r = vencidos({ a: { ...novoCartao('2026-01-01'), vence: '2026-01-02' }, b: { ...novoCartao('2026-01-01'), vence: '2026-02-01' } }, '2026-01-05');
    expect(r).toEqual(['a']);
  });
});

describe('plano', () => {
  it('data prevista e ritmo', () => {
    expect(dataPrevista('3m', '2026-01-01')).toBe('2026-03-26');
    expect(dataPrevista('livre', '2026-01-01')).toBeNull();
    expect(palavrasNovasPorDia('1m')).toBe(5);
    expect(semanaAtual('2026-01-01', '2026-01-09')).toBe(2);
  });
  it('previsão pelo desempenho', () => {
    expect(preverConclusao('3m', '2026-01-01', '2026-01-03', 5, 144).ritmo).toBe('cedo');
    expect(preverConclusao('3m', '2026-01-01', '2026-01-15', 60, 144).ritmo).toBe('adiantado');
    expect(preverConclusao('3m', '2026-01-01', '2026-01-15', 5, 144).ritmo).toBe('atrasado');
  });
});

describe('sequência de dias', () => {
  it('conta dias seguidos', () => {
    expect(sequencia({ '2026-01-03': 10, '2026-01-02': 5, '2026-01-01': 5 }, '2026-01-03')).toBe(3);
    expect(sequencia({ '2026-01-02': 10 }, '2026-01-03')).toBe(1);
    expect(sequencia({ '2026-01-01': 10 }, '2026-01-03')).toBe(0);
  });
});

describe('conteúdo', () => {
  const confere = (en: string, fala: string[], onde: string) => {
    expect(fala.length, `${onde}: "${en}"`).toBe(palavrasDaTela(en).length);
    fala.forEach((f) => expect(f.trim(), `${onde}: pronúncia vazia`).not.toBe(''));
  };

  it('Iniciante tem 12 unidades com 12 palavras', () => {
    expect(UNIDADES_INICIANTE.length).toBeGreaterThanOrEqual(12);
    UNIDADES_INICIANTE.forEach((u) => expect(u.palavras.length, u.id).toBeGreaterThanOrEqual(12));
  });

  it('cada palavra da tela tem sua pronúncia', () => {
    UNIDADES_INICIANTE.forEach((u) => {
      u.palavras.forEach((p) => {
        expect(p.fala.trim(), p.id).not.toBe('');
        expect(palavrasDaTela(p.en).length, p.id).toBe(1);
        confere(p.exemplo.en, p.exemplo.fala, p.id);
      });
      u.frases.forEach((f) => confere(f.en, f.fala, f.id));
    });
    UNIDADES_INTERMEDIARIO.forEach((u) => {
      u.frases.forEach((f) => confere(f.en, f.fala, f.id));
      confere(u.texto.en, u.texto.fala, `${u.id} texto`);
      u.dialogo.falas.forEach((f, i) => confere(f.en, f.fala, `${u.id} diálogo ${i}`));
    });
  });

  it('textos do Intermediário têm de 60 a 120 palavras', () => {
    UNIDADES_INTERMEDIARIO.forEach((u) => {
      const n = palavrasDaTela(u.texto.en).length;
      expect(n, u.id).toBeGreaterThanOrEqual(60);
      expect(n, u.id).toBeLessThanOrEqual(120);
    });
  });

  it('ids são únicos', () => {
    const ids = [
      ...UNIDADES_INICIANTE.flatMap((u) => [...u.palavras.map((p) => p.id), ...u.frases.map((f) => f.id)]),
      ...UNIDADES_INTERMEDIARIO.flatMap((u) => u.frases.map((f) => f.id)),
    ];
    expect(new Set(ids).size).toBe(ids.length);
  });
});
