import { test } from 'vitest';
import { prepared, play, playLaunched, realistic } from '../testkit';
import { computeOutcome } from '../outcome';
import { returnStatus } from '../rules';

const cases = [
  { name: 'moonP-careful', dest: 'moon', site: 'polar', cargo: { parts: 1, sealant: 1, food: 2, medkit: 1, potato: 1 }, policy: { 'REINF-OFFER': ['decline'], PREP: ['radiator', 'insulate', 'clean', 'stow', 'mast', 'berm', 'spares', 'zone', 'beacon', 'wall', 'site', 'power'], 'OUT-01': ['full'], 'MOON-01': ['calibrate'], CROP: ['potato'], 'MOON-02': ['patch', 'replace'], 'MOON-03': ['waterWall', 'shelterNow'], SHADOW: ['essentials'], QUAKE: ['inspect'], MICRO: ['patch', 'isolate'], HAYFEVER: ['cleanHab'], WQ: ['reprocess'], SAB: ['sabatier', 'vent'], HARVEST: ['eyes', 'eat'], 'RETURN-01': ['balanced', 'wait'], 'RETURN-02': ['spare', 'reroute'] } },
  { name: 'moonE-noprep', dest: 'moon', site: 'equator', cargo: { parts: 1, sealant: 1, food: 2, medkit: 1 }, policy: { 'REINF-OFFER': ['decline'], 'OUT-01': ['full'], 'MOON-01': ['calibrate'], 'MOON-02': ['patch', 'replace'], NIGHT: ['hibernate'], 'RETURN-01': ['balanced', 'wait'], 'RETURN-02': ['spare', 'reroute'] } },
  { name: 'moonE-careful', dest: 'moon', site: 'equator', cargo: { parts: 1, sealant: 1, food: 2, medkit: 1 }, policy: { 'REINF-OFFER': ['decline'], NIGHT: ['wasteHeat', 'eco', 'hibernate'], PREP: ['radiator', 'insulate', 'clean', 'stow', 'mast', 'berm', 'spares', 'zone', 'beacon', 'wall', 'site', 'power'], 'OUT-01': ['full'], 'MOON-01': ['calibrate'], 'MOON-02': ['patch', 'replace'], 'MOON-03': ['waterWall', 'shelterNow'], HEAT: ['shade'], QUAKE: ['inspect'], MICRO: ['patch', 'isolate'], WQ: ['reprocess'], 'RETURN-01': ['balanced', 'wait'], 'RETURN-02': ['spare', 'reroute'] } },
  { name: 'moon-empty', dest: 'moon', site: 'polar', cargo: {}, policy: { 'REINF-OFFER': ['decline'], 'OUT-01': ['rest'], 'MOON-01': ['allOn'], 'MOON-02': ['clean'], 'MOON-03': ['finishSamples'], SHADOW: ['normal'], QUAKE: ['ignore'], MICRO: ['isolate'], HAYFEVER: ['ignore'], WQ: ['drink'], 'RETURN-01': ['allSamples', 'wait', 'ration'], 'RETURN-02': ['repair'] } },
  { name: 'marsS-careful', dest: 'mars', site: 'spring', cargo: { filter: 1, battery: 1, food: 2, parts: 1, seeds: 1 }, policy: { PREP: ['radiator', 'insulate', 'clean', 'stow', 'mast', 'berm', 'spares', 'zone', 'beacon', 'wall', 'site', 'power'], 'OUT-01': ['full'], 'MARS-01': ['swapFilter'], 'MARS-02': ['eco'], 'MARS-03': ['replant', 'diagnose'], WIND: ['covers'], GEAR: ['parts', 'clean'], BRINE: ['distill'], WQ: ['reprocess'], HARVEST: ['eat'], 'RETURN-01': ['balanced', 'wait'], 'RETURN-02': ['spare', 'reroute'] } },
  { name: 'marsU-careful', dest: 'mars', site: 'summer', cargo: { filter: 1, battery: 1, food: 2, parts: 1, seeds: 1 }, policy: { PREP: ['radiator', 'insulate', 'clean', 'stow', 'mast', 'berm', 'spares', 'zone', 'beacon', 'wall', 'site', 'power'], 'OUT-01': ['full'], 'MARS-01': ['swapFilter'], 'MARS-02': ['hunker', 'eco'], 'MARS-03': ['replant', 'diagnose'], WIND: ['covers'], GEAR: ['parts', 'clean'], BRINE: ['distill'], WQ: ['reprocess'], HARVEST: ['eat'], 'RETURN-01': ['balanced', 'wait'], 'RETURN-02': ['spare', 'reroute'] } },
  { name: 'mars-empty', dest: 'mars', site: 'summer', cargo: {}, policy: { 'OUT-01': ['rest'], 'MARS-01': ['ration'], 'MARS-02': ['fullPower', 'eco'], 'MARS-03': ['salvage'], BRINE: ['raw'], WIND: ['tieDown'], GEAR: ['fixed'], WQ: ['drink'], 'RETURN-01': ['balanced', 'wait', 'ration'], 'RETURN-02': ['repair'] } },
  { name: 'moonP-reinf', dest: 'moon', site: 'polar', cargo: { parts: 1, sealant: 1, food: 2, medkit: 1, potato: 1 }, policy: { 'MOON-S1': ['call'], 'REINF-OFFER': ['accept'], REINF: ['welcome', 'assemble'], PREP: ['radiator', 'insulate', 'mast', 'berm', 'spares', 'zone', 'beacon', 'wall', 'site', 'power'], 'OUT-01': ['full'], 'MOON-01': ['calibrate'], CROP: ['potato'], 'MOON-02': ['patch', 'replace'], 'MOON-03': ['waterWall', 'pantry', 'shelterNow'], QUAKE: ['inspect'], MICRO: ['patch', 'isolate'], HAYFEVER: ['cleanHab'], WQ: ['reprocess'], SAB: ['sabatier', 'vent'], 'EMG-O2': ['cutLoads', 'repairLS'], 'RETURN-01': ['balanced', 'wait'], 'RETURN-02': ['spare', 'reroute'] } },
] as const;

