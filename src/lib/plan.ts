// Plano por prazo: define meta diária e quantas palavras novas entram por dia.
import { diasEntre, mesAno, somarDias } from './dates';

export type PlanoId = '1m' | '3m' | '6m' | 'livre';

export interface OpcaoPlano {
  id: PlanoId;
  rotulo: string;
  ritmo: string;
  minutosDia: number;
  palavrasSemana: number;
  semanas: number | null;
  metaXp: number;
}

export const PLANOS: OpcaoPlano[] = [
  { id: '1m', rotulo: '1 mês', ritmo: 'Intensivo', minutosDia: 45, palavrasSemana: 35, semanas: 4, metaXp: 150 },
  { id: '3m', rotulo: '3 meses', ritmo: 'Progressivo', minutosDia: 20, palavrasSemana: 15, semanas: 12, metaXp: 70 },
  { id: '6m', rotulo: '6 meses', ritmo: 'Tranquilo', minutosDia: 10, palavrasSemana: 8, semanas: 26, metaXp: 40 },
  { id: 'livre', rotulo: 'Sem prazo', ritmo: 'No seu tempo', minutosDia: 5, palavrasSemana: 4, semanas: null, metaXp: 20 },
];

export const PLANO_PADRAO: PlanoId = '3m';

export function opcao(id: PlanoId): OpcaoPlano {
  return PLANOS.find((p) => p.id === id) ?? PLANOS[1];
}

export function palavrasNovasPorDia(id: PlanoId): number {
  return Math.max(1, Math.ceil(opcao(id).palavrasSemana / 7));
}

export function dataPrevista(id: PlanoId, inicio: string): string | null {
  const o = opcao(id);
  return o.semanas ? somarDias(inicio, o.semanas * 7) : null;
}

export function textoDataPrevista(id: PlanoId, inicio: string): string {
  const d = dataPrevista(id, inicio);
  return d ? mesAno(d) : 'sem data definida';
}

export function semanaAtual(inicio: string, dia: string): number {
  return Math.floor(Math.max(0, diasEntre(inicio, dia)) / 7) + 1;
}

export type Ritmo = 'adiantado' | 'no-ritmo' | 'atrasado' | 'cedo';

export interface Previsao {
  ritmo: Ritmo;
  /** data estimada de conclusão do Iniciante pelo desempenho real */
  estimada: string | null;
  mensagem: string;
}

/**
 * Recalcula a previsão pelo desempenho real.
 * aprendidas = palavras já acertadas pelo menos uma vez (caixa 2 ou mais); total = palavras do Iniciante.
 */
export function preverConclusao(id: PlanoId, inicio: string, dia: string, aprendidas: number, total: number): Previsao {
  const dias = diasEntre(inicio, dia);
  if (dias < 7) {
    return { ritmo: 'cedo', estimada: null, mensagem: 'Na primeira semana ainda estamos conhecendo o seu ritmo.' };
  }
  const restante = Math.max(0, total - aprendidas);
  if (restante === 0) {
    return { ritmo: 'adiantado', estimada: dia, mensagem: 'Você já passou por todas as palavras do Iniciante. Parabéns!' };
  }
  const porDia = aprendidas / dias;
  if (porDia <= 0) {
    return { ritmo: 'atrasado', estimada: null, mensagem: 'Que tal retomar com uma lição curta hoje? Cada dia conta.' };
  }
  const estimada = somarDias(dia, Math.ceil(restante / porDia));
  const planejada = dataPrevista(id, inicio);
  if (!planejada) {
    return { ritmo: 'no-ritmo', estimada, mensagem: `No ritmo atual, você conclui o Iniciante por volta de ${mesAno(estimada)}. É só uma estimativa.` };
  }
  const folga = diasEntre(estimada, planejada);
  if (folga >= 7) {
    return { ritmo: 'adiantado', estimada, mensagem: `Você está adiantado! A estimativa agora é ${mesAno(estimada)}.` };
  }
  if (folga <= -7) {
    return { ritmo: 'atrasado', estimada, mensagem: `Está um pouco atrás do plano: estimativa de ${mesAno(estimada)}. Sem pressão, dá para ajustar o plano quando quiser.` };
  }
  return { ritmo: 'no-ritmo', estimada, mensagem: `Você está no ritmo do plano. Estimativa: ${mesAno(estimada)}.` };
}
