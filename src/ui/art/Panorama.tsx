import { memo, useEffect, useRef } from 'react';
import { Rng } from '../../engine/rng';

/** Original space-station silhouette (modular truss, solar wings, radiators). Not a copy of any real logo. */
function Station() {
  return (
    <g>
      <rect x="-120" y="-3" width="240" height="6" fill="#c9d2dc" />
      {[-110, -78, 78, 110].map((x) => (
        <g key={x}>
          <rect x={x - 12} y="-60" width="24" height="54" fill="#1f3f66" stroke="#9cc3ea" strokeWidth="1.5" />
          <rect x={x - 12} y="6" width="24" height="54" fill="#1f3f66" stroke="#9cc3ea" strokeWidth="1.5" />
          <path d={`M${x - 12} -33h24M${x - 12} 33h24`} stroke="#9cc3ea" strokeWidth="1" />
        </g>
      ))}
      <rect x="-40" y="-10" width="80" height="20" rx="9" fill="#eef2f6" />
      <rect x="-8" y="-28" width="16" height="56" rx="7" fill="#e3e8ee" />
      <rect x="-60" y="-8" width="22" height="16" rx="6" fill="#dfe6ee" />
      <rect x="40" y="-8" width="22" height="16" rx="6" fill="#dfe6ee" />
      <rect x="14" y="14" width="30" height="8" fill="#f4f6f8" opacity="0.9" />
      <circle cx="0" cy="0" r="3" fill="#f5b041" className="blink" />
    </g>
  );
}

function Astronaut() {
  return (
    <g>
      <path d="M-60 -40 C -40 -10, -10 -30, 0 0" stroke="#e9edf2" strokeWidth="1.5" fill="none" strokeDasharray="3 3" />
      <g transform="rotate(-18)">
        <rect x="-9" y="-6" width="18" height="22" rx="6" fill="#f4f6f8" />
        <rect x="-12" y="-4" width="5" height="16" rx="2" fill="#cfd6de" />
        <circle cx="0" cy="-13" r="9" fill="#f4f6f8" />
        <rect x="-6" y="-17" width="12" height="7" rx="3.5" fill="#f5b041" opacity="0.85" />
        <rect x="-11" y="2" width="5" height="12" rx="2.5" fill="#f4f6f8" transform="rotate(30 -8 2)" />
        <rect x="6" y="2" width="5" height="12" rx="2.5" fill="#f4f6f8" transform="rotate(-40 8 2)" />
        <rect x="-6" y="15" width="5" height="11" rx="2.5" fill="#e3e8ee" />
        <rect x="2" y="15" width="5" height="11" rx="2.5" fill="#e3e8ee" />
        <rect x="-4" y="2" width="8" height="3" fill="#e07a3f" />
      </g>
    </g>
  );
}

