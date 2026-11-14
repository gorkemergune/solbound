import { memo } from 'react';
import { Rng } from '../../engine/rng';

// Natural, muted palettes (v0.6): realistic skin and hair, mission-style suit accents, dark backgrounds.
const SKIN = ['#f6dcc6', '#f1d0b5', '#ecc19f', '#e3b08c', '#d9a47c', '#c99068', '#b97c56', '#a26a47', '#8e5a3c', '#774a31', '#5f3a26', '#4a2d1e'];
const HAIR = ['#1a1614', '#241b17', '#33251d', '#4a3324', '#5e4029', '#765034', '#9a7148', '#c7a46c', '#7a3a24'];
const GRAY = ['#8f8a86', '#a9a49f', '#c4c0bb'];
const SUIT = ['#d9733b', '#3f7fc4', '#2e9e8a', '#c9a23a', '#6b7a8f', '#7a8f4a', '#b5543f', '#4f6fa8'];
const BG: [string, string][] = [
  ['#1e2c46', '#0f1828'],
  ['#1d3438', '#0e1d20'],
  ['#2a2f3d', '#141822'],
  ['#2b2a36', '#15141c'],
  ['#1f2b36', '#0f161e'],
];
const SCARF = ['#3f5f8a', '#6a3f52', '#2f6a5e', '#8a6a3f', '#4a4a6a', '#5e5e5e'];
const IRIS = ['#3b2a20', '#5a3a1f', '#2f5a7a', '#3f6a3a', '#5e5e5e'];
/** hair styles that read as feminine / masculine (0 crop, 1 side part, 2 curls, 3 bun, 4 long, 5 shaved, 6 ponytail, 7 afro, 8 headscarf, 9 braids) */
const STYLES = { f: [1, 2, 3, 4, 4, 6, 6, 7, 8, 9], m: [0, 0, 1, 1, 2, 5, 7] } as const;

export type PortraitLook = {
  skin: string;
  hair: string;
  suit: string;
  bg: [string, string];
  hairStyle: number;
  glasses: number; // 0 none, 1 round, 2 square
  freckles: boolean;
  brow: number;
  smile: number;
  eyeGap: number;
  eyeShape: number;
  iris: string;
  facialHair: number; // 0 none, 1 stubble, 2 moustache, 3 beard
  lashes: boolean;
  earrings: boolean;
  headset: boolean;
  scarf: string;
  patch: number;
  faceW: number;
};

/**
 * Looks come only from the portrait seed, gender and age, so a person looks the same on every screen.
 * The suit colour is drawn first: it is also used for the figure on the base scene.
 */
export function lookFor(seed: number, gender: 'f' | 'm' = 'm', age = 35): PortraitLook {
  const r = new Rng(seed);
  const suit = r.pick(SUIT);
  const f = gender === 'f';
  const hairStyle = r.pick(STYLES[gender]);
  const grayChance = age >= 44 ? 0.6 : age >= 38 ? 0.2 : 0;
  return {
    suit,
    skin: r.pick(SKIN),
    hair: r.next() < grayChance ? r.pick(GRAY) : r.pick(HAIR),
    bg: r.pick(BG),
    hairStyle,
    glasses: r.next() < 0.25 ? r.int(1, 2) : 0,
    freckles: r.next() < 0.15,
    brow: r.int(0, 2),
    smile: r.int(0, 3),
    eyeGap: r.int(0, 2),
    eyeShape: r.int(0, 2),
    iris: r.pick(IRIS),
    facialHair: !f && r.next() < 0.35 ? r.int(1, 3) : 0,
    lashes: f,
    earrings: f && hairStyle !== 8 && r.next() < 0.3,
    headset: r.next() < 0.15,
    scarf: r.pick(SCARF),
    patch: r.int(0, 3),
    faceW: f ? r.int(16, 17) : r.int(17, 19),
  };
}

