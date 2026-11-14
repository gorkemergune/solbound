import { memo, type ReactElement } from 'react';
import type { DestinationId } from '../../engine';
import { Rng } from '../../engine/rng';

function Stars({ seed, count, w = 1600, h = 900, maxY }: { seed: number; count: number; w?: number; h?: number; maxY?: number }) {
  const r = new Rng(seed);
  const stars = Array.from({ length: count }, () => ({ x: r.next() * w, y: r.next() * (maxY ?? h), s: r.next() * 1.6 + 0.3, o: r.next() * 0.6 + 0.3, d: r.int(0, 3) }));
  return (
    <g>
      {stars.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.s} fill="#fff" opacity={s.o} className={s.d === 0 ? 'twinkle' : undefined} style={{ animationDelay: `${(i % 7) * 0.6}s` }} />
      ))}
    </g>
  );
}

export const Ship = ({ x = 0, y = 0, scale = 1, flame = true, rotate = 0 }: { x?: number; y?: number; scale?: number; flame?: boolean; rotate?: number }) => (
  <g transform={`translate(${x} ${y}) rotate(${rotate}) scale(${scale})`}>
    {flame ? <path className="flame" d="M-64 0c-18-8-34-6-46 0 12 6 28 8 46 0z" fill="#ffb347" /> : null}
    <path d="M-60 -14h70c22 0 38 8 46 14-8 6-24 14-46 14h-70z" fill="#e8edf3" />
    <path d="M-60 -14h18v28h-18z" fill="#c9d2dc" />
    <path d="M10 -14c22 0 38 8 46 14H10z" fill="#ffffff" />
    <circle cx="22" cy="-2" r="5" fill="#2e4a6b" stroke="#9fb3c8" strokeWidth="2" />
    <path d="M-40 -14l-14 -14h20l10 14z" fill="#e07a3f" />
    <path d="M-40 14l-14 14h20l10 -14z" fill="#e07a3f" />
    <rect x="-34" y="-3" width="30" height="6" rx="3" fill="#f5b041" opacity="0.9" />
  </g>
);

function TitleSceneBase() {
  return (
    <svg className="scene-svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <radialGradient id="t-glow" cx="70%" cy="110%" r="70%">
          <stop offset="0" stopColor="#e07a3f" stopOpacity="0.55" />
          <stop offset="0.5" stopColor="#5a2b4a" stopOpacity="0.25" />
          <stop offset="1" stopColor="#0b1020" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="t-mars" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e5895a" />
          <stop offset="1" stopColor="#7a3220" />
        </linearGradient>
        <radialGradient id="t-moon" cx="35%" cy="35%" r="70%">
          <stop offset="0" stopColor="#f2f2ee" />
          <stop offset="1" stopColor="#8f949c" />
        </radialGradient>
      </defs>
      <rect width="1600" height="900" fill="#0b1020" />
      <rect width="1600" height="900" fill="url(#t-glow)" />
      <Stars seed={7} count={220} />
      {/* moon */}
      <circle cx="260" cy="210" r="70" fill="url(#t-moon)" />
      <circle cx="240" cy="190" r="12" fill="#7d828a" opacity="0.5" />
      <circle cx="285" cy="235" r="8" fill="#7d828a" opacity="0.5" />
      <circle cx="275" cy="180" r="5" fill="#7d828a" opacity="0.5" />
      {/* mars horizon */}
      <ellipse cx="1050" cy="1520" rx="1250" ry="820" fill="url(#t-mars)" />
      <ellipse cx="1050" cy="1520" rx="1250" ry="820" fill="none" stroke="#ffb38a" strokeOpacity="0.5" strokeWidth="6" />
      <path d="M300 860c120-30 260-10 400-40s300-10 420-30 220 10 480 0" stroke="#5d2416" strokeOpacity="0.4" strokeWidth="10" fill="none" />
      {/* trajectory */}
      <path d="M120 760 C 500 520, 900 420, 1340 300" stroke="#f5b041" strokeOpacity="0.55" strokeWidth="2.5" strokeDasharray="6 12" fill="none" className="dash-move" />
      <g className="ship-float">
        <Ship x={1180} y={350} scale={1.3} rotate={-14} />
      </g>
    </svg>
  );
}
export const TitleScene = memo(TitleSceneBase);

