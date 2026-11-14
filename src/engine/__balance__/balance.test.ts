import { test } from 'vitest';
import { prepared, play } from '../testkit';
import { computeOutcome } from '../outcome';
import { returnStatus } from '../rules';

const cases = [
  { name: 'moonP-careful', dest: 'moon', site: 'polar', cargo: { parts: 1, sealant: 1, food: 2, medkit: 1, potato: 1 }, policy: { PREP: ['radiator', 'insulate', 'clean', 'stow', 'mast', 'berm', 'spares', 'zone', 'beacon'], 'OUT-01': ['full'], 'MOON-01': ['calibrate'], CROP: ['potato'], 'MOON-02': ['patch', 'replace'], 'MOON-03': ['waterWall', 'shelterNow'], SHADOW: ['essentials'], QUAKE: ['inspect'], MICRO: ['patch', 'isolate'], HAYFEVER: ['cleanHab'], WQ: ['reprocess'], SAB: ['sabatier', 'vent'], HARVEST: ['eyes', 'eat'], 'RETURN-01': ['balanced', 'wait'], 'RETURN-02': ['spare', 'reroute'] } },
  { name: 'moonE-noprep', dest: 'moon', site: 'equator', cargo: { parts: 1, sealant: 1, food: 2, medkit: 1 }, policy: { 'OUT-01': ['full'], 'MOON-01': ['calibrate'], 'MOON-02': ['patch', 'replace'], NIGHT: ['hibernate'], 'RETURN-01': ['balanced', 'wait'], 'RETURN-02': ['spare', 'reroute'] } },
  { name: 'moonE-careful', dest: 'moon', site: 'equator', cargo: { parts: 1, sealant: 1, food: 2, medkit: 1 }, policy: { NIGHT: ['wasteHeat', 'eco', 'hibernate'], PREP: ['radiator', 'insulate', 'clean', 'stow', 'mast', 'berm', 'spares', 'zone', 'beacon'], 'OUT-01': ['full'], 'MOON-01': ['calibrate'], 'MOON-02': ['patch', 'replace'], 'MOON-03': ['waterWall', 'shelterNow'], HEAT: ['shade'], QUAKE: ['inspect'], MICRO: ['patch', 'isolate'], WQ: ['reprocess'], 'RETURN-01': ['balanced', 'wait'], 'RETURN-02': ['spare', 'reroute'] } },
  { name: 'moon-empty', dest: 'moon', site: 'polar', cargo: {}, policy: { 'OUT-01': ['rest'], 'MOON-01': ['allOn'], 'MOON-02': ['clean'], 'MOON-03': ['finishSamples'], SHADOW: ['normal'], QUAKE: ['ignore'], MICRO: ['isolate'], HAYFEVER: ['ignore'], WQ: ['drink'], 'RETURN-01': ['allSamples', 'wait', 'ration'], 'RETURN-02': ['repair'] } },
  { name: 'marsS-careful', dest: 'mars', site: 'spring', cargo: { filter: 1, battery: 1, food: 2, parts: 1, seeds: 1 }, policy: { PREP: ['radiator', 'insulate', 'clean', 'stow', 'mast', 'berm', 'spares', 'zone', 'beacon'], 'OUT-01': ['full'], 'MARS-01': ['swapFilter'], 'MARS-02': ['eco'], 'MARS-03': ['replant', 'diagnose'], WIND: ['covers'], GEAR: ['parts', 'clean'], BRINE: ['distill'], WQ: ['reprocess'], HARVEST: ['eat'], 'RETURN-01': ['balanced', 'wait'], 'RETURN-02': ['spare', 'reroute'] } },
  { name: 'marsU-careful', dest: 'mars', site: 'summer', cargo: { filter: 1, battery: 1, food: 2, parts: 1, seeds: 1 }, policy: { PREP: ['radiator', 'insulate', 'clean', 'stow', 'mast', 'berm', 'spares', 'zone', 'beacon'], 'OUT-01': ['full'], 'MARS-01': ['swapFilter'], 'MARS-02': ['hunker', 'eco'], 'MARS-03': ['replant', 'diagnose'], WIND: ['covers'], GEAR: ['parts', 'clean'], BRINE: ['distill'], WQ: ['reprocess'], HARVEST: ['eat'], 'RETURN-01': ['balanced', 'wait'], 'RETURN-02': ['spare', 'reroute'] } },
  { name: 'mars-empty', dest: 'mars', site: 'summer', cargo: {}, policy: { 'OUT-01': ['rest'], 'MARS-01': ['ration'], 'MARS-02': ['fullPower', 'eco'], 'MARS-03': ['salvage'], BRINE: ['raw'], WIND: ['tieDown'], GEAR: ['fixed'], WQ: ['drink'], 'RETURN-01': ['balanced', 'wait', 'ration'], 'RETURN-02': ['repair'] } },
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
