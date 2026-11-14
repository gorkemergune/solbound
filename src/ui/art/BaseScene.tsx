import type { KeyboardEvent } from 'react';
import { characterById, hourOfDay, type RunState } from '../../engine';
import { Rng } from '../../engine/rng';
import { lookFor } from './Portrait';

export type ModuleId = 'solar' | 'battery' | 'lifeSupport' | 'hab' | 'airlock' | 'water' | 'greenhouse' | 'shelter';

const TASK_MODULE: Record<string, ModuleId | 'outside'> = {
  'MOON-01': 'solar',
  'MOON-S1': 'outside',
  'MOON-02': 'airlock',
  'MOON-S2': 'hab',
  'MOON-03': 'outside',
  'MARS-01': 'water',
  'MARS-S1': 'hab',
  'MARS-02': 'solar',
  'MARS-03': 'greenhouse',
  'EMG-O2': 'lifeSupport',
  'EMG-MED': 'hab',
  CROP: 'greenhouse',
  WQ: 'water',
  SAB: 'lifeSupport',
  WIND: 'outside',
  GEAR: 'solar',
  BRINE: 'water',
  'MARS-SAR': 'outside',
  DEVIL: 'solar',
  QUAKE: 'hab',
  MICRO: 'outside',
  HAYFEVER: 'hab',
  'MOON-SAR': 'outside',
  ISRU: 'outside',
  ICE: 'outside',
  SHADOW: 'solar',
  HEAT: 'outside',
};

const MODULE_X: Record<ModuleId | 'outside', number> = {
  solar: 150,
  battery: 292,
  lifeSupport: 378,
  hab: 520,
  airlock: 622,
  water: 690,
  greenhouse: 810,
  shelter: 935,
  outside: 70,
};

function lerpColor(a: string, b: string, t: number) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (s: number) => [(s >> 16) & 255, (s >> 8) & 255, s & 255];
  const [r1, g1, b1] = ch(pa);
  const [r2, g2, b2] = ch(pb);
  const m = (x: number, y: number) => Math.round(x + (y - x) * t);
  return `rgb(${m(r1, r2)},${m(g1, g2)},${m(b1, b2)})`;
}

function marsSky(minute: number): { top: string; bottom: string; night: number } {
  const h = (minute / 60) % 24;
  // 0 = full day, 1 = full night
  let night: number;
  if (h >= 6 && h <= 18) night = 0;
  else if (h > 18 && h < 20) night = (h - 18) / 2;
  else if (h >= 4 && h < 6) night = 1 - (h - 4) / 2;
  else night = 1;
  return { top: lerpColor('#c98a5c', '#0d1326', night), bottom: lerpColor('#ebbd8f', '#2a2036', night), night };
}

function Astronaut({ x, y, color, label, busy }: { x: number; y: number; color: string; label: string; busy?: boolean }) {
  return (
    <g transform={`translate(${x} ${y})`} className="astro">
      <title>{label}</title>
      <g className={busy ? 'astro-work' : 'astro-bob'}>
        <rect x="-7" y="-22" width="14" height="18" rx="5" fill="#eef2f6" />
        <rect x="-9" y="-20" width="4" height="12" rx="2" fill="#cfd6de" />
        <circle cx="0" cy="-29" r="8" fill="#eef2f6" />
        <rect x="-5" y="-32" width="10" height="6" rx="3" fill="#2e4a6b" />
        <rect x="-4" y="-16" width="8" height="3" rx="1.5" fill={color} />
        <rect x="-6" y="-5" width="5" height="6" rx="2" fill="#d9dee4" />
        <rect x="1" y="-5" width="5" height="6" rx="2" fill="#d9dee4" />
      </g>
    </g>
  );
}

function StatusLight({ x, y, level }: { x: number; y: number; level: 'ok' | 'warn' | 'bad' }) {
  const fill = level === 'ok' ? '#5fd39a' : level === 'warn' ? '#f5b041' : '#ff6b6b';
  return (
    <g transform={`translate(${x} ${y})`}>
      {level === 'ok' ? <circle r="5" fill={fill} /> : level === 'warn' ? <path d="M0 -6l6 10h-12z" fill={fill} /> : <rect x="-5" y="-5" width="10" height="10" fill={fill} />}
    </g>
  );
}

