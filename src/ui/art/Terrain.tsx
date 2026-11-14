import { memo } from 'react';
import { Rng } from '../../engine/rng';

/**
 * Static scenery for the base view (drawn behind the modules). Memoised per destination/site, so the
 * extra detail costs nothing while the clock ticks.
 */
function TerrainBase({ mars, site }: { mars: boolean; site: string | null }) {
  const r = new Rng(mars ? 404 : site === 'equator' ? 202 : 101);
  const rockFill = mars ? '#7a3520' : '#5d6168';
  const rockLight = mars ? '#b4603c' : '#a3a8af';
  const rocks = Array.from({ length: 34 }, () => ({ x: r.next() * 1000, y: 412 + r.next() * 100, s: 2 + r.next() * 7 }));
  const craters = mars
    ? []
    : Array.from({ length: 7 }, () => ({ x: 40 + r.next() * 920, y: 438 + r.next() * 70, rx: 18 + r.next() * 40 }));
  return (
    <g pointerEvents="none" aria-hidden="true">
      {/* distant ridge layers with soft haze */}
      <path
        d={mars ? 'M0 330 L60 312 L130 326 L210 296 L300 318 L380 300 L470 322 L560 292 L650 316 L760 300 L860 320 L1000 306 V380 H0z' : 'M0 352 C 90 336, 170 346, 260 334 S 450 330, 560 340 S 800 326, 1000 338 V380 H0z'}
        fill={mars ? '#b06a45' : '#7a7f86'}
        opacity="0.55"
      />
      <rect y="300" width="1000" height="90" fill={mars ? 'url(#tr-haze-mars)' : 'url(#tr-haze-moon)'} />
      {mars && (
        <g opacity="0.5">
          <path d="M620 300 q40 -26 90 -6 q30 12 70 4 v10 h-160z" fill="#9a4f30" />
          <path d="M120 312 q30 -14 70 -4 v8 h-70z" fill="#9a4f30" />
        </g>
      )}
      {/* craters (Moon) with lit rim and shadowed floor */}
      {craters.map((c, i) => (
        <g key={i}>
          <ellipse cx={c.x} cy={c.y} rx={c.rx} ry={c.rx * 0.22} fill="#4a4e55" />
          <ellipse cx={c.x + c.rx * 0.08} cy={c.y + 1} rx={c.rx * 0.82} ry={c.rx * 0.16} fill="#6b7077" />
          <path d={`M${c.x - c.rx} ${c.y} a${c.rx} ${c.rx * 0.22} 0 0 0 ${c.rx * 2} 0`} stroke="#b9bec5" strokeWidth="1.5" fill="none" opacity="0.7" />
        </g>
      ))}
      {/* rover tracks from the airlock toward the horizon */}
      <path d="M640 412 C 700 440, 820 452, 1000 470" stroke={mars ? '#8a3e22' : '#4f535a'} strokeWidth="2" strokeDasharray="3 4" fill="none" opacity="0.7" />
      <path d="M646 414 C 706 446, 826 460, 1000 478" stroke={mars ? '#8a3e22' : '#4f535a'} strokeWidth="2" strokeDasharray="3 4" fill="none" opacity="0.7" />
      {/* rocks with a shadow and a lit top */}
      {rocks.map((k, i) => (
        <g key={i}>
          <ellipse cx={k.x + k.s * 0.6} cy={k.y + k.s * 0.35} rx={k.s * 1.2} ry={k.s * 0.35} fill="#000" opacity="0.25" />
          <ellipse cx={k.x} cy={k.y} rx={k.s} ry={k.s * 0.6} fill={rockFill} />
          <ellipse cx={k.x - k.s * 0.3} cy={k.y - k.s * 0.2} rx={k.s * 0.45} ry={k.s * 0.25} fill={rockLight} opacity="0.55" />
        </g>
      ))}
      {/* parked rover */}
      <g transform="translate(905 452)">
        <ellipse cx="0" cy="16" rx="34" ry="5" fill="#000" opacity="0.3" />
        <rect x="-28" y="-8" width="56" height="16" rx="5" fill="#dfe6ee" stroke="#9aa4b0" />
        <rect x="-18" y="-18" width="22" height="11" rx="3" fill="#2e4a6b" />
        <path d="M14 -8 v-14 M10 -22 h8" stroke="#9aa4b0" strokeWidth="2" />
        {[-20, 0, 20].map((x) => (
          <circle key={x} cx={x} cy="10" r="6" fill="#3a3f47" stroke="#8a9099" strokeWidth="1.5" />
        ))}
      </g>
      {/* communication dish beside the habitat */}
      <g transform="translate(455 300)">
        <path d="M0 40 v-26" stroke="#9aa4b0" strokeWidth="3" />
        <path d="M-16 0 a18 12 0 0 0 32 6 z" fill="#e9edf2" stroke="#9aa4b0" strokeWidth="1.5" transform="rotate(-24)" />
        <circle cx="4" cy="-4" r="2" fill="#f5b041" className="blink" />
      </g>
    </g>
  );
}

export const Terrain = memo(TerrainBase);

/** Gradients used by the terrain; place once inside the scene's <defs>. */
export function TerrainDefs() {
  return (
    <>
      <linearGradient id="tr-haze-mars" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#e9b48a" stopOpacity="0.35" />
        <stop offset="1" stopColor="#e9b48a" stopOpacity="0" />
      </linearGradient>
      <linearGradient id="tr-haze-moon" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#ffffff" stopOpacity="0.05" />
        <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
      </linearGradient>
      <radialGradient id="bs-earth" cx="38%" cy="32%" r="70%">
        <stop offset="0" stopColor="#9bd6ff" />
        <stop offset="0.5" stopColor="#2f7fd0" />
        <stop offset="1" stopColor="#0c2547" />
      </radialGradient>
      <linearGradient id="bs-shade" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0.45" stopColor="#000" stopOpacity="0" />
        <stop offset="1" stopColor="#000" stopOpacity="0.75" />
      </linearGradient>
    </>
  );
}

/** Night lights along the path, the habitat glow and the shelter lamp. */
export function NightLights() {
  return (
    <g pointerEvents="none" aria-hidden="true">
      {[470, 560, 650, 740, 830].map((x) => (
        <g key={x}>
          <circle cx={x} cy="418" r="2.2" fill="#ffd27a" />
          <circle cx={x} cy="418" r="10" fill="#ffd27a" opacity="0.12" />
        </g>
      ))}
      <ellipse cx="520" cy="410" rx="110" ry="12" fill="#ffd27a" opacity="0.08" />
    </g>
  );
}
