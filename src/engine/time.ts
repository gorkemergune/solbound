// Mission time vs. Earth time. Pure helpers for the HUD's "time awareness" line.
import { Rng, deriveSeed } from './rng';
import { EQUATOR_PHASE0, LUNAR_CYCLE_H, SURFACE_START_MINUTE } from './scenarios';
import { realTimeAt } from './spaceweather';
import type { RunState } from './types';

/** Mars solar day: 24 h 39 min 35.244 s (NASA GISS Mars24). The Mars base clock runs in local Mars hours. */
export const SOL_SECONDS = 24 * 3600 + 39 * 60 + 35.244;
export const SOL_TO_EARTH = SOL_SECONDS / 86400; // ≈ 1.0275
/** To an observer on the Moon an Earth clock appears to lose about 58.7 µs per Earth day (NASA, Lunar Time). */
export const LUNAR_DRIFT_US_PER_DAY = 58.7;

/** Earth minutes elapsed since the surface clock started. On Mars every local minute is 1.0275 Earth minutes. */
export function earthMinutesElapsed(run: RunState, minute: number): number {
  const local = Math.max(0, minute - SURFACE_START_MINUTE);
  return run.destination === 'mars' ? local * SOL_TO_EARTH : local;
}

/** How far the base clock has drifted from Earth's clock: Mars in minutes, Moon in microseconds. */
export function clockDrift(run: RunState, minute: number): { unit: 'min' | 'us'; value: number } {
  const local = Math.max(0, minute - SURFACE_START_MINUTE);
  if (run.destination === 'mars') return { unit: 'min', value: local * (SOL_TO_EARTH - 1) };
  return { unit: 'us', value: (local / 1440) * LUNAR_DRIFT_US_PER_DAY };
}

// ---------- Earth–Mars distance (JPL "Approximate Positions of the Planets", Table 1, 1800–2050) ----------
// Keplerian elements at J2000 and their rates per Julian century. Stated accuracy for Mars: ~25 000 km in
// distance, far below what matters for light time. Verified in tests against JPL Horizons output.
type Elements = [a: number, e: number, I: number, L: number, peri: number, node: number];
const EM_BARY: [Elements, Elements] = [
  [1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0.0],
  [0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0.0],
];
const MARS: [Elements, Elements] = [
  [1.52371034, 0.0933941, 1.84969142, -4.55343205, -23.94362959, 49.55953891],
  [0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343],
];
const RAD = Math.PI / 180;
/** Astronomical unit in km and the speed of light in km/s (IAU values). */
export const AU_KM = 149_597_870.7;
export const C_KM_S = 299_792.458;

function helio([el0, rate]: [Elements, Elements], T: number): [number, number, number] {
  const [a, e, I, L, peri, node] = el0.map((v, i) => v + rate[i] * T);
  const w = peri - node;
  let M = (L - peri) % 360;
  if (M > 180) M -= 360;
  if (M < -180) M += 360;
  const Mr = M * RAD;
  let E = Mr + e * Math.sin(Mr);
  for (let i = 0; i < 30; i++) {
    const d = (E - e * Math.sin(E) - Mr) / (1 - e * Math.cos(E));
    E -= d;
    if (Math.abs(d) < 1e-12) break;
  }
  const xp = a * (Math.cos(E) - e);
  const yp = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const [cw, sw, cO, sO, cI, sI] = [Math.cos(w * RAD), Math.sin(w * RAD), Math.cos(node * RAD), Math.sin(node * RAD), Math.cos(I * RAD), Math.sin(I * RAD)];
  return [
    (cw * cO - sw * sO * cI) * xp + (-sw * cO - cw * sO * cI) * yp,
    (cw * sO + sw * cO * cI) * xp + (-sw * sO + cw * cO * cI) * yp,
    sw * sI * xp + cw * sI * yp,
  ];
}

/** Earth–Mars distance in AU at a UTC time (ms since epoch). */
export function marsDistanceAU(ms: number): number {
  const jd = ms / 86_400_000 + 2440587.5;
  const T = (jd - 2451545.0) / 36525;
  const e = helio(EM_BARY, T);
  const m = helio(MARS, T);
  return Math.hypot(m[0] - e[0], m[1] - e[1], m[2] - e[2]);
}

/** One-way light time in minutes for a distance in AU. */
export function lightMinutes(au: number): number {
  return (au * AU_KM) / C_KM_S / 60;
}

/**
 * One-way signal delay to Earth. Moon: about 1.3 light-seconds. Mars: from the real Earth–Mars distance
 * on the mission's real date (mission day 1 = first day of the NASA data window). Without real data a
 * seeded value in the published 4–21 minute range is used.
 */
export function signalDelay(run: RunState, minute: number): { unit: 's' | 'min'; value: number; computed: boolean } {
  if (run.destination !== 'mars') return { unit: 's', value: 1.3, computed: false };
  if (run.spaceWeather) return { unit: 'min', value: lightMinutes(marsDistanceAU(realTimeAt(run.spaceWeather, minute))), computed: true };
  const start = 4 + new Rng(deriveSeed(run.seed, 'delay')).next() * 15;
  const drift = (Math.max(0, minute) / 1440) * 0.05;
  return { unit: 'min', value: Math.min(21, start + drift), computed: false };
}

/** Lunar equator: local Sun state; fraction of the 29.5-day lunar cycle and hours to the next sunset/sunrise. */
export function lunarSun(minute: number): { up: boolean; hoursToChange: number; cycle: number } {
  const h = minute / 60;
  const phase = (h / LUNAR_CYCLE_H + EQUATOR_PHASE0) % 1;
  const up = phase < 0.5;
  const toChange = ((up ? 0.5 : 1) - phase) * LUNAR_CYCLE_H;
  return { up, hoursToChange: toChange, cycle: phase };
}