const lvl = (v: number): 'ok' | 'warn' | 'bad' => (v >= 80 ? 'ok' : v >= 50 ? 'warn' : 'bad');

export function BaseScene({ run, onInspect, label, moduleLabel }: { run: RunState; onInspect: (m: ModuleId) => void; label: string; moduleLabel: (m: ModuleId) => string }) {
  const m = run.mission!;
  const dest = run.destination!;
  const sys = m.systems;
  const env = m.env;
  const power = m.lastPower;
  const minute = m.minute;
  const hour = hourOfDay(minute);
  const mars = dest === 'mars';
  const sky = mars ? marsSky(minute) : { top: '#04060c', bottom: '#0b0f1a', night: 0 };
  const ground1 = mars ? '#b8603a' : '#8d9299';
  const ground2 = mars ? '#6e2a17' : '#575b62';
  const batteryFrac = m.resources.batteryKWh / m.resources.batteryCapKWh;
  const ghLight = m.greenhouseMode === 'full' ? 1 : m.greenhouseMode === 'eco' ? 0.45 : 0.05;
  const ghServed = power?.servedFraction.greenhouse ?? 1;
  const lsServed = power?.servedFraction.lifeSupport ?? 1;
  const plantH = 6 + (sys.greenhouseGrowth / 100) * 26;
  const plantColor = lerpColor('#8a6a3a', '#5fbf5a', sys.greenhouseHealth / 100);
  const generating = (power?.generationKW ?? 0) > 0.5;
  const isNight = hour >= 22 || hour < 6;
  const airlockClosed = !!m.flags.airlockClosed;

  const keyAct = (id: ModuleId) => (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onInspect(id);
    }
  };
  const mod = (id: ModuleId) => ({
    role: 'button',
    tabIndex: 0,
    'aria-label': moduleLabel(id),
    onClick: () => onInspect(id),
    onKeyDown: keyAct(id),
    className: 'module',
  });

  // ---- crew placement (derived from engine state only) ----
  const lowest = (['lifeSupport', 'waterRecycler', 'solar', 'seal'] as const).reduce((a, b) => (sys[b] < sys[a] ? b : a));
  const lowestModule: ModuleId = lowest === 'lifeSupport' ? 'lifeSupport' : lowest === 'waterRecycler' ? 'water' : lowest === 'solar' ? 'solar' : 'airlock';
  const slots: Record<string, number> = {};
  const crewFigs = m.crew
    .filter((c) => c.status === 'active')
    .map((c) => {
      const ch = characterById(run, c.id);
      const color = lookFor(ch.portraitSeed).suit;
      let place: ModuleId | 'outside' | 'inside' = 'inside';
      let busy = false;
      if (c.sheltered) place = 'shelter';
      else if (c.taskId) {
        const evId = c.taskId.split(':')[0].split('@')[0].replace(/#\d+$/, '');
        place = TASK_MODULE[evId] ?? 'hab';
        busy = true;
      } else if (isNight || run.phase !== 'surface') place = 'inside';
      else if (c.routine === 'maintenance') place = lowestModule;
      else if (c.routine === 'science') place = mars ? 'greenhouse' : 'outside';
      else place = 'inside';
      if (place === 'airlock' && airlockClosed) place = 'hab';
      const key = place;
      slots[key] = (slots[key] ?? 0) + 1;
      const n = slots[key] - 1;
      return { c, ch, color, place, busy, n };
    });

  const r = new Rng(m.journalSeq + 3);
  const dustParticles = mars && env.dust > 0.2 ? Array.from({ length: 26 }, (_, i) => ({ x: r.next() * 1000, y: 80 + r.next() * 330, d: 3 + (i % 5) })) : [];

  return (
    <svg viewBox="0 0 1000 520" className="base-scene" role="group" aria-label={label}>
      <defs>
        <linearGradient id="bs-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={sky.top} />
          <stop offset="1" stopColor={sky.bottom} />
        </linearGradient>
        <linearGradient id="bs-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={ground1} />
          <stop offset="1" stopColor={ground2} />
        </linearGradient>
        <radialGradient id="bs-ghglow" cx="50%" cy="70%" r="60%">
          <stop offset="0" stopColor="#d9ffb0" stopOpacity={0.9 * ghLight * ghServed} />
          <stop offset="1" stopColor="#d9ffb0" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1000" height="520" fill="url(#bs-sky)" />
      {/* stars: always on the Moon, at night on Mars */}
      {(!mars || sky.night > 0.3) && (
        <g opacity={mars ? sky.night : 1}>
          {Array.from({ length: 70 }, (_, i) => {
            const rr = new Rng(i * 97 + 13);
            return <circle key={i} cx={rr.next() * 1000} cy={rr.next() * 300} r={rr.next() * 1.3 + 0.3} fill="#fff" opacity={0.3 + rr.next() * 0.6} />;
          })}
        </g>
      )}
      {!mars && (
        <g>
          <circle cx="830" cy="90" r="34" fill="#2a6fb8" />
          <path d="M812 78c10-8 24-6 28 4-6 2-14 8-24 6z" fill="#dfeedd" opacity="0.8" />
          <circle cx="60" cy="300" r="13" fill="#fffbe6" />
          <circle cx="60" cy="300" r="34" fill="#fffbe6" opacity="0.07" />
        </g>
      )}
      {mars && sky.night < 0.8 && <circle cx={180 + ((hour - 5) / 14) * 640} cy={250 - Math.sin(Math.PI * Math.min(1, Math.max(0, (hour - 5) / 14))) * 170} r="13" fill="#fff6e0" opacity={(1 - env.dust) * (1 - sky.night)} />}
      {/* SPE streaks */}
      {env.speHours > 0 && (
        <g className="spe" aria-hidden="true">
          {Array.from({ length: 12 }, (_, i) => (
            <path key={i} d={`M${-50 + i * 90} ${30 + (i % 4) * 25} l120 60`} stroke="#ffe08a" strokeWidth="2" opacity="0.55" strokeLinecap="round" />
          ))}
        </g>
      )}
      {/* far hills */}
      <path d={mars ? 'M0 360 L90 300 L170 340 L300 270 L420 340 L520 310 L640 350 L760 290 L880 340 L1000 320 V520 H0z' : 'M0 370 C 150 340, 260 360, 400 344 S 700 330, 1000 352 V520 H0z'} fill={mars ? '#9a4f30' : '#6c7178'} opacity="0.8" />
      <path d="M0 400 C 200 388, 400 404, 600 394 S 850 386, 1000 398 V520 H0z" fill="url(#bs-ground)" />

      {/* ---- solar array ---- */}
      <g {...mod('solar')}>
        <rect x="40" y="280" width="230" height="140" fill="transparent" />
        {[0, 1, 2].map((i) => (
          <g key={i} transform={`translate(${70 + i * 70} 330)`}>
            <path d="M0 0v60" stroke="#9aa4b0" strokeWidth="4" />
            <g transform="rotate(-16)">
              <rect x="-30" y="-34" width="60" height="34" fill="#1f3f66" stroke="#9cc3ea" strokeWidth="2" />
              <path d="M-30 -17h60M-10 -34v34M10 -34v34" stroke="#9cc3ea" strokeWidth="1" opacity="0.7" />
              <rect x="-30" y="-34" width="60" height="34" fill={mars ? '#b36a3c' : '#a9acb2'} opacity={(100 - sys.solar) / 110} />
              {generating && <rect x="-30" y="-34" width="60" height="34" fill="#ffffff" opacity="0.08" className="glint" />}
            </g>
          </g>
        ))}
        <path d="M70 392 C 160 410, 220 410, 292 400" stroke={generating ? '#f5b041' : '#5a5f68'} strokeWidth="3" fill="none" strokeDasharray={generating ? '6 6' : undefined} className={generating ? 'flow' : undefined} />
        <StatusLight x={250} y={300} level={lvl(sys.solar)} />
      </g>

      {/* ---- battery ---- */}
      <g {...mod('battery')}>
        <rect x="270" y="350" width="46" height="56" rx="6" fill="#d9dee4" stroke="#9aa4b0" strokeWidth="2" />
        <rect x="285" y="344" width="16" height="7" rx="2" fill="#9aa4b0" />
        <rect x="276" y={356 + 44 * (1 - batteryFrac)} width="34" height={44 * batteryFrac} rx="3" fill={batteryFrac > 0.4 ? '#5fd39a' : batteryFrac > 0.15 ? '#f5b041' : '#ff6b6b'} />
        <path d="M296 366l-8 14h8l-4 12" stroke="#2b2f36" strokeWidth="2" fill="none" opacity="0.6" />
      </g>

      {/* ---- life support ---- */}
      <g {...mod('lifeSupport')}>
        <rect x="336" y="340" width="86" height="66" rx="10" fill="#e3e8ee" stroke="#9aa4b0" strokeWidth="2" />
        <circle cx="365" cy="372" r="18" fill="#2e3b4c" />
        <g className="fan" style={{ animationDuration: `${lsServed > 0.05 ? 1.6 / lsServed : 0}s`, animationPlayState: lsServed > 0.05 ? 'running' : 'paused' }}>
          <g transform="translate(365 372)">
            <path d="M0 0l-4-15h8z M0 0l15-4v8z M0 0l4 15h-8z M0 0l-15 4v-8z" fill="#9fb3c8" />
          </g>
        </g>
        <text x="402" y="378" textAnchor="middle" fontSize="13" fontWeight="700" fill="#2e4a6b">O₂</text>
        <path d="M422 372h22" stroke="#9aa4b0" strokeWidth="6" />
        <StatusLight x={410} y={350} level={lsServed < 0.99 ? 'bad' : lvl(sys.lifeSupport)} />
      </g>

      {/* ---- habitat ---- */}
      <g {...mod('hab')}>
        <path d="M444 406v-62c0-32 34-52 76-52s76 20 76 52v62z" fill="#eef2f6" stroke="#9aa4b0" strokeWidth="2.5" />
        <path d="M452 360h136" stroke="#c9d2dc" strokeWidth="2" />
        {[478, 520, 562].map((x) => (
          <rect key={x} x={x - 12} y="320" width="24" height="22" rx="8" fill={isNight ? '#ffd27a' : '#2e4a6b'} opacity={isNight ? 0.95 : 1} />
        ))}
        <rect x="500" y="372" width="40" height="34" rx="6" fill="#c9d2dc" />
        <text x="520" y="394" textAnchor="middle" fontSize="12" fontWeight="700" fill="#2e4a6b">HAB</text>
      </g>

      {/* ---- airlock (Moon seal) ---- */}
      <g {...mod('airlock')}>
        <rect x="596" y="356" width="52" height="50" rx="8" fill="#d9dee4" stroke="#9aa4b0" strokeWidth="2" />
        <circle cx="622" cy="380" r="14" fill={airlockClosed ? '#7a2f2f' : '#56616e'} stroke="#b9c2cc" strokeWidth="3" />
        {airlockClosed && <path d="M612 370l20 20M632 370l-20 20" stroke="#ffd166" strokeWidth="3" />}
        {env.leakKgH > 0 && (
          <g className="leak" fill="#dfe6ee">
            <circle cx="646" cy="364" r="3" />
            <circle cx="656" cy="356" r="2.2" />
            <circle cx="664" cy="350" r="1.6" />
          </g>
        )}
        <StatusLight x={640} y={364} level={env.leakKgH > 0 ? 'bad' : lvl(sys.seal)} />
      </g>

      {/* ---- water recycler ---- */}
      <g {...mod('water')}>
        <rect x="664" y="330" width="52" height="76" rx="10" fill="#e3e8ee" stroke="#9aa4b0" strokeWidth="2" />
        <rect x="670" y={340 + 58 * (1 - Math.min(1, m.resources.waterL / 140))} width="40" height={58 * Math.min(1, m.resources.waterL / 140)} rx="4" fill="#4aa3df" opacity="0.85" />
        {(power?.servedFraction.water ?? 1) > 0.05 && sys.waterRecycler > 5 && <circle cx="690" cy="326" r="4" fill="#4aa3df" className="drip" />}
        <StatusLight x={710} y={338} level={lvl(sys.waterRecycler)} />
      </g>

      {/* ---- greenhouse ---- */}
      <g {...mod('greenhouse')}>
        <path d="M736 406v-36a74 54 0 0 1 148 0v36z" fill="url(#bs-ghglow)" />
        <path d="M736 406v-36a74 54 0 0 1 148 0v36z" fill="#d7f0e0" opacity="0.28" stroke="#e8f5ec" strokeWidth="2.5" />
        <path d="M760 340v66M810 318v88M860 340v66" stroke="#e8f5ec" strokeWidth="1.5" opacity="0.6" />
        {[752, 770, 788, 806, 824, 842, 860].map((x, i) => (
          <g key={x}>
            <path d={`M${x} 402v-${plantH + (i % 3) * 3}`} stroke={plantColor} strokeWidth="3" strokeLinecap="round" />
            <ellipse cx={x + (i % 2 ? 5 : -5)} cy={402 - plantH * 0.6} rx="6" ry="3" fill={plantColor} />
            <ellipse cx={x + (i % 2 ? -4 : 4)} cy={402 - plantH * 0.9} rx="5" ry="2.6" fill={plantColor} />
          </g>
        ))}
        <rect x="740" y="400" width="140" height="6" fill="#7a5a3a" />
        <StatusLight x={872} y={350} level={env.wilt > 0 ? 'bad' : lvl(sys.greenhouseHealth)} />
      </g>

      {/* ---- shelter ---- */}
      <g {...mod('shelter')}>
        <path d="M894 406c0-36 18-58 42-58s42 22 42 58z" fill={mars ? '#8e4528' : '#6f747b'} stroke={env.speHours > 0 ? '#ffe08a' : '#4a4e55'} strokeWidth={env.speHours > 0 ? 4 : 2} className={env.speHours > 0 ? 'shelter-glow' : undefined} />
        <rect x="924" y="378" width="24" height="28" rx="4" fill="#2b2f36" />
        {sys.shelter >= 70 && <path d="M902 400c4-26 18-42 34-42" stroke="#4aa3df" strokeWidth="5" fill="none" opacity="0.8" />}
      </g>

      {/* ---- greenhouse cover (Mars) ---- */}
      {mars && (m.ghCover === 'closed' || (m.ghCover === 'auto' && isNight)) && (
        <path d="M732 406v-38a78 58 0 0 1 156 0v38z" fill="#c9b79a" stroke="#8a7a5f" strokeWidth="2.5" opacity="0.92" pointerEvents="none" />
      )}
      {/* ---- Sabatier reactor ---- */}
      {m.h2Mode === 'sabatier' && (
        <g pointerEvents="none">
          <rect x="398" y="312" width="26" height="28" rx="5" fill="#f3b5a0" stroke="#9aa4b0" strokeWidth="2" />
          <path d="M411 312 v-10" stroke="#9aa4b0" strokeWidth="3" />
          <circle cx="411" cy="298" r="3" fill="#cfd6de" className="drip" />
        </g>
      )}
      {/* ---- polar ridge shadow ---- */}
      {env.darkHours > 0 && <path d="M0 260 L120 230 L300 300 L300 520 L0 520 Z" fill="#000" opacity="0.6" pointerEvents="none" />}
      {/* ---- lunar noon heat shimmer ---- */}
      {env.heatHours > 0 && (
        <g pointerEvents="none" opacity="0.6">
          {[360, 420, 560, 700].map((x) => (
            <path key={x} d={`M${x} 330 q6 -10 0 -20 q-6 -10 0 -20`} stroke="#ff9f6b" strokeWidth="2" fill="none" className="haze" />
          ))}
        </g>
      )}

      {/* ---- dust haze ---- */}
      {mars && env.dust > 0 && <rect width="1000" height="520" fill="#c27b4c" opacity={env.dust * 0.55} className="haze" pointerEvents="none" />}
      {dustParticles.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="1.6" fill="#f1c9a0" opacity="0.7" className="dust-mote" style={{ animationDuration: `${p.d}s` }} pointerEvents="none" />
      ))}
      {/* night tint on Mars */}
      {mars && sky.night > 0 && <rect width="1000" height="520" fill="#0a1030" opacity={sky.night * 0.35} pointerEvents="none" />}

      {/* ---- crew ---- */}
      <g pointerEvents="none">
        {crewFigs.map(({ c, ch, color, place, busy, n }) => {
          if (place === 'inside') {
            const x = 478 + n * 42;
            return (
              <g key={c.id} transform={`translate(${x} 336)`}>
                <title>{ch.name}</title>
                <circle r="6" fill="#eef2f6" />
                <rect x="-4" y="-3" width="8" height="4" rx="2" fill={color} />
              </g>
            );
          }
          const x = MODULE_X[place] + (n - 0.5) * 22 + (place === 'outside' ? 0 : -10);
          const y = place === 'outside' ? 430 : 438;
          return <Astronaut key={c.id} x={x} y={y} color={color} label={ch.name} busy={busy} />;
        })}
      </g>
    </svg>
  );
}