function HairBack({ l }: { l: PortraitLook }) {
  // drawn behind the face
  switch (l.hairStyle) {
    case 4: // long
      return <path d="M27 50c-3-20 8-31 23-31s26 11 23 31l-3 26c-4-4-8-6-20-6s-16 2-20 6z" fill={l.hair} />;
    case 6: // ponytail
      return <path d="M66 34c10 4 14 16 10 30-2-8-6-14-12-18z" fill={l.hair} />;
    case 7: // afro
      return <circle cx="50" cy="38" r="27" fill={l.hair} />;
    case 8: // headscarf
      return <path d="M24 56c-2-24 10-38 26-38s28 14 26 38c-2 10-6 18-8 22H32c-2-4-6-12-8-22z" fill={l.scarf} />;
    case 9: // braids
      return (
        <g fill={l.hair}>
          <path d="M28 46c-2-16 8-26 22-26s24 10 22 26z" />
          {[0, 1, 2, 3].map((i) => (
            <circle key={`l${i}`} cx="30" cy={52 + i * 7} r="3.6" />
          ))}
          {[0, 1, 2, 3].map((i) => (
            <circle key={`r${i}`} cx="70" cy={52 + i * 7} r="3.6" />
          ))}
        </g>
      );
    default:
      return null;
  }
}

function HairFront({ l }: { l: PortraitLook }) {
  const c = l.hair;
  switch (l.hairStyle) {
    case 0: // short crop
      return <path d="M30 44c0-14 9-22 20-22s20 8 20 22c-4-7-10-10-20-10s-16 3-20 10z" fill={c} />;
    case 1: // side part
      return <path d="M29 46c-1-16 9-25 22-25 12 0 20 9 20 21-6-6-14-11-27-9-6 1-11 6-15 13z" fill={c} />;
    case 2: // curls
      return (
        <g fill={c}>
          {[32, 38, 44, 50, 56, 62, 68].map((x, i) => (
            <circle key={x} cx={x} cy={i % 2 ? 30 : 33} r="7" />
          ))}
          <circle cx="30" cy="40" r="5" />
          <circle cx="70" cy="40" r="5" />
        </g>
      );
    case 3: // bun
      return (
        <g fill={c}>
          <circle cx="50" cy="19" r="7" />
          <path d="M30 44c0-14 9-22 20-22s20 8 20 22c-3-9-10-13-20-13s-17 4-20 13z" />
        </g>
      );
    case 4: // long (fringe)
      return <path d="M30 42c2-12 10-19 20-19s18 7 20 19c-6-6-12-8-20-8s-14 2-20 8z" fill={c} />;
    case 5: // shaved / very short
      return <path d="M32 40c2-10 9-15 18-15s16 5 18 15c-5-4-11-6-18-6s-13 2-18 6z" fill={c} opacity="0.85" />;
    case 6: // ponytail (front)
      return <path d="M30 44c0-14 9-22 20-22s20 8 20 22c-5-8-12-11-20-11s-15 3-20 11z" fill={c} />;
    case 7: // afro (front edge)
      return <path d="M31 40c3-9 10-13 19-13s16 4 19 13c-6-4-12-5-19-5s-13 1-19 5z" fill={c} />;
    case 8: // headscarf (front band)
      return <path d="M31 40c3-11 10-16 19-16s16 5 19 16c-6-4-12-6-19-6s-13 2-19 6z" fill={l.scarf} stroke="#00000022" />;
    case 9: // braids (centre part)
      return <path d="M30 44c0-14 9-22 20-22s20 8 20 22c-4-6-10-10-20-10s-16 4-20 10zM50 22v11" fill={c} stroke={c} />;
    default:
      return null;
  }
}

