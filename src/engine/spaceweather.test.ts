import { describe, expect, it } from 'vitest';
import fallback from '../live/donki-fallback.json';
import { normalize, windowFor } from '../live/donki';
import { must, play, prepared } from './testkit';
import { bulletinPlan, cmeBigEvents, swMinute, type SpaceWeatherSnapshot } from './spaceweather';
import { lightMinutes, marsDistanceAU, signalDelay } from './time';
import { buildBigEvents } from './bigevents';
import { scenarioFor } from './scenarios';
import { applyCommand } from './commands';

const snap = fallback as SpaceWeatherSnapshot;

// JPL Horizons, Mars from geocenter (500@399), delta (AU) and 1-way light time (min); fetched 2026-11-14.
const HORIZONS: [string, number, number][] = [
  ['2025-01-01', 0.6567204829, 5.46177771],
  ['2025-08-08', 2.1551354081, 17.92371464],
  ['2026-01-01', 2.4106987674, 20.04917029],
  ['2026-10-20', 1.5272521965, 12.7017692],
  ['2026-11-14', 1.324362018, 11.01438304],
  ['2027-03-15', 0.7348155725, 6.11127477],
  ['2028-05-26', 2.4095304977, 20.03945409],
  ['2028-12-31', 1.2450300373, 10.35459908],
];

describe('Earth–Mars distance (JPL approximate positions) vs JPL Horizons', () => {
  it('matches Horizons within 0.5% over 2025–2028', () => {
    for (const [d, au, lt] of HORIZONS) {
      const mine = marsDistanceAU(Date.parse(`${d}T00:00Z`));
      expect(Math.abs(mine - au) / au).toBeLessThan(0.005);
      expect(Math.abs(lightMinutes(mine) - lt)).toBeLessThan(0.1);
    }
  });
});

describe('NASA DONKI snapshot', () => {
  it('normalises raw DONKI JSON: CME model arrivals at Mars / Earth, storms, bad rows ignored', () => {
    const recs = normalize({
      CME: [
        {
          activityID: 'X-CME-1',
          startTime: '2026-10-26T09:48Z',
          link: 'https://example/cme',
          cmeAnalyses: [
            { isMostAccurate: false, speed: 500, type: 'S', enlilList: [] },
            {
              isMostAccurate: true,
              speed: 681,
              type: 'C',
              enlilList: [{ estimatedShockArrivalTime: '2026-10-29T06:00Z', isEarthGB: true, impactList: [{ location: 'Mars', arrivalTime: '2026-10-30T18:00Z', isGlancingBlow: false }, { location: 'Psyche', arrivalTime: '2026-10-28T00:00Z' }] }],
            },
          ],
        },
        { activityID: 'broken' },
      ],
      GST: [{ gstID: 'G1', startTime: '2026-10-31T18:00Z', allKpIndex: [{ kpIndex: 5 }, { kpIndex: 6 }], link: 'l' }],
      FLR: 'not an array',
    });
    expect(recs).toHaveLength(2);
    const c = recs.find((r) => r.kind === 'cme')!;
    expect(c).toMatchObject({ speed: 681, cls: 'C', arrivalMars: '2026-10-30T18:00Z', glancingMars: false, arrivalEarth: '2026-10-29T06:00Z', glancingEarth: true });
    expect(recs.find((r) => r.kind === 'gst')!.cls).toBe('Kp 6');
    expect(windowFor(Date.parse('2026-11-14T12:00Z'))).toEqual({ start: '2026-10-15', end: '2026-11-14' });
  });

  it('turns real CME arrivals into at most three countdowns, two days apart, inside the month', () => {
    for (const dest of ['mars', 'moon'] as const) {
      const ev = cmeBigEvents(snap, dest, []);
      expect(ev.length).toBeGreaterThan(0);
      expect(ev.length).toBeLessThanOrEqual(3);
      for (const e of ev) {
        expect(e.announceAt).toBeLessThan(e.startAt);
        expect(e.startAt).toBeLessThan(30 * 1440);
        const r = snap.records[e.swIndex!];
        expect(swMinute(snap, dest === 'mars' ? r.arrivalMars! : r.arrivalEarth!)).toBe(e.startAt);
      }
      const starts = ev.map((e) => e.startAt).sort((a, b) => a - b);
      for (let i = 1; i < starts.length; i++) expect(starts[i] - starts[i - 1]).toBeGreaterThanOrEqual(2 * 1440);
    }
    // CMEs never collide with the scenario's own big events
    const big = buildBigEvents(3, scenarioFor('mars', 'summer'), [], snap);
    const other = big.filter((b) => b.kind !== 'cme').map((b) => b.startAt);
    for (const b of big.filter((x) => x.kind === 'cme')) for (const o of other) expect(Math.abs(b.startAt - o)).toBeGreaterThanOrEqual(2 * 1440);
  });

  it('the snapshot is frozen at launch: same seed + same data = same mission; bulletins and real CMEs appear', () => {
    const withSw = (seed: number) => {
      const r = prepared({ seed, dest: 'mars', site: 'spring', cargo: { food: 2, filter: 1, parts: 1 } });
      return must(r, { type: 'setSpaceWeather', snapshot: snap });
    };
    const policy = { PREP: ['wall', 'plan', 'clean', 'stow', 'zone'], CME: ['planned', 'shelter'] };
    const a = play(withSw(11), policy);
    const b = play(withSw(11), policy);
    expect(a.mission!.journal).toEqual(b.mission!.journal);
    expect(a.mission!.journal.filter((j) => j.tone === 'sw').length).toBe(bulletinPlan(snap, 'mars').length);
    expect(a.mission!.decisions.some((d) => d.eventId === 'CME')).toBe(true);
    expect(a.mission!.decisions.some((d) => d.eventId === 'FC-CME')).toBe(true);
    // after launch the data cannot be swapped
    expect(applyCommand(a, { type: 'setSpaceWeather', snapshot: null }).error).toBe('err.launched');
  });

  it('signal delay uses the real date when NASA data is attached', () => {
    const r = must(prepared({ dest: 'mars' }), { type: 'setSpaceWeather', snapshot: snap });
    const d = signalDelay(r, 30 * 1440);
    expect(d.computed).toBe(true);
    expect(d.value).toBeGreaterThan(4);
    expect(d.value).toBeLessThan(21);
    // mission day 30 = last day of the window
    expect(Math.abs(d.value - lightMinutes(marsDistanceAU(Date.parse(`${snap.rangeEnd}T00:00Z`))))).toBeLessThan(0.01);
    expect(signalDelay(prepared({ dest: 'mars' }), 0).computed).toBe(false);
  });
});