test('balance report', () => {
  for (const seed of [1, 42, 777]) {
    for (const c of cases) {
      const run = play(prepared({ seed, dest: c.dest, site: c.site, cargo: c.cargo as never }), c.policy as never);
      const m = run.mission!;
      const o = computeOutcome(run);
      const rs = returnStatus(run, m);
      console.log(
        `${seed} ${c.name.padEnd(14)} ${o.rating.padEnd(8)} sci=${o.science} batt=${m.resources.batteryKWh.toFixed(0)}/${m.resources.batteryCapKWh} o2=${m.resources.o2Kg.toFixed(1)} w=${m.resources.waterL.toFixed(0)} food=${m.resources.foodCrewDays.toFixed(1)} harv=${m.harvests} unmetP=${m.unmet.powerKWh.toFixed(0)} o2h=${m.unmet.o2Hours} hp=${m.crew.map((x) => Math.round(x.health) + x.status[0]).join(',')} short=${rs.lines.filter((l) => !l.ok).map((l) => l.key)} n=${m.decisions.length} chats=${m.journal.filter((j) => j.tone === 'chat').length} R=${m.decisions.filter((d) => d.eventId.startsWith('RETURN')).map((d) => d.optionId).join('/')}`,
      );
    }
  }
}, 120_000);

// V3 test follow-up: random crews, real mass budget, normal launch, 8 seeds per case; success rates per site
test('balance report: realistic crews and cargo', () => {
  const P = ['radiator', 'insulate', 'clean', 'stow', 'mast', 'berm', 'spares', 'zone', 'beacon', 'wall'];
  const base = { PREP: P, 'REINF-OFFER': ['decline'], 'OUT-01': ['full'], 'EMG-O2': ['reserve', 'repairLS', 'cutLoads'], 'EMG-WATER': ['reserve', 'repair', 'ration'], 'EMG-MED': ['stabilize', 'medkit', 'medic', 'rest'], 'RETURN-01': ['balanced', 'wait', 'ration'] };
  const sites = [
    ['moon', 'polar', { food: 2, parts: 1, sealant: 1, potato: 1 }],
    ['moon', 'equator', { food: 3, parts: 1, sealant: 1, battery: 1 }],
    ['mars', 'spring', { food: 2, filter: 1, parts: 1, battery: 1 }],
    ['mars', 'summer', { food: 2, filter: 1, parts: 1, cleaner: 1 }],
  ] as const;
  for (const [dest, site, cargo] of sites) {
    const tally: Record<string, number> = {};
    const goals: string[] = [];
    for (let seed = 1; seed <= 8; seed++) {
      const r = playLaunched(realistic({ seed, dest, site, cargo }), { ...base, 'MARS-02': ['hunker', 'eco'], NIGHT: ['wasteHeat', 'eco', 'hibernate'] } as never);
      const o = computeOutcome(r);
      tally[o.rating] = (tally[o.rating] ?? 0) + 1;
      goals.push(`${o.goal.target}/${o.goal.estimate}`);
    }
    console.log(`${dest}/${site} ${JSON.stringify(tally)} goal/estimate=${goals.join(' ')}`);
  }
}, 600_000);