/** Destination landscape (used on destination cards and landing). */
function LandscapeBase({ dest, compact = false }: { dest: DestinationId; compact?: boolean }) {
  if (dest === 'moon') {
    return (
      <svg className="scene-svg" viewBox="0 0 800 450" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id="l-moonground" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#a7abb1" />
            <stop offset="1" stopColor="#5d6168" />
          </linearGradient>
          <radialGradient id="l-earth" cx="40%" cy="35%" r="65%">
            <stop offset="0" stopColor="#7fc3ff" />
            <stop offset="0.6" stopColor="#2a6fb8" />
            <stop offset="1" stopColor="#123a66" />
          </radialGradient>
        </defs>
        <rect width="800" height="450" fill="#05070d" />
        <Stars seed={11} count={compact ? 60 : 110} w={800} h={300} />
        <circle cx="610" cy="95" r="38" fill="url(#l-earth)" />
        <path d="M590 80c10-8 26-6 30 4-6 2-14 8-24 6z M612 112c8 0 16 4 18 10-8 2-16 0-20-4z" fill="#e8f3e8" opacity="0.8" />
        <path d="M0 300 C 120 270, 220 290, 330 268 S 560 250, 800 276 V450 H0z" fill="#80858c" />
        <path d="M0 330 C 160 312, 300 340, 460 320 S 680 300, 800 318 V450 H0z" fill="url(#l-moonground)" />
        <ellipse cx="180" cy="380" rx="70" ry="14" fill="#4f535a" />
        <ellipse cx="180" cy="376" rx="60" ry="9" fill="#9aa0a7" />
        <ellipse cx="560" cy="410" rx="48" ry="10" fill="#4f535a" />
        <ellipse cx="560" cy="407" rx="40" ry="6" fill="#9aa0a7" />
        <ellipse cx="690" cy="355" rx="22" ry="5" fill="#4f535a" />
        <path d="M0 300 L800 300" stroke="#fff" strokeOpacity="0.04" />
        {/* long low shadow: polar sun */}
        <circle cx="70" cy="262" r="14" fill="#fffbe6" />
        <circle cx="70" cy="262" r="30" fill="#fffbe6" opacity="0.08" />
      </svg>
    );
  }
  return (
    <svg className="scene-svg" viewBox="0 0 800 450" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="l-marssky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c9875a" />
          <stop offset="1" stopColor="#e8b88a" />
        </linearGradient>
        <linearGradient id="l-marsground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c0623a" />
          <stop offset="1" stopColor="#6e2a17" />
        </linearGradient>
      </defs>
      <rect width="800" height="450" fill="url(#l-marssky)" />
      <circle cx="640" cy="110" r="16" fill="#fff6e0" opacity="0.9" />
      <circle cx="640" cy="110" r="44" fill="#fff6e0" opacity="0.15" />
      <path d="M0 270 L120 200 L210 250 L330 170 L460 250 L560 215 L800 262 V450 H0z" fill="#a95a38" opacity="0.7" />
      <path d="M0 300 C 140 280, 260 300, 400 284 S 640 270, 800 292 V450 H0z" fill="url(#l-marsground)" />
      <path d="M40 360c60-12 120-10 180 0 M420 390c80-14 150-10 220 2" stroke="#5a2212" strokeOpacity="0.45" strokeWidth="5" fill="none" strokeLinecap="round" />
      <g fill="#5a2212">
        <ellipse cx="300" cy="350" rx="14" ry="7" />
        <ellipse cx="660" cy="330" rx="10" ry="5" />
        <ellipse cx="120" cy="410" rx="18" ry="8" />
      </g>
      <rect width="800" height="450" fill="#d79a6a" opacity="0.08" />
    </svg>
  );
}
export const Landscape = memo(LandscapeBase);

