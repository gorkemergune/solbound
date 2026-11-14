// Mission film: a short canvas animation summarising the month, recordable as a video (MediaRecorder)
// or saved as an image card, so players can share it. Everything is drawn from recorded run state.
import { useEffect, useMemo, useRef, useState } from 'react';
import { characterById, computeOutcome, type DaySnapshot, type RunState } from '../../engine';
import { lookFor } from '../art/Portrait';
import { stripGloss } from '../components/RichText';
import { useStore } from '../store';

const W = 720;
const H = 720;
const SCENES = [3, 3.5, 3, 6, 4.5, 3.5, 3.5]; // seconds
export const RECAP_SECONDS = SCENES.reduce((a, b) => a + b, 0);

type Person = { name: string; trait: string; seed: number; status: string };
type Marker = { day: number; label: string; kind: string };
type RecapData = {
  dest: 'moon' | 'mars';
  title: string;
  mission: string;
  site: string;
  commander: string;
  crew: Person[];
  history: DaySnapshot[];
  markers: Marker[];
  moments: { title: string; choice: string; ok: boolean | null }[];
  numbers: { v: number; label: string }[];
  rating: string;
  ratingKey: string;
  home: string;
  labels: Record<'crew' | 'trip' | 'month' | 'moments' | 'numbers' | 'day' | 'food' | 'water' | 'o2' | 'battery', string>;
  footer: string;
};

// ---------- drawing helpers ----------

const ease = (x: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);

