// Datas no formato AAAA-MM-DD, sempre no fuso do aparelho.

export function hoje(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dia}`;
}

export function deTexto(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function somarDias(s: string, n: number): string {
  const d = deTexto(s);
  d.setDate(d.getDate() + n);
  return hoje(d);
}

export function diasEntre(a: string, b: string): number {
  return Math.round((deTexto(b).getTime() - deTexto(a).getTime()) / 86400000);
}

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto',
  'setembro', 'outubro', 'novembro', 'dezembro'];

export function mesAno(s: string): string {
  const d = deTexto(s);
  return `${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}

/** Segunda-feira da semana da data. */
export function inicioDaSemana(s: string): string {
  const d = deTexto(s);
  const dia = (d.getDay() + 6) % 7;
  return somarDias(s, -dia);
}