/** Compressed transit scene: Earth to destination (or back). progress 0..1 */
export function TransitScene({ dest, direction, progress }: { dest: DestinationId; direction: 'out' | 'back'; progress: number }) {
  const p = Math.min(1, Math.max(0, progress));
  const from = direction === 'out' ? { x: 160, y: 520 } : { x: 1440, y: 360 };
  const to = direction === 'out' ? { x: 1440, y: 360 } : { x: 160, y: 520 };
  const cx = 800;
  const cy = 120;
  const t = p;
  const x = (1 - t) * (1 - t) * from.x + 2 * (1 - t) * t * cx + t * t * to.x;
  const y = (1 - t) * (1 - t) * from.y + 2 * (1 - t) * t * cy + t * t * to.y;
  const dx = 2 * (1 - t) * (cx - from.x) + 2 * t * (to.x - cx);
  const dy = 2 * (1 - t) * (cy - from.y) + 2 * t * (to.y - cy);
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  return (
    <svg className="scene-svg" viewBox="0 0 1600 700" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <radialGradient id="tr-earth" cx="40%" cy="35%" r="65%">
          <stop offset="0" stopColor="#8fd0ff" />
          <stop offset="0.6" stopColor="#2a6fb8" />
          <stop offset="1" stopColor="#0f2f55" />
        </radialGradient>
        <radialGradient id="tr-dest" cx="40%" cy="35%" r="65%">
          {dest === 'mars' ? (
            <>
              <stop offset="0" stopColor="#f0a070" />
              <stop offset="1" stopColor="#8a3a22" />
            </>
          ) : (
            <>
              <stop offset="0" stopColor="#f4f4f0" />
              <stop offset="1" stopColor="#80858d" />
            </>
          )}
        </radialGradient>
      </defs>
      <rect width="1600" height="700" fill="#070b17" />
      <Stars seed={dest === 'mars' ? 21 : 23} count={200} w={1600} h={700} />
      <circle cx="160" cy="520" r="90" fill="url(#tr-earth)" />
      <path d="M110 490c26-20 64-12 70 10-16 6-36 18-60 12z" fill="#dfeedd" opacity="0.7" />
      <circle cx="1440" cy="360" r={dest === 'mars' ? 70 : 58} fill="url(#tr-dest)" />
      <path d={`M${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`} stroke="#f5b041" strokeOpacity="0.4" strokeWidth="2.5" strokeDasharray="5 12" fill="none" />
      <g>
        <Ship x={x} y={y} scale={0.9} rotate={angle} />
      </g>
    </svg>
  );
}