function stars(ctx: CanvasRenderingContext2D, t: number) {
  let s = 91;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 140; i++) {
    const x = rnd() * W;
    const y = rnd() * H;
    const r = rnd() * 1.4 + 0.3;
    const tw = 0.5 + 0.5 * Math.sin(t * 2 + i);
    ctx.globalAlpha = 0.25 + 0.55 * tw * rnd();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function planet(ctx: CanvasRenderingContext2D, dest: 'moon' | 'mars', x: number, y: number, r: number) {
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
  if (dest === 'mars') {
    g.addColorStop(0, '#f2a774');
    g.addColorStop(1, '#7a2f1a');
  } else {
    g.addColorStop(0, '#f5f4ef');
    g.addColorStop(1, '#6f747b');
  }
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = dest === 'mars' ? 'rgba(90,30,15,0.35)' : 'rgba(80,84,92,0.4)';
  for (const [dx, dy, rr] of [
    [-0.3, -0.2, 0.12],
    [0.25, 0.15, 0.09],
    [0.05, -0.45, 0.06],
    [-0.1, 0.4, 0.1],
  ]) {
    ctx.beginPath();
    ctx.arc(x + dx * r, y + dy * r, rr * r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function earth(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
  g.addColorStop(0, '#9bd6ff');
  g.addColorStop(0.5, '#2f7fd0');
  g.addColorStop(1, '#0c2547');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(95,154,90,0.7)';
  ctx.beginPath();
  ctx.ellipse(x - r * 0.2, y - r * 0.1, r * 0.35, r * 0.2, 0.5, 0, Math.PI * 2);
  ctx.fill();
}

function face(ctx: CanvasRenderingContext2D, seed: number, x: number, y: number, r: number, dim = false) {
  const l = lookFor(seed);
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = l.bg[0];
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.fillStyle = '#e9edf2';
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.95, r * 0.8, r * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = l.suit;
  ctx.fillRect(x - r * 0.28, y + r * 0.55, r * 0.56, r * 0.14);
  if (l.hairStyle === 7) {
    ctx.fillStyle = l.hair;
    ctx.beginPath();
    ctx.arc(x, y - r * 0.2, r * 0.55, 0, Math.PI * 2);
    ctx.fill();
  }
  if (l.hairStyle === 8) {
    ctx.fillStyle = l.scarf;
    ctx.beginPath();
    ctx.ellipse(x, y - r * 0.02, r * 0.5, r * 0.58, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = l.skin;
  ctx.beginPath();
  ctx.ellipse(x, y - r * 0.05, r * 0.36, r * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
  if (l.hairStyle !== 8) {
    ctx.fillStyle = l.hair;
    ctx.beginPath();
    ctx.ellipse(x, y - r * 0.33, r * 0.38, r * 0.2, 0, Math.PI, 0);
    ctx.fill();
  }
  ctx.fillStyle = '#1d1d24';
  for (const dx of [-0.15, 0.15]) {
    ctx.beginPath();
    ctx.arc(x + dx * r, y - r * 0.04, r * 0.05, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = '#7a3b2e';
  ctx.lineWidth = Math.max(1, r * 0.04);
  ctx.beginPath();
  ctx.arc(x, y + r * 0.1, r * 0.12, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = l.suit;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  if (dim) {
    ctx.fillStyle = 'rgba(7,11,24,0.6)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function text(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, opts: { color?: string; weight?: number; align?: CanvasTextAlign; alpha?: number; font?: string } = {}) {
  ctx.globalAlpha = opts.alpha ?? 1;
  ctx.fillStyle = opts.color ?? '#f1ede6';
  ctx.textAlign = opts.align ?? 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `${opts.weight ?? 600} ${size}px ${opts.font ?? '"Inter Variable", system-ui, sans-serif'}`;
  ctx.fillText(s, x, y);
  ctx.globalAlpha = 1;
}

function wrap(ctx: CanvasRenderingContext2D, s: string, maxW: number, size: number, weight = 500): string[] {
  ctx.font = `${weight} ${size}px "Inter Variable", system-ui, sans-serif`;
  const words = s.split(/\s+/);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(test).width > maxW && cur) {
      lines.push(cur);
      cur = w;
    } else cur = test;
  }
  if (cur) lines.push(cur);
  return lines;
}

function heading(ctx: CanvasRenderingContext2D, s: string, p: number) {
  text(ctx, s.toUpperCase(), W / 2, 92, 30, { weight: 800, alpha: ease(p * 3), font: '"Space Grotesk Variable", system-ui, sans-serif', color: '#f5b041' });
}

/** Draw one frame at time t (seconds). Pure: same data + t → same picture. */
export function drawFrame(ctx: CanvasRenderingContext2D, t: number, d: RecapData) {
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#070b18');
  bg.addColorStop(1, d.dest === 'mars' ? '#2a1410' : '#10141f');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  stars(ctx, t);

  let s = 0;
  let acc = 0;
  while (s < SCENES.length - 1 && t >= acc + SCENES[s]) acc += SCENES[s++];
  const p = (t - acc) / SCENES[s];

  switch (s) {
    case 0: {
      planet(ctx, d.dest, W / 2, H + 260 - ease(p * 1.5) * 120, 420);
      text(ctx, 'SOLBOUND', W / 2, 250, 72, { weight: 800, alpha: ease(p * 2), font: '"Space Grotesk Variable", system-ui, sans-serif' });
      text(ctx, d.mission, W / 2, 310, 30, { alpha: ease(p * 2 - 0.3), color: '#f5b041' });
      text(ctx, d.site, W / 2, 352, 22, { alpha: ease(p * 2 - 0.5), color: '#c9d2dc' });
      text(ctx, d.commander, W / 2, 420, 26, { alpha: ease(p * 2 - 0.8), weight: 700 });
      break;
    }
    case 1: {
      heading(ctx, d.labels.crew, p);
      d.crew.forEach((c, i) => {
        const a = ease(p * 3 - i * 0.35);
        const col = i % 2;
        const row = Math.floor(i / 2);
        const x = 200 + col * 320;
        const y = 230 + row * 230;
        ctx.globalAlpha = a;
        face(ctx, c.seed, x, y - 10 + (1 - a) * 30, 70);
        ctx.globalAlpha = 1;
        text(ctx, c.name, x, y + 95, 24, { weight: 700, alpha: a });
        text(ctx, c.trait, x, y + 125, 18, { alpha: a, color: '#c9d2dc' });
      });
      break;
    }
    case 2: {
      heading(ctx, d.labels.trip, p);
      earth(ctx, 140, 520, 80);
      planet(ctx, d.dest, 590, 300, d.dest === 'mars' ? 70 : 56);
      const k = ease(p * 1.2);
      ctx.strokeStyle = 'rgba(245,176,65,0.5)';
      ctx.setLineDash([6, 10]);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(140, 520);
      ctx.quadraticCurveTo(360, 160, 590, 300);
      ctx.stroke();
      ctx.setLineDash([]);
      const bx = (1 - k) * (1 - k) * 140 + 2 * (1 - k) * k * 360 + k * k * 590;
      const by = (1 - k) * (1 - k) * 520 + 2 * (1 - k) * k * 160 + k * k * 300;
      ctx.fillStyle = '#ffb347';
      ctx.beginPath();
      ctx.arc(bx - 14, by + 4, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#eef2f6';
      ctx.beginPath();
      ctx.ellipse(bx, by, 18, 8, -0.3, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 3: {
      heading(ctx, d.labels.month, p);
      const x0 = 70;
      const x1 = W - 50;
      const y0 = 560;
      const y1 = 200;
      const hist = d.history;
      const maxDay = Math.max(1, hist.at(-1)?.day ?? 30);
      const shown = ease(p * 1.15) * maxDay;
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        const y = y0 - ((y0 - y1) * i) / 4;
        ctx.beginPath();
        ctx.moveTo(x0, y);
        ctx.lineTo(x1, y);
        ctx.stroke();
      }
      const X = (day: number) => x0 + ((x1 - x0) * day) / maxDay;
      const series: [keyof RecapData['labels'], (h: DaySnapshot) => number, string, number][] = [
        ['food', (h) => h.food, '#77b84a', Math.max(...hist.map((h) => h.food), 1)],
        ['water', (h) => h.water, '#4aa3df', Math.max(...hist.map((h) => h.water), 1)],
        ['o2', (h) => h.o2, '#f1ede6', Math.max(...hist.map((h) => h.o2), 1)],
        ['battery', (h) => (h.battery / Math.max(1, h.batteryCap)) * 100, '#f5b041', 100],
      ];
      series.forEach(([key, f, color, max], si) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        ctx.beginPath();
        let started = false;
        for (const h of hist) {
          if (h.day > shown) break;
          const y = y0 - (f(h) / max) * (y0 - y1);
          if (!started) ctx.moveTo(X(h.day), y);
          else ctx.lineTo(X(h.day), y);
          started = true;
        }
        ctx.stroke();
        ctx.fillStyle = color;
        ctx.fillRect(x0 + si * 150, 618, 16, 16);
        text(ctx, d.labels[key], x0 + si * 150 + 24, 632, 17, { align: 'left', color: '#c9d2dc' });
      });
      for (const mk of d.markers) {
        if (mk.day > shown) continue;
        const x = X(mk.day);
        ctx.fillStyle = mk.kind === 'bad' ? '#ff6b6b' : '#f5b041';
        ctx.beginPath();
        ctx.arc(x, y1 - 26, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.save();
        ctx.translate(x + 4, y1 - 38);
        ctx.rotate(-Math.PI / 5);
        text(ctx, mk.label, 0, 0, 15, { align: 'left', color: '#f1ede6' });
        ctx.restore();
      }
      text(ctx, `${d.labels.day} ${Math.max(1, Math.ceil(shown))}`, x1, y0 + 40, 26, { align: 'right', weight: 800 });
      break;
    }
    case 4: {
      heading(ctx, d.labels.moments, p);
      d.moments.forEach((mo, i) => {
        const a = ease(p * 2.6 - i * 0.45);
        const y = 170 + i * 165;
        const x = 60 + (1 - a) * 80;
        ctx.globalAlpha = a;
        ctx.fillStyle = 'rgba(255,255,255,0.07)';
        ctx.fillRect(x, y, W - 120, 140);
        ctx.fillStyle = mo.ok === false ? '#ff6b6b' : '#f5b041';
        ctx.fillRect(x, y, 6, 140);
        ctx.globalAlpha = 1;
        const tl = wrap(ctx, mo.title, W - 170, 24, 700).slice(0, 2);
        tl.forEach((ln, j) => text(ctx, ln, x + 26, y + 40 + j * 30, 24, { align: 'left', weight: 700, alpha: a }));
        const cl = wrap(ctx, `→ ${mo.choice}`, W - 170, 20).slice(0, 2);
        cl.forEach((ln, j) => text(ctx, ln, x + 26, y + 44 + tl.length * 30 + j * 26, 20, { align: 'left', alpha: a, color: '#c9d2dc' }));
      });
      break;
    }
    case 5: {
      heading(ctx, d.labels.numbers, p);
      d.numbers.forEach((n, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const x = 200 + col * 320;
        const y = 230 + row * 150;
        const a = ease(p * 3 - i * 0.2);
        text(ctx, String(Math.round(n.v * ease(p * 1.6 - i * 0.1))), x, y, 64, { weight: 800, alpha: a, font: '"Space Grotesk Variable", system-ui, sans-serif' });
        text(ctx, n.label, x, y + 36, 20, { alpha: a, color: '#c9d2dc' });
      });
      break;
    }
    default: {
      planet(ctx, d.dest, W / 2, H + 300, 440);
      const colour = d.ratingKey === 'success' ? '#5fd39a' : d.ratingKey === 'partial' ? '#f5b041' : '#ff8a8a';
      text(ctx, 'SOLBOUND', W / 2, 84, 26, { weight: 800, color: '#f5b041', font: '"Space Grotesk Variable", system-ui, sans-serif' });
      text(ctx, `${d.mission} · ${d.site}`, W / 2, 120, 20, { color: '#c9d2dc' });
      text(ctx, d.rating, W / 2, 200, 46, { weight: 800, alpha: ease(p * 2), color: colour, font: '"Space Grotesk Variable", system-ui, sans-serif' });
      text(ctx, d.home, W / 2, 248, 22, { alpha: ease(p * 2 - 0.3) });
      d.crew.forEach((c, i) => face(ctx, c.seed, W / 2 - 165 + i * 110, 330, 40, c.status !== 'home'));
      d.crew.forEach((c, i) => text(ctx, c.name.split(' ')[0], W / 2 - 165 + i * 110, 392, 15, { color: '#c9d2dc' }));
      d.numbers.slice(0, 4).forEach((n, i) => {
        const x = 120 + i * 160;
        text(ctx, String(Math.round(n.v)), x, 470, 40, { weight: 800, font: '"Space Grotesk Variable", system-ui, sans-serif' });
        wrap(ctx, n.label, 140, 15).slice(0, 2).forEach((ln, j) => text(ctx, ln, x, 494 + j * 18, 15, { color: '#c9d2dc' }));
      });
      text(ctx, d.footer, W / 2, H - 40, 16, { alpha: 0.8, color: '#c9d2dc' });
    }
  }
}

function useRecapData(run: RunState): RecapData {
  const { t } = useStore();
  return useMemo(() => {
    const m = run.mission!;
    const o = computeOutcome(run);
    const dest = run.destination!;
    const destName = t(`dest.${dest}`);
    const status = (id: string) => {
      const c = m.crew.find((x) => x.id === id)!;
      return c.status === 'active' ? (o.home.includes(id) ? 'home' : 'stayed') : c.status;
    };
    const crew: Person[] = m.crew.map((c) => {
      const ch = characterById(run, c.id);
      return { name: ch.name, trait: t(`trait.${ch.traitId}`), seed: ch.portraitSeed, status: status(c.id) };
    });
    const markers: Marker[] = [
      ...m.big.filter((b) => m.resolved.includes(`${b.hitEventId}@${b.id}`)).map((b) => ({ day: b.startAt / 1440, label: t(`big.${b.kind}`), kind: 'big' })),
      ...m.decisions
        .filter((d) => d.eventId.startsWith('EMG-'))
        .slice(0, 3)
        .map((d) => ({ day: d.minute / 1440, label: stripGloss(t(d.eventId === 'EMG-MED' ? 'ev.EMG-MED.short' : `ev.${d.eventId}.title`, { dest: destName, name: '' })), kind: 'bad' })),
    ];
    const moments = o.keyDecisions.map((d) => ({
      title: stripGloss(t(d.eventId === 'EMG-MED' ? 'ev.EMG-MED.short' : `ev.${d.eventId}.title`, { dest: destName, name: '', names: '' })),
      choice: stripGloss(t(`ev.${d.eventId}.${d.optionId}.label`)),
      ok: d.probability === null ? null : d.success,
    }));
    const preps = m.decisions.filter((d) => d.eventId.startsWith('PREP-') && d.success).length;
    return {
      dest,
      title: 'Solbound',
      mission: t('recap.s.mission', { days: Math.round(o.daysOnSurface), dest: destName }),
      site: t(`site.${run.site}`),
      commander: run.player.name,
      crew,
      history: m.history,
      markers,
      moments,
      numbers: [
        { v: o.science, label: t('recap.n.science') },
        { v: o.harvests, label: t('recap.n.harvests') },
        { v: o.decisions, label: t('recap.n.decisions') },
        { v: o.bigEvents.length, label: t('recap.n.big') },
        { v: preps, label: t('recap.n.preps') },
        { v: o.home.length, label: t('recap.n.home') },
      ],
      rating: t(`debrief.rating.${o.rating}`),
      ratingKey: o.rating,
      home: `${o.home.length}/${m.crew.length} ${t('recap.n.home')}`,
      labels: {
        crew: t('recap.s.crew'),
        trip: t('recap.s.trip'),
        month: t('recap.s.month'),
        moments: t('recap.s.moments'),
        numbers: t('recap.s.numbers'),
        day: t(dest === 'mars' ? 'hud.sol' : 'hud.day', { day: '', total: '' }).replace(/[\s/]+$/, '').trim(),
        food: t('res.food'),
        water: t('res.water'),
        o2: t('res.o2'),
        battery: t('res.battery'),
      },
      footer: t('recap.footer'),
    };
  }, [run, t]);
}

export function shareText(run: RunState, t: (k: string, p?: Record<string, string | number>) => string): string {
  const o = computeOutcome(run);
  return t('recap.summary', {
    crew: run.mission!.crew.length,
    dest: t(`dest.${run.destination}`),
    site: t(`site.${run.site}`),
    days: Math.round(o.daysOnSurface),
    harvests: o.harvests,
    big: o.bigEvents.length,
    science: o.science,
    rating: t(`debrief.rating.${o.rating}`),
  });
}

function pickMime(): string | null {
  if (typeof MediaRecorder === 'undefined') return null;
  for (const m of ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4']) {
    try {
      if (MediaRecorder.isTypeSupported(m)) return m;
    } catch {
      /* ignore */
    }
  }
  return null;
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function RecapReel({ run }: { run: RunState }) {
  const { t } = useStore();
  const data = useRecapData(run);
  const ref = useRef<HTMLCanvasElement>(null);
  const [playing, setPlaying] = useState(false);
  const [recording, setRecording] = useState<number | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [video, setVideo] = useState<Blob | null>(null);
  const raf = useRef(0);
  const mime = useMemo(pickMime, []);
  const canRecord = !!mime && typeof HTMLCanvasElement !== 'undefined' && 'captureStream' in HTMLCanvasElement.prototype;
  const base = `solbound-${run.destination}-${run.seed.toString(36)}`;

  const play = (onEnd?: () => void, onTick?: (t: number) => void) => {
    const c = ref.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    cancelAnimationFrame(raf.current);
    setPlaying(true);
    const start = performance.now();
    const step = (now: number) => {
      const tt = (now - start) / 1000;
      drawFrame(ctx, Math.min(tt, RECAP_SECONDS - 0.01), data);
      onTick?.(tt);
      if (tt < RECAP_SECONDS) raf.current = requestAnimationFrame(step);
      else {
        setPlaying(false);
        onEnd?.();
      }
    };
    raf.current = requestAnimationFrame(step);
  };

  // first frame (and the final card when reduced motion is preferred)
  useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    drawFrame(ctx, reduced ? RECAP_SECONDS - 0.01 : 0.9, data);
    return () => cancelAnimationFrame(raf.current);
  }, [data]);

  const record = () => {
    const c = ref.current;
    if (!c || !mime || recording !== null) return;
    const stream = (c as HTMLCanvasElement & { captureStream: (fps: number) => MediaStream }).captureStream(30);
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 2_500_000 });
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = () => {
      const blob = new Blob(chunks, { type: mime.split(';')[0] });
      setVideo(blob);
      setRecording(null);
      const name = `${base}.${mime.includes('mp4') ? 'mp4' : 'webm'}`;
      download(blob, name);
      setNote(t('recap.saved', { file: name }));
    };
    rec.start(500);
    setRecording(0);
    play(
      () => rec.stop(),
      (tt) => setRecording(Math.floor(tt)),
    );
  };

  const savePng = () => {
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    drawFrame(ctx, RECAP_SECONDS - 0.01, data);
    c.toBlob((b) => {
      if (!b) return;
      download(b, `${base}.png`);
      setNote(t('recap.saved', { file: `${base}.png` }));
    }, 'image/png');
  };

  const share = async () => {
    const textMsg = shareText(run, t);
    try {
      const file = video ? new File([video], `${base}.${video.type.includes('mp4') ? 'mp4' : 'webm'}`, { type: video.type }) : null;
      if (file && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: textMsg, title: 'Solbound' });
        return;
      }
      if (navigator.share) {
        await navigator.share({ text: textMsg, title: 'Solbound' });
        return;
      }
    } catch {
      /* user cancelled or not allowed: fall back to copying */
    }
    copy();
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareText(run, t));
      setNote(t('recap.copied'));
    } catch {
      setNote(shareText(run, t));
    }
  };

  return (
    <section className="card recap">
      <div className="recap-text">
        <h2>{t('recap.title')}</h2>
        <p className="muted">{t('recap.sub')}</p>
        <div className="recap-actions">
          <button type="button" className="btn primary" onClick={() => play()} disabled={playing}>
            ▶ {t('recap.replay')}
          </button>
          {canRecord ? (
            <button type="button" className="btn" onClick={record} disabled={recording !== null}>
              {recording !== null ? t('recap.recording', { s: recording }) : `⬇ ${t('recap.download')}`}
            </button>
          ) : (
            <p className="fine">{t('recap.noVideo')}</p>
          )}
          <button type="button" className="btn" onClick={savePng}>
            🖼 {t('recap.png')}
          </button>
          <button type="button" className="btn" onClick={share}>
            ↗ {t('recap.share')}
          </button>
          <button type="button" className="btn ghost" onClick={copy}>
            ⧉ {t('recap.copy')}
          </button>
        </div>
        {note && (
          <p className="fine recap-note" role="status">
            {note}
          </p>
        )}
        <p className="fine recap-summary">{shareText(run, t)}</p>
      </div>
      <canvas ref={ref} width={W} height={H} className="recap-canvas" aria-label={t('recap.title')} data-testid="recap-canvas" />
    </section>
  );
}
