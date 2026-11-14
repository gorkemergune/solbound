import { memo } from 'react';
import { Rng } from '../../engine/rng';

const SKIN = ['#f3d2b8', '#e8b896', '#d29a72', '#b97c56', '#8e5a3c', '#6b4129', '#f0c6a0', '#c48a63'];
const HAIR = ['#1f1a17', '#3b2a20', '#6a4528', '#a8773f', '#d8b36a', '#8b8b8b', '#b2462e', '#2b2d42'];
const SUIT = ['#e07a3f', '#3f8fe0', '#2bb39a', '#e0b43f', '#b05ce0', '#e0566e', '#5c7ee0', '#77b84a'];
const BG = ['#203050', '#2a2540', '#1f3a3a', '#3a2a24', '#28324a', '#30283a'];

export type PortraitLook = {
  skin: string;
  hair: string;
  suit: string;
  bg: string;
  hairStyle: number;
  glasses: boolean;
  freckles: boolean;
  brow: number;
  smile: number;
  eyeGap: number;
};

/** Looks are derived only from the portrait seed, so a person looks the same on every screen. */
export function lookFor(seed: number): PortraitLook {
  const r = new Rng(seed);
  return {
    skin: r.pick(SKIN),
    hair: r.pick(HAIR),
    suit: r.pick(SUIT),
    bg: r.pick(BG),
    hairStyle: r.int(0, 5),
    glasses: r.next() < 0.25,
    freckles: r.next() < 0.3,
    brow: r.int(0, 2),
    smile: r.int(0, 2),
    eyeGap: r.int(0, 2),
  };
}

function Hair({ style, color }: { style: number; color: string }) {
  switch (style) {
    case 0: // short crop
      return <path d="M30 44c0-14 9-22 20-22s20 8 20 22c-4-7-10-10-20-10s-16 3-20 10z" fill={color} />;
    case 1: // side part
      return <path d="M29 46c-1-16 9-25 22-25 12 0 20 9 20 21-6-6-14-11-27-9-6 1-11 6-15 13z" fill={color} />;
    case 2: // curls
      return (
        <g fill={color}>
          {[32, 38, 44, 50, 56, 62, 68].map((x, i) => (
            <circle key={x} cx={x} cy={i % 2 ? 30 : 33} r="7" />
          ))}
          <circle cx="30" cy="40" r="5" />
          <circle cx="70" cy="40" r="5" />
        </g>
      );
    case 3: // bun
      return (
        <g fill={color}>
          <circle cx="50" cy="19" r="7" />
          <path d="M30 44c0-14 9-22 20-22s20 8 20 22c-3-9-10-13-20-13s-17 4-20 13z" />
        </g>
      );
    case 4: // long
      return <path d="M28 48c-2-17 8-27 22-27s24 10 22 27l-2 18c-2-10-3-24-20-27-17 3-18 17-20 27z" fill={color} />;
    default: // shaved / very short
      return <path d="M32 40c2-10 9-15 18-15s16 5 18 15c-5-4-11-6-18-6s-13 2-18 6z" fill={color} opacity="0.85" />;
  }
}

function PortraitBase({ seed, size = 72, title, helmet = true }: { seed: number; size?: number; title?: string; helmet?: boolean }) {
  const l = lookFor(seed);
  const gap = 8 + l.eyeGap;
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={title} className="portrait">
      {title ? <title>{title}</title> : null}
      <defs>
        <clipPath id={`pc-${seed}`}>
          <circle cx="50" cy="50" r="48" />
        </clipPath>
      </defs>
      <g clipPath={`url(#pc-${seed})`}>
        <rect width="100" height="100" fill={l.bg} />
        <circle cx="78" cy="22" r="10" fill="#ffffff" opacity="0.06" />
        {/* suit */}
        <path d="M14 100c2-20 16-30 36-30s34 10 36 30z" fill="#e9edf2" />
        <path d="M36 76h28l-4 10H40z" fill={l.suit} />
        <circle cx="30" cy="88" r="4" fill={l.suit} />
        {/* neck & face */}
        <rect x="43" y="60" width="14" height="14" rx="5" fill={l.skin} />
        <ellipse cx="50" cy="47" rx="18" ry="21" fill={l.skin} />
        <Hair style={l.hairStyle} color={l.hair} />
        {/* eyes */}
        <g fill="#1d1d24">
          <ellipse cx={50 - gap} cy="49" rx="2.2" ry="2.6" />
          <ellipse cx={50 + gap} cy="49" rx="2.2" ry="2.6" />
        </g>
        <g stroke={l.hair} strokeWidth="2" strokeLinecap="round" fill="none">
          <path d={`M${50 - gap - 4} ${43 - l.brow} q4 -2 8 0`} />
          <path d={`M${50 + gap - 4} ${43 - l.brow} q4 -2 8 0`} />
        </g>
        {l.glasses ? (
          <g stroke="#2b2b33" strokeWidth="1.6" fill="none">
            <circle cx={50 - gap} cy="49" r="5" />
            <circle cx={50 + gap} cy="49" r="5" />
            <path d={`M${50 - gap + 5} 49h${2 * gap - 10}`} />
          </g>
        ) : null}
        {l.freckles ? (
          <g fill="#a0623f" opacity="0.5">
            <circle cx="40" cy="55" r="0.9" />
            <circle cx="43" cy="57" r="0.9" />
            <circle cx="57" cy="57" r="0.9" />
            <circle cx="60" cy="55" r="0.9" />
          </g>
        ) : null}
        <path d={`M45 ${59 - l.smile * 0.3} q5 ${2 + l.smile * 1.5} 10 0`} stroke="#7a3b2e" strokeWidth="1.8" fill="none" strokeLinecap="round" />
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