function PanoramaBase() {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const onMove = (e: PointerEvent) => {
      const x = e.clientX / window.innerWidth - 0.5;
      const y = e.clientY / window.innerHeight - 0.5;
      el.style.setProperty('--px', String(x));
      el.style.setProperty('--py', String(y));
    };
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, []);
  const r = new Rng(91);
  const stars = Array.from({ length: 260 }, () => ({ x: r.next() * 1600, y: r.next() * 900, s: r.next() * 1.5 + 0.3, o: r.next() * 0.7 + 0.2, tw: r.next() < 0.2 }));
  return (
    <svg ref={ref} className="panorama" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <radialGradient id="pn-earth" cx="38%" cy="32%" r="70%">
          <stop offset="0" stopColor="#9bd6ff" />
          <stop offset="0.45" stopColor="#2f7fd0" />
          <stop offset="1" stopColor="#0c2547" />
        </radialGradient>
        <radialGradient id="pn-atmo" cx="50%" cy="50%" r="50%">
          <stop offset="0.86" stopColor="#7fc3ff" stopOpacity="0" />
          <stop offset="0.93" stopColor="#7fc3ff" stopOpacity="0.45" />
          <stop offset="1" stopColor="#7fc3ff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="pn-moon" cx="35%" cy="30%" r="75%">
          <stop offset="0" stopColor="#f5f4ef" />
          <stop offset="1" stopColor="#7c8189" />
        </radialGradient>
        <radialGradient id="pn-mars" cx="35%" cy="30%" r="75%">
          <stop offset="0" stopColor="#f2a774" />
          <stop offset="1" stopColor="#7a2f1a" />
        </radialGradient>
        <radialGradient id="pn-nebula" cx="70%" cy="30%" r="60%">
          <stop offset="0" stopColor="#5a2b6a" stopOpacity="0.45" />
          <stop offset="1" stopColor="#0b1020" stopOpacity="0" />
        </radialGradient>
        <path id="pn-orbit" d="M-200 520 C 300 300, 900 260, 1800 380" />
        <linearGradient id="pn-term" x1="0" y1="0" x2="1" y2="0.3">
          <stop offset="0.5" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.78" />
        </linearGradient>
        <radialGradient id="pn-mars-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0.88" stopColor="#ff9a66" stopOpacity="0" />
          <stop offset="0.95" stopColor="#ff9a66" stopOpacity="0.35" />
          <stop offset="1" stopColor="#ff9a66" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="pn-milky" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7d8fbf" stopOpacity="0" />
          <stop offset="0.5" stopColor="#7d8fbf" stopOpacity="0.12" />
          <stop offset="1" stopColor="#7d8fbf" stopOpacity="0" />
        </linearGradient>
        <clipPath id="pn-mars-clip">
          <circle r="92" />
        </clipPath>
        <clipPath id="pn-moon-clip">
          <circle r="54" />
        </clipPath>
      </defs>
      <rect width="1600" height="900" fill="#070b18" />
      <rect width="1600" height="900" fill="url(#pn-nebula)" />
      <path d="M-100 820 L 1700 40 L 1700 260 L -100 1040 Z" fill="url(#pn-milky)" />
      <g className="layer-far">
        {stars.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.s} fill="#fff" opacity={s.o} className={s.tw ? 'twinkle' : undefined} style={{ animationDelay: `${(i % 9) * 0.5}s` }} />
        ))}
        <path d="M1150 120 l220 70" stroke="#ffffff" strokeWidth="1.5" opacity="0.5" className="comet" />
      </g>
      <g className="layer-mid">
        {/* Mars */}
        <g transform="translate(1340 250)">
          <circle r="104" fill="url(#pn-mars-glow)" />
          <circle r="92" fill="url(#pn-mars)" />
          <g clipPath="url(#pn-mars-clip)">
            {/* dark albedo regions, the great canyon and a polar cap */}
            <path d="M-80 -10 q20 -24 52 -18 q18 4 30 -10 q14 18 -6 30 q-30 14 -52 8 q-16 -2 -24 -10z" fill="#6d2a17" opacity="0.45" />
            <path d="M10 30 q26 -10 50 6 q12 10 30 4 v26 q-40 16 -80 -6z" fill="#7a3220" opacity="0.35" />
            <path d="M-50 4 q30 -6 58 2 q20 6 46 -2" stroke="#4a1a0e" strokeWidth="3" fill="none" opacity="0.55" />
            <ellipse cx="-14" cy="-84" rx="34" ry="12" fill="#fbe9dc" opacity="0.8" />
            <circle cx="40" cy="-30" r="6" fill="#8a3a22" opacity="0.5" />
            <circle cx="-30" cy="46" r="4" fill="#8a3a22" opacity="0.5" />
            <rect x="-92" y="-92" width="184" height="184" fill="url(#pn-term)" />
          </g>
        </g>
        {/* Moon with tiny lander */}
        <g transform="translate(980 170)">
          <circle r="54" fill="url(#pn-moon)" />
          <g clipPath="url(#pn-moon-clip)">
            {/* maria and a few rimmed craters */}
            <path d="M-34 -20 q14 -16 34 -10 q12 6 4 18 q-14 12 -30 6 q-12 -4 -8 -14z" fill="#8a8f97" opacity="0.55" />
            <path d="M6 10 q16 -8 30 2 q6 10 -6 18 q-18 6 -26 -6z" fill="#8a8f97" opacity="0.5" />
            {[
              [-20, 26, 7],
              [24, -26, 5],
              [-40, 4, 4],
              [34, 30, 3.5],
            ].map(([x, y, rr]) => (
              <g key={`${x}${y}`}>
                <circle cx={x} cy={y} r={rr} fill="#6f747c" opacity="0.6" />
                <path d={`M${x - rr} ${y} a${rr} ${rr} 0 0 1 ${rr * 2} 0`} stroke="#f5f4ef" strokeWidth="1" fill="none" opacity="0.7" />
              </g>
            ))}
            <rect x="-54" y="-54" width="108" height="108" fill="url(#pn-term)" />
          </g>
        </g>
        {/* satellite */}
        <g className="sat-drift" transform="translate(760 140)">
          <rect x="-8" y="-6" width="16" height="12" fill="#e9edf2" />
          <rect x="-34" y="-4" width="24" height="8" fill="#1f3f66" stroke="#9cc3ea" />
          <rect x="10" y="-4" width="24" height="8" fill="#1f3f66" stroke="#9cc3ea" />
          <path d="M0 6 v8" stroke="#cfd6de" strokeWidth="2" />
        </g>
      </g>
      {/* Earth limb */}
      <g className="layer-near">
        <circle cx="260" cy="1120" r="560" fill="url(#pn-earth)" />
        <circle cx="260" cy="1120" r="600" fill="url(#pn-atmo)" />
        <path d="M-80 720 q120 -40 220 -10 q90 30 200 -12 M120 820 q80 -30 160 0" stroke="#e6f2e6" strokeWidth="14" fill="none" opacity="0.35" strokeLinecap="round" />
        <path d="M60 690 q60 -50 140 -30 q40 10 60 40 q-70 20 -120 10z" fill="#5f9a5a" opacity="0.6" />
        <path d="M300 640 q60 -30 140 -18 q50 10 90 40 q-60 10 -120 -2 q-60 -10 -110 -20z" fill="#5f9a5a" opacity="0.45" />
        <path d="M-40 640 q160 -60 330 -40 M220 700 q120 -30 260 10" stroke="#ffffff" strokeWidth="10" opacity="0.22" fill="none" strokeLinecap="round" />
        <circle cx="260" cy="1120" r="560" fill="url(#pn-term)" opacity="0.6" />
      </g>
      {/* orbiting station + astronaut */}
      <g className="station-orbit">
        <g className="station-move">
          <g transform="scale(0.9) rotate(-8)">
            <Station />
          </g>
          <g transform="translate(110 70) scale(1.4)" className="astro-float">
            <Astronaut />
          </g>
        </g>
      </g>
    </svg>
  );
}

