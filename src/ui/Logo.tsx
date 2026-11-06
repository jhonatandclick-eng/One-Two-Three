// Marca do app: três barras que sobem (1, 2, 3), como degraus e como o nível da voz.

export function Marca({ tamanho = 28 }: { tamanho?: number }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 32 32" aria-hidden="true" className="marca">
      <rect x="4" y="20" width="6" height="8" rx="3" className="m1" />
      <rect x="13" y="12" width="6" height="16" rx="3" className="m2" />
      <rect x="22" y="4" width="6" height="24" rx="3" className="m3" />
    </svg>
  );
}

export function Logo({ tamanho = 28 }: { tamanho?: number }) {
  return (
    <span className="logo" aria-label="One Two Three" role="img">
      <Marca tamanho={tamanho} />
      <span className="logo-texto" aria-hidden="true">
        <span className="l1">one</span> <span className="l2">two</span> <span className="l3">three</span>
      </span>
    </span>
  );
}