/** Small illustrations for event cards. */
export function EventArt({ id, dest }: { id: string; dest: DestinationId }) {
  const sky = dest === 'mars' ? '#d29a6c' : '#0a0d16';
  const ground = dest === 'mars' ? '#a4502e' : '#7b8087';
  const common = (
    <>
      <rect width="320" height="140" fill={sky} />
      <path d="M0 110 C 80 100, 160 116, 240 104 S 300 100, 320 106 V140 H0z" fill={ground} />
    </>
  );
  let fg: ReactElement;
  switch (id) {
    case 'solar':
      fg = (
        <g>
          {[60, 120, 180].map((x) => (
            <g key={x} transform={`translate(${x} 70) rotate(-12)`}>
              <rect x="-26" y="-14" width="52" height="28" fill="#23466e" stroke="#9cc3ea" strokeWidth="2" />
              <path d="M-26 0h52M-9 -14v28M9 -14v28" stroke="#9cc3ea" strokeWidth="1" />
            </g>
          ))}
          <path d="M260 40l10 10M270 30v14M250 32l8 8" stroke="#f5b041" strokeWidth="3" strokeLinecap="round" />
          <circle cx="260" cy="40" r="10" fill="#fff4c2" />
        </g>
      );
      break;
    case 'seal':
      fg = (
        <g>
          <rect x="110" y="34" width="100" height="76" rx="12" fill="#d9dee4" />
          <circle cx="160" cy="72" r="26" fill="#56616e" stroke="#b9c2cc" strokeWidth="5" />
          <g fill="#c9ccd2" className="leak">
            <circle cx="190" cy="56" r="3" />
            <circle cx="200" cy="48" r="2" />
            <circle cx="210" cy="42" r="1.6" />
          </g>
        </g>
      );
      break;
    case 'flare':
      fg = (
        <g>
          <circle cx="40" cy="30" r="22" fill="#fff1a8" />
          {Array.from({ length: 7 }, (_, i) => (
            <path key={i} d={`M${70 + i * 30} ${20 + (i % 3) * 10} l40 18`} stroke="#ffd166" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
          ))}
          <path d="M210 110v-40a30 30 0 0 1 60 0v40z" fill="#d9dee4" />
          <path d="M228 110v-26h24v26z" fill="#2e4a6b" />
        </g>
      );
      break;
    case 'water':
      fg = (
        <g>
          <rect x="110" y="40" width="44" height="66" rx="8" fill="#d9dee4" />
          <rect x="116" y="70" width="32" height="30" rx="4" fill="#4aa3df" />
          <path d="M154 60h40v30" stroke="#b9c2cc" strokeWidth="8" fill="none" />
          <circle cx="194" cy="98" r="6" fill="#4aa3df" className="drip" />
          <g fill="#8a6a4a">
            <circle cx="180" cy="60" r="2.5" />
            <circle cx="172" cy="62" r="2" />
          </g>
        </g>
      );
      break;
    case 'dust':
      fg = (
        <g>
          {[70, 140, 210].map((x) => (
            <g key={x} transform={`translate(${x} 78) rotate(-10)`}>
              <rect x="-26" y="-14" width="52" height="28" fill="#23466e" stroke="#9cc3ea" strokeWidth="2" />
              <rect x="-26" y="-14" width="52" height="28" fill="#b36a3c" opacity="0.55" />
            </g>
          ))}
          <rect width="320" height="140" fill="#c27b4c" opacity="0.35" className="haze" />
        </g>
      );
      break;
    case 'plant':
      fg = (
        <g>
          <path d="M100 110v-36a60 60 0 0 1 120 0v36z" fill="#cfe9d6" opacity="0.6" stroke="#e8f5ec" strokeWidth="3" />
          {[120, 140, 160, 180, 200].map((x, i) => (
            <path key={x} d={`M${x} 108c0-${14 + (i % 2) * 6} ${i % 2 ? 6 : -6}-${18 + i} ${i % 2 ? 10 : -10}-${22 + i}`} stroke="#8a9a3c" strokeWidth="3" fill="none" />
          ))}
        </g>
      );
      break;
    case 'earth':
      fg = (
        <g>
          <circle cx="240" cy="44" r="24" fill="#2a6fb8" />
          <path d="M226 36c8-6 20-4 22 4-6 2-12 6-20 4z" fill="#dfeedd" opacity="0.8" />
          <path d="M80 100v-30h60v30z" fill="#d9dee4" />
          <path d="M110 70l0 -26M110 44l14 -10" stroke="#b9c2cc" strokeWidth="3" />
          <g stroke="#f5b041" strokeWidth="2" fill="none" opacity="0.8">
            <path d="M132 38a14 14 0 0 1 14 14" />
            <path d="M136 30a24 24 0 0 1 22 22" />
          </g>
        </g>
      );
      break;
    case 'suit':
      fg = (
        <g>
          <circle cx="160" cy="48" r="18" fill="#e9edf2" />
          <rect x="148" y="42" width="24" height="12" rx="6" fill="#2e4a6b" />
          <path d="M136 110v-36c0-10 10-16 24-16s24 6 24 16v36z" fill="#e9edf2" />
          <g fill="#8d9198" opacity="0.8">
            <circle cx="142" cy="96" r="3" />
            <circle cx="178" cy="90" r="2.5" />
            <circle cx="150" cy="104" r="2" />
          </g>
        </g>
      );
      break;
    case 'crew':
      fg = (
        <g>
          <path d="M60 110v-40a40 40 0 0 1 200 0v40z" fill="#d9dee4" />
          <circle cx="130" cy="84" r="10" fill="#e8b896" />
          <circle cx="190" cy="84" r="10" fill="#8e5a3c" />
          <path d="M140 70q20 -14 40 0" stroke="#e0566e" strokeWidth="3" fill="none" />
        </g>
      );
      break;
    case 'ascent':
      fg = (
        <g>
          <path d="M160 18l18 30v50h-36v-50z" fill="#e8edf3" />
          <path d="M142 98l-12 12h60l-12-12z" fill="#9aa4b0" />
          <circle cx="160" cy="56" r="6" fill="#2e4a6b" />
        </g>
      );
      break;
    case 'circuit':
      fg = (
        <g>
          <rect width="320" height="140" fill="#0a0f1f" />
          <path d="M40 70h80l20-20h60l20 20h60" stroke="#3f8fe0" strokeWidth="4" fill="none" />
          <rect x="150" y="38" width="20" height="24" fill="#e0566e" />
          <path d="M160 30l-6 8h12z" fill="#ffd166" />
        </g>
      );
      break;
    case 'o2':
      fg = (
        <g>
          <rect x="130" y="26" width="60" height="84" rx="14" fill="#d9dee4" />
          <text x="160" y="80" textAnchor="middle" fontSize="28" fontWeight="700" fill="#2e4a6b">O₂</text>
        </g>
      );
      break;
    case 'med':
      fg = (
        <g>
          <rect x="128" y="36" width="64" height="64" rx="12" fill="#e9edf2" />
          <path d="M152 52h16v12h12v16h-12v12h-16v-12h-12v-16h12z" fill="#e0566e" />
        </g>
      );
      break;
    case 'loop':
      fg = (
        <g fontSize="11" fontWeight="700" fill="#e9edf2">
          <rect width="320" height="140" fill="#0d1428" />
          {[
            [60, 40, 'H₂O'],
            [160, 30, 'O₂'],
            [260, 40, 'H₂'],
            [210, 105, 'CO₂'],
            [110, 105, 'CH₄'],
          ].map(([x, y, l]) => (
            <g key={String(l)}>
              <circle cx={Number(x)} cy={Number(y)} r="17" fill="#1f3a63" stroke="#4aa3df" strokeWidth="2" />
              <text x={Number(x)} y={Number(y) + 4} textAnchor="middle">{l}</text>
            </g>
          ))}
          <path d="M78 36 Q110 18 142 28 M178 28 Q215 18 243 36 M252 56 Q240 90 225 98 M195 106 L128 106 M95 98 Q66 80 62 58" stroke="#f5b041" strokeWidth="2" fill="none" strokeDasharray="4 4" className="dash-move" />
        </g>
      );
      break;
    case 'gear':
      fg = (
        <g>
          <g transform="translate(130 72)" className="slow-spin">
            <circle r="30" fill="#9aa4b0" />
            {Array.from({ length: 10 }, (_, i) => (
              <rect key={i} x="-5" y="-38" width="10" height="12" fill="#9aa4b0" transform={`rotate(${i * 36})`} />
            ))}
            <circle r="10" fill="#56616e" />
          </g>
          <g transform="translate(195 88)">
            <circle r="20" fill="#7d868f" />
            <circle r="7" fill="#56616e" />
          </g>
          <g fill="#c27b4c" opacity="0.85">
            {[[150, 50], [170, 60], [112, 90], [190, 70], [140, 100], [205, 98]].map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r="3" />
            ))}
          </g>
        </g>
      );
      break;
    case 'ice':
      fg = (
        <g>
          <path d="M40 110 Q160 30 280 110 Z" fill="#05070d" />
          <path d="M120 110 l12 -14 l10 10 l14 -18 l12 22 z" fill="#bfe6ff" opacity="0.9" />
          <path d="M40 110 Q60 60 100 52" stroke={dest === 'mars' ? '#d29a6c' : '#cfd3d8'} strokeWidth="3" fill="none" />
          <circle cx="300" cy="18" r="9" fill="#fff6e0" />
        </g>
      );
      break;
    case 'rover':
      fg = (
        <g>
          <rect x="120" y="76" width="70" height="22" rx="6" fill="#e9edf2" />
          <rect x="132" y="64" width="30" height="14" rx="4" fill="#2e4a6b" />
          <circle cx="132" cy="104" r="9" fill="#2b2f36" />
          <circle cx="178" cy="108" r="9" fill="#2b2f36" />
          <path d="M165 112 q14 6 28 0" stroke={ground} strokeWidth="8" />
          <path d="M150 64 v-20 M146 44 h8" stroke="#b9c2cc" strokeWidth="2.5" />
          <g stroke="#ff6b6b" strokeWidth="2" fill="none" opacity="0.8">
            <path d="M162 40 a8 8 0 0 1 8 8" />
            <path d="M168 34 l12 12" />
          </g>
        </g>
      );
      break;
    case 'quake':
      fg = (
        <g>
          <path d="M80 110v-34a46 30 0 0 1 92 0v34z" fill="#e9edf2" transform="rotate(-3 126 90)" />
          <path d="M60 116 l20 -6 l14 8 l18 -7 l16 9 l22 -8 l18 6" stroke="#2b2f36" strokeWidth="3" fill="none" />
          <g stroke="#f5b041" strokeWidth="2.5" fill="none" strokeLinecap="round">
            <path d="M40 60 q6 -8 0 -16 M30 64 q10 -12 0 -24" />
            <path d="M210 60 q-6 -8 0 -16 M220 64 q-10 -12 0 -24" />
          </g>
        </g>
      );
      break;
    case 'impact':
      fg = (
        <g>
          <rect x="140" y="56" width="110" height="40" fill="#cfd6de" stroke="#9aa4b0" strokeWidth="2" transform="skewX(-12)" />
          <circle cx="190" cy="76" r="6" fill="#2b2f36" />
          <path d="M60 18 L182 70" stroke="#ffd166" strokeWidth="3" strokeLinecap="round" />
          <circle cx="60" cy="18" r="3" fill="#fff" />
          <g stroke="#ffffff" strokeWidth="1.5">
            <path d="M190 76 l12 -8 M190 76 l14 4 M190 76 l-4 12" />
          </g>
        </g>
      );
      break;
    case 'shadow':
      fg = (
        <g>
          <path d="M0 110 L90 44 L150 110 Z" fill="#3a3e45" />
          <path d="M150 110 L320 100 L320 140 L120 140 Z" fill="#05070d" opacity="0.75" />
          {[190, 240].map((x) => (
            <rect key={x} x={x} y="80" width="40" height="18" fill="#1f3f66" stroke="#9cc3ea" strokeWidth="1.5" />
          ))}
          <circle cx="20" cy="96" r="10" fill="#fff6e0" />
        </g>
      );
      break;
    case 'heat':
      fg = (
        <g>
          <circle cx="160" cy="26" r="20" fill="#fff1a8" />
          {[110, 150, 190].map((x) => (
            <rect key={x} x={x} y="70" width="26" height="36" fill="#e9edf2" stroke="#ff9f6b" strokeWidth="2" />
          ))}
          <g stroke="#ff9f6b" strokeWidth="2" fill="none" opacity="0.8">
            <path d="M118 64 q4 -6 0 -12 M158 64 q4 -6 0 -12 M198 64 q4 -6 0 -12" />
          </g>
        </g>
      );
      break
    default:
      fg = <Ship x={160} y={66} scale={1.1} />;
  }
  return (
    <svg viewBox="0 0 320 140" className="event-art" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
      {id === 'ship' || id === 'circuit' || id === 'loop' ? <rect width="320" height="140" fill="#070b17" /> : common}
      {id === 'ship' ? <Stars seed={5} count={30} w={320} h={140} /> : null}
      {fg}
    </svg>
  );
}

