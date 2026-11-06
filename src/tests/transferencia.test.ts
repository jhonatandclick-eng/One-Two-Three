import { describe, expect, it } from 'vitest';
import { aplicarCodigo, atualizar, estadoInicial, gerarCodigo, obter, registrarTentativa } from '../lib/store';

describe('código de transferência', () => {
  it('leva o progresso de um lugar para outro sem perder nada', async () => {
    atualizar(() => ({ ...estadoInicial(), primeiroUsoFeito: true, plano: { id: '3m', inicio: '2026-11-01' }, motor: 'webspeech' }));
    registrarTentativa('fruit-orange', 95, true);
    registrarTentativa('fruit-apple', 40, true);
    const antes = obter();
    const codigo = await gerarCodigo();
    expect(codigo).toMatch(/^OTT[01]-[A-Za-z0-9_-]+$/);

    atualizar(() => estadoInicial()); // como um atalho novo, vazio
    await aplicarCodigo(`  ${codigo}\n`);
    const depois = obter();
    expect(depois.srs).toEqual(antes.srs);
    expect(depois.xpPorDia).toEqual(antes.xpPorDia);
    expect(depois.primeiroUsoFeito).toBe(true);
    expect(depois.motor).toBeNull(); // o motor de voz é escolhido de novo no aparelho
  });

  it('recusa um texto que não é código', async () => {
    await expect(aplicarCodigo('qualquer coisa')).rejects.toThrow();
  });
});