function PortraitBase({ seed, gender, age, size = 72, title, helmet = true }: { seed: number; gender?: 'f' | 'm'; age?: number; size?: number; title?: string; helmet?: boolean }) {
  const l = lookFor(seed, gender, age);
  const gap = 8 + l.eyeGap;
  const eyeRy = l.eyeShape === 0 ? 2.6 : l.eyeShape === 1 ? 2.1 : 3;
  const id = `p${seed}`;
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={title} className="portrait">
      {title ? <title>{title}</title> : null}
      <defs>
        <clipPath id={`pc-${id}`}>
          <circle cx="50" cy="50" r="48" />
        </clipPath>
        <radialGradient id={`pg-${id}`} cx="35%" cy="25%" r="85%">
          <stop offset="0" stopColor={l.bg[0]} />
          <stop offset="1" stopColor={l.bg[1]} />
        </radialGradient>
      </defs>
      <g clipPath={`url(#pc-${id})`}>
        <rect width="100" height="100" fill={`url(#pg-${id})`} />
        <circle cx="80" cy="18" r="1.2" fill="#fff" opacity="0.6" />
        <circle cx="16" cy="30" r="0.9" fill="#fff" opacity="0.5" />
        <circle cx="86" cy="44" r="0.8" fill="#fff" opacity="0.4" />
        <HairBack l={l} />
        {/* suit with neck ring, name stripe and a mission patch */}
        <path d="M12 100c2-21 17-31 38-31s36 10 38 31z" fill="#e9edf2" />
        <path d="M34 72c4 4 9 6 16 6s12-2 16-6" stroke="#c9d2dc" strokeWidth="4" fill="none" />
        <path d="M36 78h28l-4 9H40z" fill={l.suit} />
        <rect x="58" y="88" width="16" height="4" rx="1.5" fill={l.suit} opacity="0.85" />
        <g transform="translate(28 89)">
          <circle r="5.5" fill={l.suit} stroke="#fff" strokeWidth="1" />
          {l.patch === 0 && <path d="M0 -3l1 2h2l-1.6 1.4.6 2.2L0 1.4-2 2.6l.6-2.2L-3-1h2z" fill="#fff" />}
          {l.patch === 1 && <circle r="2.2" fill="#fff" />}
          {l.patch === 2 && <path d="M-3 1.5l3-4 3 4z" fill="#fff" />}
          {l.patch === 3 && <path d="M-3 0h6M0 -3v6" stroke="#fff" strokeWidth="1.4" />}
        </g>
        {/* neck & face */}
        <rect x="43" y="60" width="14" height="14" rx="5" fill={l.skin} />
        <ellipse cx="50" cy="47" rx={l.faceW} ry="21" fill={l.skin} />
        <ellipse cx={50 - l.faceW + 1} cy="49" rx="2.5" ry="4" fill={l.skin} />
        <ellipse cx={50 + l.faceW - 1} cy="49" rx="2.5" ry="4" fill={l.skin} />
        {l.earrings && (
          <g fill="#f5d36b">
            <circle cx={50 - l.faceW + 0.5} cy="54.5" r="1.3" />
            <circle cx={50 + l.faceW - 0.5} cy="54.5" r="1.3" />
          </g>
        )}
        {l.facialHair === 3 && <path d={`M${50 - l.faceW + 2} 50c1 12 8 18 16 18s15-6 16-18c-4 6-9 8-16 8s-12-2-16-8z`} fill={l.hair} opacity="0.9" />}
        {l.facialHair === 1 && <path d={`M${50 - l.faceW + 3} 52c2 10 8 15 15 15s13-5 15-15c-4 5-9 7-15 7s-11-2-15-7z`} fill={l.hair} opacity="0.28" />}
        <HairFront l={l} />
        {/* eyes */}
        <g>
          <ellipse cx={50 - gap} cy="49" rx="2.4" ry={eyeRy} fill="#1d1d24" />
          <ellipse cx={50 + gap} cy="49" rx="2.4" ry={eyeRy} fill="#1d1d24" />
          <circle cx={50 - gap} cy="49" r="1.2" fill={l.iris} />
          <circle cx={50 + gap} cy="49" r="1.2" fill={l.iris} />
          <circle cx={50 - gap + 0.8} cy="48" r="0.6" fill="#fff" />
          <circle cx={50 + gap + 0.8} cy="48" r="0.6" fill="#fff" />
        </g>
        {l.lashes && (
          <g stroke="#1d1d24" strokeWidth="1" strokeLinecap="round">
            <path d={`M${50 - gap - 2.6} 46.6l-1.4-1.2M${50 + gap + 2.6} 46.6l1.4-1.2`} />
          </g>
        )}
        <g stroke={l.hairStyle === 8 ? '#3b2a20' : l.hair} strokeWidth="2" strokeLinecap="round" fill="none">
          <path d={`M${50 - gap - 4} ${43 - l.brow} q4 -2 8 0`} />
          <path d={`M${50 + gap - 4} ${43 - l.brow} q4 -2 8 0`} />
        </g>
        <path d="M50 50 q-2 5 0 6 q1.5 0.4 2.5 -0.4" stroke="#00000033" strokeWidth="1.3" fill="none" strokeLinecap="round" />
        {l.glasses === 1 && (
          <g stroke="#2b2b33" strokeWidth="1.6" fill="none">
            <circle cx={50 - gap} cy="49" r="5" />
            <circle cx={50 + gap} cy="49" r="5" />
            <path d={`M${50 - gap + 5} 49h${2 * gap - 10}`} />
          </g>
        )}
        {l.glasses === 2 && (
          <g stroke="#2b2b33" strokeWidth="1.6" fill="#ffffff14">
            <rect x={50 - gap - 5} y="45" width="10" height="8" rx="2" />
            <rect x={50 + gap - 5} y="45" width="10" height="8" rx="2" />
            <path d={`M${50 - gap + 5} 49h${2 * gap - 10}`} />
          </g>
        )}
        {l.freckles && (
          <g fill="#a0623f" opacity="0.5">
            <circle cx="40" cy="55" r="0.9" />
            <circle cx="43" cy="57" r="0.9" />
            <circle cx="57" cy="57" r="0.9" />
            <circle cx="60" cy="55" r="0.9" />
          </g>
        )}
        {l.facialHair === 2 && <path d="M43 59.5c3-2.5 5-2.5 7-1 2-1.5 4-1.5 7 1-3 1-5 1-7 0-2 1-4 1-7 0z" fill={l.hair} />}
        {l.smile === 3 ? (
          <path d="M44 59 q6 6 12 0z" fill="#7a3b2e" />
        ) : (
          <path d={`M45 ${59 - l.smile * 0.3} q5 ${2 + l.smile * 1.5} 10 0`} stroke="#7a3b2e" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        )}
        {l.headset && (
          <g stroke="#2b2f36" strokeWidth="2.4" fill="none" strokeLinecap="round">
            <path d={`M${50 - l.faceW - 1} 46a${l.faceW + 1} 20 0 0 1 ${2 * l.faceW + 2} 0`} />
            <rect x={50 + l.faceW - 1} y="43" width="5" height="9" rx="2" fill="#2b2f36" />
            <path d={`M${50 + l.faceW + 1} 52q-3 9-12 9`} strokeWidth="1.6" />
            <circle cx={50 + l.faceW - 11} cy="61" r="1.8" fill="#2b2f36" />
          </g>
        )}
        {helmet ? (
          <g>
            <circle cx="50" cy="50" r="40" fill="none" stroke="#dfe6ee" strokeWidth="5" opacity="0.9" />
            <path d="M22 30a36 36 0 0 1 22-16" stroke="#ffffff" strokeWidth="3" fill="none" opacity="0.5" strokeLinecap="round" />
          </g>
        ) : null}
      </g>
      <circle cx="50" cy="50" r="48" fill="none" stroke={l.suit} strokeWidth="2.5" />
    </svg>
  );
}

export const Portrait = memo(PortraitBase);
