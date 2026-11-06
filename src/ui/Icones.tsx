// Ícones SVG de traço (sem emoji).
const caminhos: Record<string, JSX.Element> = {
  inicio: <><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /></>,
  licoes: <><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" /><path d="M4 21V5" /></>,
  progresso: <><path d="M4 20V10" /><path d="M10 20V4" /><path d="M16 20v-7" /><path d="M22 20H2" /></>,
  ajustes: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" /></>,
  mic: <><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10a7 7 0 0 0 14 0" /><path d="M12 17v4" /></>,
  parar: <rect x="7" y="7" width="10" height="10" rx="2" />,
  ouvir: <><path d="M11 5L6 9H3v6h3l5 4z" /><path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M18.5 5.5a9 9 0 0 1 0 13" /></>,
  devagar: <><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2 2" /><path d="M9 2h6" /></>,
  fechar: <><path d="M6 6l12 12" /><path d="M18 6L6 18" /></>,
  fogo: <path d="M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-6 1-9z" />,
  cadeado: <><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
  repetir: <><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" /><path d="M3 21v-5h5" /></>,
  texto: <><path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h10" /></>,
  traduzir: <><path d="M4 5h8" /><path d="M8 3v2c0 4-2 7-5 9" /><path d="M6 9c1 2 3 4 6 5" /><path d="M13 21l4-10 4 10" /><path d="M14.5 17h5" /></>,
  revisar: <><path d="M12 8v4l3 2" /><circle cx="12" cy="12" r="9" /></>,
  seta: <path d="M9 6l6 6-6 6" />,
  voltar: <path d="M15 6l-6 6 6 6" />,
  baixar: <><path d="M12 3v12" /><path d="M7 10l5 5 5-5" /><path d="M5 21h14" /></>,
  subir: <><path d="M12 21V9" /><path d="M7 14l5-5 5 5" /><path d="M5 3h14" /></>,
  lixo: <><path d="M4 7h16" /><path d="M9 7V4h6v3" /><path d="M6 7l1 13h10l1-13" /></>,
  check: <path d="M5 12l5 5 9-10" />,
  editar: <><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="M13 7l4 4" /></>,
  calendario: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18" /><path d="M8 3v4" /><path d="M16 3v4" /></>,
  conversa: <path d="M4 5h16v11H9l-5 4z" />,
  teclado: <><rect x="2" y="6" width="20" height="12" rx="2" /><path d="M6 10h0M10 10h0M14 10h0M18 10h0M7 14h10" /></>,
};

export function Icone({ nome, tamanho = 22 }: { nome: keyof typeof caminhos | string; tamanho?: number }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {caminhos[nome] ?? null}
    </svg>
  );
}