/** Water–oxygen loop schematic for the R-LOOP research card (ISS ECLSS, sourced; Sabatier ratio derived). */
export function WaterLoopDiagram({ labels }: { labels: Record<'water' | 'electro' | 'o2' | 'h2' | 'crew' | 'co2' | 'sabatier' | 'ch4' | 'recycler', string> }) {
  const node = (x: number, y: number, w: number, label: string, fill: string) => (
    <g>
      <rect x={x - w / 2} y={y - 18} width={w} height="36" rx="10" fill={fill} stroke="#2a3a5e" strokeWidth="1.5" />
      <text x={x} y={y + 5} textAnchor="middle" fontSize="13" fontWeight="700" fill="#0b1020">
        {label}
      </text>
    </g>
  );
  const arrow = (d: string) => <path d={d} stroke="#f5b041" strokeWidth="2.5" fill="none" markerEnd="url(#wl-arrow)" />;
  return (
    <svg viewBox="0 0 560 260" className="loop-diagram" role="img" aria-label={Object.values(labels).join(' → ')}>
      <defs>
        <marker id="wl-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0 0L10 5L0 10z" fill="#f5b041" />
        </marker>
      </defs>
      {node(90, 50, 130, labels.water, '#8fd0ff')}
      {node(280, 50, 150, labels.electro, '#ffd27a')}
      {node(470, 50, 110, labels.o2, '#9be7b5')}
      {node(470, 140, 110, labels.crew, '#e9edf2')}
      {node(470, 220, 110, labels.co2, '#cfd6de')}
      {node(280, 140, 110, labels.h2, '#ffd27a')}
      {node(280, 220, 150, labels.sabatier, '#f3b5a0')}
      {node(90, 220, 110, labels.ch4, '#cfd6de')}
      {node(90, 140, 130, labels.recycler, '#8fd0ff')}
      {arrow('M155 50 H200')}
      {arrow('M355 50 H410')}
      {arrow('M470 68 V118')}
      {arrow('M470 158 V198')}
      {arrow('M415 220 H360')}
      {arrow('M280 68 V118')}
      {arrow('M280 158 V198')}
      {arrow('M205 220 H150')}
      {arrow('M230 205 Q170 170 150 160')}
      {arrow('M415 152 C 360 192, 220 192, 158 154')}
      {arrow('M90 122 V72')}
    </svg>
  );
}
