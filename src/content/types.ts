// Formatos do conteúdo. Cada item de "fala" corresponde a UMA palavra do texto em inglês,
// na mesma ordem (separando por espaços). Os testes conferem isso.

export interface Frase {
  id: string;
  en: string;
  pt: string;
  fala: string[];
}

export interface Palavra {
  id: string;
  en: string;
  pt: string;
  fala: string;
  ipa: string;
  exemplo: { en: string; pt: string; fala: string[] };
  gancho?: string;
}

export interface UnidadeIniciante {
  id: string;
  nome: string;
  palavras: Palavra[];
  frases: Frase[];
}

export interface Texto {
  titulo: string;
  en: string;
  pt: string;
  fala: string[];
}

export interface FalaDialogo {
  quem: 'app' | 'voce';
  en: string;
  pt: string;
  fala: string[];
}

export interface UnidadeIntermediario {
  id: string;
  nome: string;
  frases: Frase[];
  texto: Texto;
  dialogo: { titulo: string; falas: FalaDialogo[] };
}
