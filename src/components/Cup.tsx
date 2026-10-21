// A double-wall glass espresso cup in side view, so the shot is visible through the glass.
// The motion layer rotates [data-cup] around its bottom-right corner (CSS transform-origin)
// and counter-rotates [data-cup-liquid] so the coffee inside stays level as it tips.
// Geometry constants are shared with src/motion/shot.ts (CUP).
export function Cup() {
  return (
    <div className="cup" data-cup-stage>
      <div className="cup__body" data-cup>
        <svg viewBox="0 0 160 150" role="img" aria-label="A glass espresso cup holding a fresh shot with crema on top">
          <defs>
            <clipPath id="cup-inside">
              <path d="M51 23 L129 23 L121 114 Q120 118 116 118 L64 118 Q60 118 59 114 Z" />
            </clipPath>
            <linearGradient id="cup-crema" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--crema-pale)" />
              <stop offset="0.45" stopColor="var(--crema-light)" />
              <stop offset="1" stopColor="var(--crema)" />
            </linearGradient>
          </defs>
          <path className="cup__handle" d="M47 44 C 18 40, 12 64, 22 80 C 30 92, 44 94, 54 92" data-cup-handle />
          <path className="cup__glass" d="M43 16 L137 16 L127 124 Q125 132 117 132 L63 132 Q55 132 53 124 Z" />
          <g clipPath="url(#cup-inside)">
            <g data-cup-liquid>
              <rect className="cup__coffee" x="-60" y="52" width="300" height="240" data-cup-fill />
              <rect x="-60" y="52" width="300" height="12" fill="url(#cup-crema)" data-cup-crema />
            </g>
          </g>
          <path className="cup__shine" d="M57 26 L65 110" />
          <path className="cup__rim" d="M43 16 L137 16" />
        </svg>
      </div>
      <span className="cup__shadow" aria-hidden="true" data-cup-shadow />
    </div>
  );
}