export const Panorama = memo(PanoramaBase);

/** Original Solbound mission patch (fictional emblem). */
export function MissionPatch({ size = 120 }: { size?: number }) {
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} className="patch" role="img" aria-label="Solbound mission patch">
      <defs>
        <path id="patch-top" d="M28 100 a72 72 0 0 1 144 0" />
        <path id="patch-bot" d="M14 100 a86 86 0 0 0 172 0" />
        <clipPath id="patch-clip">
          <circle cx="100" cy="100" r="62" />
        </clipPath>
      </defs>
      <circle cx="100" cy="100" r="96" fill="#0d1530" stroke="#f5b041" strokeWidth="6" />
      <circle cx="100" cy="100" r="64" fill="#101b3d" stroke="#e9edf2" strokeWidth="2" />
      <g clipPath="url(#patch-clip)">
        <circle cx="100" cy="190" r="70" fill="#c2643a" />
        <circle cx="146" cy="62" r="14" fill="#d8d8d4" />
        <circle cx="62" cy="58" r="2" fill="#fff" />
        <circle cx="80" cy="46" r="1.5" fill="#fff" />
        <circle cx="120" cy="90" r="1.5" fill="#fff" />
        <path d="M40 150 C 80 100, 120 80, 170 60" stroke="#f5b041" strokeWidth="2.5" strokeDasharray="5 6" fill="none" />
        <g transform="translate(118 84) rotate(-28) scale(0.32)">
          <path d="M-60 -14h70c22 0 38 8 46 14-8 6-24 14-46 14h-70z" fill="#eef2f6" />
          <path d="M-40 -14l-14 -14h20l10 14zM-40 14l-14 14h20l10 -14z" fill="#e07a3f" />
          <path d="M-64 0c-18-8-34-6-46 0 12 6 28 8 46 0z" fill="#ffb347" />
        </g>
        {[70, 90, 110, 130].map((x) => (
          <circle key={x} cx={x} cy="132" r="5" fill="#eef2f6" stroke="#0d1530" strokeWidth="1.5" />
        ))}
      </g>
      <text fontSize="20" fontWeight="800" letterSpacing="5" fill="#f1ede6" fontFamily="Space Grotesk Variable, sans-serif">
        <textPath href="#patch-top" startOffset="50%" textAnchor="middle">
          SOLBOUND
        </textPath>
      </text>
      <text fontSize="12" fontWeight="700" letterSpacing="3" fill="#f5b041" fontFamily="Space Grotesk Variable, sans-serif">
        <textPath href="#patch-bot" startOffset="50%" textAnchor="middle">
          MOON · MARS · HOME
        </textPath>
      </text>
    </svg>
  );
}
