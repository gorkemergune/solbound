import { useEffect, useRef, useState } from 'react';
import { LandingCard, landingName } from '../components/LandingInfo';
import {
  bigStatus,
  RESEARCH,
  RESEARCH_BY_ID,
  scenarioOf,
  activeCrew,
  characterById,
  type CoverMode,
  type GreenhouseMode,
  type Speed,
  type Routine,
  type RunState,
} from '../../engine';
import { formatFixed, listFormat } from '../../i18n';
import { BaseScene, type ModuleId } from '../art/BaseScene';
import { Portrait } from '../art/Portrait';
import { Landscape, TransitScene, WaterLoopDiagram } from '../art/Scenes';
import { RichText } from '../components/RichText';
import { EventCard, ResultCard } from '../components/EventCard';
import { InfoTip, LangSwitch, Modal, StatBar, clockParts } from '../components/common';
import { useLocale, useStore } from '../store';
import { journalText, swLink } from '../text';
import { useMissionClock, type PauseReason } from '../useMissionClock';
import { Brand } from './Title';
import { CountdownChips, CrewAboard, PrepPanel, TimeAwareness } from './MissionExtras';
import { ReturnHomeModal } from '../components/ReturnHome';

// ---------------- transit (outbound / return flight) ----------------

export function TransitScreen({ direction }: { direction: 'out' | 'back' }) {
  const { run, t, pending } = useStore();
  const r = run!;
  const [progress, setProgress] = useState(0);
  // cruise to the midpoint before the first decision (~7 s), then the rest of the way after it
  const target = pending ? 1 : 0.5;
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  useEffect(() => {
    if (reduced) {
      setProgress(target);
      return;
    }
    let raf = 0;
    const from = progress;
    const start = performance.now();
    const ms = target === 1 ? 3500 : 7000;
    const step = (now: number) => {
      const k = Math.min(1, (now - start) / ms);
      const eased = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      setProgress(from + (target - from) * eased);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [reduced, target]); // eslint-disable-line react-hooks/exhaustive-deps
  const arrived = progress >= 0.5 - 1e-3;
  const showEvent = r.mission?.activeEvent && !pending;
  return (
    <div className={`transit theme-${r.destination}`}>
      <MiniHeader title={direction === 'out' ? t('transit.outbound', { dest: t(`dest.${r.destination}`) }) : t('transit.return')} />
      <main id="main" className="transit-main">
        <div className="transit-scene">
          <TransitScene dest={r.destination!} direction={direction} progress={progress} />
          <div className="transit-progress" aria-live="off">
            <strong>{direction === 'out' ? t('transit.cruise', { dest: t(`dest.${r.destination}`) }) : t('transit.return')}</strong>
            <span>{t('transit.toGo', { p: Math.round(progress * 100) })}</span>
            <span className="tp-bar">
              <span style={{ width: `${Math.round(progress * 100)}%` }} />
            </span>
          </div>
          <CrewAboard run={r} />
          {!arrived && !pending && (
            <button type="button" className="btn ghost skip" onClick={() => setProgress(0.5)}>
              {t('app.skip')} »
            </button>
          )}
        </div>
        <div className="transit-panel">
          {pending ? <ResultCard run={r} /> : arrived && showEvent ? <EventCard key={r.mission!.activeEvent!.instanceId} run={r} /> : null}
        </div>
      </main>
    </div>
  );
}

function MiniHeader({ title }: { title: string }) {
  const { quitToTitle, t } = useStore();
  return (
    <header className="topbar">
      <button type="button" className="brand-btn" onClick={quitToTitle} aria-label={t('hud.menu')}>
        <Brand small />
      </button>
      <h1 className="topbar-title">{title}</h1>
      <LangSwitch compact />
    </header>
  );
}

// ---------------- chatter bubble ----------------

/** Shows the latest crew conversation over the scene for a few real seconds, whatever the game speed. */
function ChatBubble({ run }: { run: RunState }) {
  const { t } = useStore();
  const m = run.mission!;
  const last = [...m.journal].reverse().find((j) => j.tone === 'chat');
  const [shownId, setShownId] = useState<number | null>(null);
  useEffect(() => {
    if (!last) return;
    setShownId(last.id);
    const id = window.setTimeout(() => setShownId(null), 9000);
    return () => window.clearTimeout(id);
  }, [last?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!last || shownId !== last.id || m.activeEvent) return null;
  const p = last.params ?? {};
  const lines = t(last.key, p).split('\n');
  const people = [String(p.aId ?? ''), String(p.bId ?? '')].map((id) => m.crew.find((c) => c.id === id)).filter(Boolean);
  return (
    <div className="chat-bubble" aria-live="polite">
      {lines.map((line, i) => {
        const c = people[i];
        const ch = c ? characterById(run, c.id) : null;
        return (
          <p key={i} className={`chat-line ${i % 2 ? 'b' : 'a'}`}>
            {ch && <Portrait seed={ch.portraitSeed} gender={ch.gender} age={ch.profile.age} size={30} />}
            <span>
              <RichText text={line} />
            </span>
          </p>
        );
      })}
    </div>
  );
}

// ---------------- landing ----------------

export function LandingScreen() {
  const { run, t, dispatch } = useStore();
  const locale = useLocale();
  const r = run!;
  const m = r.mission!;
  const dest = r.destination!;
  const pre = (m.flags.preflight as string) ?? 'none';
  const res = m.resources;
  const items = Object.entries(m.items).filter(([, q]) => q);
  return (
    <div className={`landing theme-${dest}`}>
      <MiniHeader title={t('landing.heading', { dest: t(`dest.${dest}`) })} />
      <main id="main" className="landing-main">
        <div className="landing-art">
          <Landscape dest={dest} />
        </div>
        <section className="card landing-card">
          <h2>{t('landing.heading', { dest: t(`dest.${dest}`) })}</h2>
          <p className="muted">{t('landing.sub')}</p>
          <LandingCard id={r.landing} />
          <p className="good-line">{t('land.goal', { e: m.goal.estimate, t: m.goal.target })}</p>
          <p className={pre === 'none' ? 'warn-line' : 'good-line'}>{t(`landing.preflight.${pre}`)}</p>
          <ul className="landing-stats">
            <li>
              {t('res.battery')}: {formatFixed(locale, res.batteryKWh, 0)} / {res.batteryCapKWh} kWh
            </li>
            <li>{t('res.o2')}: {t('res.kg', { v: formatFixed(locale, res.o2Kg, 1) })}</li>
            <li>{t('res.water')}: {t('res.l', { v: formatFixed(locale, res.waterL, 0) })}</li>
            <li>{t('res.food')}: {t('res.crewDays', { v: formatFixed(locale, res.foodCrewDays, 0) })}</li>
            <li>{t('sys.lifeSupport')}: {Math.round(m.systems.lifeSupport)}%</li>
            <li>{t('sys.shelter')}: {Math.round(m.systems.shelter)}%</li>
          </ul>
          {items.length > 0 && (
            <p className="fine">
              {t('landing.cargoApplied')}: {listFormat(locale, items.map(([id, q]) => `${t(`item.${id}`)} × ${q}`))}
            </p>
          )}
          <p className="fine">{t('brief.timeRule')}</p>
          <button type="button" className="btn primary huge" onClick={() => dispatch({ type: 'beginSurface' })}>
            {t('landing.start')}
          </button>
        </section>
      </main>
    </div>
  );
}

// ---------------- surface ----------------

function hoursLeft(stock: number, perHour: number) {
  return perHour < -1e-6 ? stock / -perHour : Infinity;
}

function ResourceStrip({ run }: { run: RunState }) {
  const { t } = useStore();
  const locale = useLocale();
  const m = run.mission!;
  const r = m.resources;
  const f = m.lastFlows;
  const ev = f?.eva ?? { people: 0, o2: 0, water: 0, kwh: 0 };
  const o2Rate = f ? f.o2Prod + f.moxieProd - f.o2Use - f.leak - ev.o2 : 0;
  const waterRate = f ? f.waterRecovered + f.sabatierWater - f.crewWater - f.electrolysisWater - f.greenhouseWater - ev.water : 0;
  const foodRate = f ? -f.foodUse : 0;
  const left = (h: number) => (h === Infinity ? t('res.stable') : h > 72 ? t('res.daysLeft', { d: formatFixed(locale, h / 24, 0) }) : t('res.hoursLeft', { h: Math.floor(h) }));
  const fx = (v: number, d = 2) => (v >= 0 ? '+' : '−') + formatFixed(locale, Math.abs(v), d);
  const battPct = (r.batteryKWh / r.batteryCapKWh) * 100;
  const items = [
    {
      key: 'battery',
      label: t('res.battery'),
      value: `${formatFixed(locale, r.batteryKWh, 0)}/${r.batteryCapKWh} kWh`,
      sub: `${Math.round(battPct)}%`,
      level: battPct > 40 ? 'good' : battPct > 15 ? 'mid' : 'low',
      why: f && m.lastPower && (
        <>
          <span>{t('power.gen')}: {formatFixed(locale, m.lastPower.generationKW, 1)} kW</span>
          <span>{t('power.demand')}: {formatFixed(locale, m.lastPower.demandKW, 1)} kW</span>
          <span>Δ {fx(f.batteryDelta, 1)} kWh/h</span>
          <em>{t('R-BATTERY.inGame')}</em>
        </>
      ),
    },
    {
      key: 'o2',
      label: t('res.o2'),
      value: t('res.kg', { v: formatFixed(locale, r.o2Kg, 1) }),
      sub: left(hoursLeft(r.o2Kg, o2Rate)),
      level: hoursLeft(r.o2Kg, o2Rate) > 48 ? 'good' : hoursLeft(r.o2Kg, o2Rate) > 18 ? 'mid' : 'low',
      why: f && (
        <>
          <span>{t('power.lifeSupport')}: {fx(f.o2Prod)} kg/h</span>
          {f.moxieProd > 0 && <span>{t('power.moxie')}: {fx(f.moxieProd)} kg/h</span>}
          <span>{t('crewPanel.title')}: {fx(-f.o2Use)} kg/h</span>
          {f.leak > 0 && <span>{t('sys.seal')}: {fx(-f.leak)} kg/h</span>}
          {ev.people > 0 && <span>{t('eva.suits', { n: ev.people })}: {fx(-ev.o2)} kg/h</span>}
          <em>{t('rule.o2Production')}</em>
        </>
      ),
    },
    {
      key: 'water',
      label: t('res.water'),
      value: t('res.l', { v: formatFixed(locale, r.waterL, 0) }),
      sub: left(hoursLeft(r.waterL, waterRate)),
      level: hoursLeft(r.waterL, waterRate) > 96 ? 'good' : hoursLeft(r.waterL, waterRate) > 36 ? 'mid' : 'low',
      why: f && (
        <>
          <span>{t('sys.waterRecycler')}: {fx(f.waterRecovered)} L/h</span>
          <span>{t('crewPanel.title')}: {fx(-f.crewWater)} L/h</span>
          <span>O₂ (elektroliz/electrolysis): {fx(-f.electrolysisWater)} L/h</span>
          <span>{t('power.greenhouse')}: {fx(-f.greenhouseWater)} L/h</span>
          {f.sabatierWater > 0 && <span>{t('power.sabatier')}: {fx(f.sabatierWater)} L/h</span>}
          {ev.people > 0 && <span>{t('eva.suits', { n: ev.people })}: {fx(-ev.water)} L/h</span>}
          <em>{t('rule.electrolysisWater')}</em>
        </>
      ),
    },
    {
      key: 'food',
      label: t('res.food'),
      value: t('res.crewDays', { v: formatFixed(locale, r.foodCrewDays, 1) }),
      sub: left(hoursLeft(r.foodCrewDays, foodRate)),
      level: r.foodCrewDays > 12 ? 'good' : r.foodCrewDays > 5 ? 'mid' : 'low',
      why: (
        <>
          <span>{t('sys.greenhouseGrowth')}: {Math.round(m.systems.greenhouseGrowth)}%</span>
          <em>{t('gh.compressed')}</em>
        </>
      ),
    },
    {
      key: 'science',
      label: t('res.science'),
      value: t('res.pts', { v: Math.round(r.science) }),
      sub: '',
      level: 'neutral',
      why: null,
    },
  ];
  return (
    <ul className="res-strip">
      {items.map((it) => (
        <li key={it.key} className={`res res-${it.key} lvl-${it.level}`}>
          <span className="res-label">{it.label}</span>
          <span className="res-value">{it.value}</span>
          <span className="res-sub">{it.sub}</span>
          {it.why && (
            <InfoTip
              label={
                <>
                  <span className="why-full">{t('res.why')}</span>
                  <span className="why-short" aria-hidden="true">?</span>
                </>
              }
              className="res-why"
            >
              <span className="why-list">{it.why}</span>
            </InfoTip>
          )}
        </li>
      ))}
    </ul>
  );
}

function Hud({ run, reason, onPlan, onReturn }: { run: RunState; reason: PauseReason; onPlan: () => void; onReturn: () => void }) {
  const { t, dispatch, quitToTitle } = useStore();
  const m = run.mission!;
  const s = scenarioOf(run);
  const { day, hh, mm } = clockParts(m.minute);
  const surface = run.phase === 'surface';
  const statusKey = !surface
    ? `phase.${run.phase}`
    : reason === 'decision'
      ? 'hud.pausedDecision'
      : reason === 'research'
        ? 'hud.pausedResearch'
        : reason === 'manual'
          ? 'hud.pausedManual'
          : reason === 'hidden'
            ? 'hud.pausedHidden'
            : 'hud.running';
  return (
    <header className="hud">
      <div className="hud-row">
        <button type="button" className="brand-btn" onClick={quitToTitle} aria-label={t('hud.menu')}>
          <Brand small />
        </button>
        <div className="clock" aria-live="off">
          <span className="clock-dest">{t(`dest.${run.destination}`)}</span>
          <span className="clock-day">{t(run.destination === 'mars' ? 'hud.sol' : 'hud.dayOf', { day: Math.min(day, s.missionDays), total: s.missionDays })}</span>
          <span className="clock-time" title={t(run.destination === 'mars' ? 'time.localMars' : 'time.localMoon')}>
            {t('hud.time', { hh, mm })}
          </span>
        </div>
        <div className={`status ${surface && reason ? 'paused' : 'running'}`} role="status">
          <span className="status-dot" aria-hidden="true" />
          {t(statusKey)}
        </div>
        {surface && (
          <div className="hud-controls">
            <button type="button" className="btn" onClick={() => dispatch({ type: 'setPause', paused: !run.manualPause })} aria-pressed={run.manualPause}>
              {run.manualPause ? `▶ ${t('hud.resume')}` : `❚❚ ${t('hud.pause')}`}
            </button>
            {typeof m.flags.departAt === 'number' ? (
              <span className="btn ghost go-home booked" role="status">
                ⌂ {t('ret.booked')}
              </span>
            ) : (
              <button type="button" className="btn ghost go-home" onClick={onReturn} disabled={!!run.mission?.activeEvent}>
                ⌂ {t('ret.button')}
              </button>
            )}
            <div className="speed" role="group" aria-label={t('hud.speed', { x: run.speed })}>
              <span className="speed-label">{t('hud.speedLabel')}</span>
              {([1, 2, 4, 8, 16] as Speed[]).map((x) => (
                <button key={x} type="button" className={run.speed === x ? 'on' : ''} aria-pressed={run.speed === x} onClick={() => dispatch({ type: 'setSpeed', speed: x })}>
                  {x}×
                </button>
              ))}
            </div>
          </div>
        )}
        <LangSwitch compact />
      </div>
      {run.mission && run.phase === 'surface' && (
        <div className="hud-sub">
          <TimeAwareness run={run} />
          <CountdownChips run={run} onOpen={onPlan} />
        </div>
      )}
      <ResourceStrip run={run} />
    </header>
  );
}

const MODULE_SYS: Partial<Record<ModuleId, string[]>> = {
  solar: ['solar'],
  lifeSupport: ['lifeSupport'],
  water: ['waterRecycler'],
  greenhouse: ['greenhouseHealth', 'greenhouseGrowth'],
  shelter: ['shelter'],
  airlock: ['seal'],
};

function BasePanel({ run, inspect, setInspect }: { run: RunState; inspect: ModuleId | null; setInspect: (m: ModuleId | null) => void }) {
  const { t, dispatch } = useStore();
  const locale = useLocale();
  const m = run.mission!;
  const p = m.lastPower;
  const loads = ['lifeSupport', 'thermal', 'water', 'sabatier', 'moxie', 'greenhouse'] as const;
  return (
    <div className="panel-body">
      {inspect && (
        <section className="inspect card-inset">
          <div className="card-head">
            <h3>{t(`base.module.${inspect === 'water' ? 'water' : inspect}`)}</h3>
            <button type="button" className="icon-btn" aria-label={t('research.close')} onClick={() => setInspect(null)}>
              ×
            </button>
          </div>
          <p>{t(`base.module.${inspect}.desc`)}</p>
          {(MODULE_SYS[inspect] ?? []).map((k) => (
            <StatBar key={k} label={t(`sys.${k}`)} value={m.systems[k as keyof typeof m.systems]} suffix="%" />
          ))}
          {inspect === 'battery' && <StatBar label={t('res.battery')} value={m.resources.batteryKWh} max={m.resources.batteryCapKWh} suffix=" kWh" />}
        </section>
      )}
      <section>
        <h3>{t('power.title')}</h3>
        {p ? (
          <>
            <p className="fine">
              {t('power.gen')}: <strong>{formatFixed(locale, p.generationKW, 1)} kW</strong> · {t('power.demand')}: <strong>{formatFixed(locale, p.demandKW, 1)} kW</strong>
            </p>
            {p.generationKW < 1 && <p className="fine">{t('power.night')}</p>}
            {m.env.dust > 0 && <p className="fine">{t('power.dust', { pct: Math.round(m.env.dust * 100) })}</p>}
            {m.flags.loadShift && <p className="fine">{t('power.loadShift')}</p>}
            {m.env.darkHours > 0 && <p className="warn-line">{t('power.shadow')}</p>}
            {m.env.heatHours > 0 && <p className="warn-line">{t('power.heat')}</p>}
            <ol className="loads">
              {loads
                .filter((k) => (k !== 'moxie' || (m.items.moxie ?? 0) > 0) && (k !== 'sabatier' || m.h2Mode === 'sabatier'))
                .map((k) => (
                  <li key={k} className={p.servedFraction[k] < 0.999 ? 'shed' : ''}>
                    <span>{t(`power.${k}`)}</span>
                    <span>{t('power.served', { pct: Math.round(p.servedFraction[k] * 100) })}</span>
                  </li>
                ))}
            </ol>
            {p.unmetKWh > 0.01 && <p className="warn-line">{t('power.unmet', { v: formatFixed(locale, p.unmetKWh, 1) })}</p>}
          </>
        ) : (
          <p className="fine">—</p>
        )}
        <p className="fine">{t('power.priority')}</p>
      </section>
      <section>
        <h3>{t('gh.title')}</h3>
        <div className="seg" role="radiogroup" aria-label={t('gh.title')}>
          {(['full', 'eco', 'off'] as GreenhouseMode[]).map((g) => (
            <button key={g} type="button" role="radio" aria-checked={m.greenhouseMode === g} className={m.greenhouseMode === g ? 'on' : ''} disabled={run.phase !== 'surface'} onClick={() => dispatch({ type: 'setGreenhouse', mode: g })}>
              <strong>{t(`gh.${g}`)}</strong>
              <span>{t(`gh.${g}.desc`)}</span>
            </button>
          ))}
        </div>
        <p className="fine">
          {t('gh.crop', { crop: t(`crop.${m.crop}`) })} · {t('sys.greenhouseGrowth')} {Math.round(m.systems.greenhouseGrowth)}%
        </p>
        <p className="fine">{t('gh.compressed')}</p>
      </section>
      {run.destination === 'mars' && (
        <section>
          <h3>{t('cover.title')}</h3>
          <div className="seg" role="radiogroup" aria-label={t('cover.title')}>
            {(['auto', 'open', 'closed'] as CoverMode[]).map((c) => (
              <button key={c} type="button" role="radio" aria-checked={m.ghCover === c} className={m.ghCover === c ? 'on' : ''} disabled={run.phase !== 'surface'} onClick={() => dispatch({ type: 'setCover', mode: c })}>
                <strong>{t(`cover.${c}`)}</strong>
                <span>{t(`cover.${c}.desc`)}</span>
              </button>
            ))}
          </div>
          <p className="fine">{t('cover.note')}</p>
        </section>
      )}
      <section>
        <h3>{t('h2.title')}</h3>
        <p className="fine">
          <RichText text={t(`h2.${m.h2Mode}`)} />
        </p>
      </section>
      <section>
        <h3>{t('base.title')}</h3>
        {(['lifeSupport', 'waterRecycler', 'solar', 'seal', 'greenhouseHealth', 'greenhouseGrowth', 'shelter'] as const)
          .filter((k) => run.destination === 'moon' || k !== 'seal')
          .map((k) => (
            <StatBar key={k} label={t(`sys.${k}`)} value={m.systems[k]} suffix="%" />
          ))}
      </section>
    </div>
  );
}

function CrewPanel({ run }: { run: RunState }) {
  const { t, dispatch } = useStore();
  const m = run.mission!;
  return (
    <div className="panel-body crew-panel">
      {m.crew.map((c) => {
        const ch = characterById(run, c.id);
        const task = m.tasks.find((x) => x.id === c.taskId);
        return (
          <article key={c.id} className={`crew-card status-${c.status}`}>
            <div className="crew-card-head">
              <Portrait seed={ch.portraitSeed} gender={ch.gender} age={ch.profile.age} size={48} title={ch.name} />
              <div>
                <strong>
                  {ch.name}
                  {ch.isPlayer ? ` (${t('crew.you')})` : ''}
                </strong>
                <span className="fine">{t(`trait.${ch.traitId}`)}</span>
                <span className="crew-state fine">
                  {c.status === 'evacuated'
                    ? t('crewPanel.evacuated')
                    : c.status === 'deceased'
                      ? t('crewPanel.deceased')
                      : task
                        ? t('crewPanel.task', { task: t(`ev.${task.eventId}.${task.optionId}.label`) })
                        : c.sheltered
                          ? t('crewPanel.sheltered')
                          : t(`routine.${c.routine}`)}
                </span>
              </div>
            </div>
            {c.status === 'active' && (
              <>
                <StatBar label={t('crewPanel.health')} value={c.health} />
                <StatBar label={t('crewPanel.stress')} value={c.stress} invert />
                <StatBar label={t('crewPanel.fatigue')} value={c.fatigue} invert />
                {c.radiation > 0.5 && <StatBar label={t('crewPanel.radiation')} value={c.radiation} invert />}
                <div className="seg small" role="radiogroup" aria-label={`${t('crewPanel.routine')}: ${ch.name}`}>
                  {(['maintenance', 'science', 'rest'] as Routine[]).map((rt) => (
                    <button key={rt} type="button" role="radio" aria-checked={c.routine === rt} className={c.routine === rt ? 'on' : ''} title={t(`routine.${rt}.desc`)} onClick={() => dispatch({ type: 'setRoutine', crewId: c.id, routine: rt })}>
                      {t(`routine.${rt}`)}
                    </button>
                  ))}
                </div>
              </>
            )}
          </article>
        );
      })}
      <p className="fine">{t('crewPanel.indexNote')}</p>
      <ul className="fine routine-help">
        {(['maintenance', 'science', 'rest'] as Routine[]).map((rt) => (
          <li key={rt}>
            <strong>{t(`routine.${rt}`)}:</strong> {t(`routine.${rt}.desc`)}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function JournalList({ run, limit }: { run: RunState; limit?: number }) {
  const { t } = useStore();
  const m = run.mission!;
  const entries = m.journal.slice().reverse().slice(0, limit ?? m.journal.length);
  if (!entries.length) return <p className="fine">{t('journal.empty')}</p>;
  return (
    <ol className="journal">
      {entries.map((j) => {
        const { day, hh, mm } = clockParts(j.minute);
        const stamp = ['outbound', 'landing', 'briefing'].includes(j.phase) ? t('hud.transit') : j.phase === 'returnFlight' || j.phase === 'debrief' ? t('return.flight') : `${t('hud.day', { day })} ${hh}:${mm}`;
        return (
          <li key={j.id} className={`j-${j.tone}`}>
            <span className="j-stamp">{stamp}</span>
            <span className="j-text">
              <RichText text={journalText(t, run, j)} />
              {j.tone === 'sw' && swLink(run, j.params?.rec) && (
                <>
                  {' '}
                  <a className="sw-link" href={swLink(run, j.params?.rec)!} target="_blank" rel="noopener noreferrer">
                    NASA ↗
                  </a>
                </>
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function ResearchPanel({ run }: { run: RunState }) {
  const { t, openResearch } = useStore();
  const m = run.mission!;
  const cards = RESEARCH.filter((c) => c.appliesTo.includes(run.destination!));
  return (
    <div className="panel-body">
      <p className="fine">{t('research.sub')}</p>
      <ul className="research-list">
        {cards.map((c) => (
          <li key={c.id}>
            <button type="button" className="research-item" onClick={() => openResearch(c.id)}>
              <span className={`kind kind-${c.kind}`}>{t(`research.kind.${c.kind}`)}</span>
              <strong>{t(`${c.id}.title`)}</strong>
              <span className={m.research.includes(c.id) ? 'read' : 'new-dot'}>{m.research.includes(c.id) ? t('research.read') : t('research.unread')}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ResearchModal() {
  const { run, researchOpen, openResearch, dispatch, t } = useStore();
  const card = researchOpen ? RESEARCH_BY_ID[researchOpen] : null;
  useEffect(() => {
    if (card && run?.mission && !run.mission.research.includes(card.id)) dispatch({ type: 'study', researchId: card.id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card?.id]);
  if (!card) return null;
  const unlocks = card.unlocks.map((u) => {
    const [ev, opt] = u.split(':');
    return t(`ev.${ev}.${opt}.label`);
  });
  return (
    <Modal title={t(`${card.id}.title`)} onClose={() => openResearch(null)} wide>
      <div className="research-card">
        <div className="card-head">
          <span className={`kind kind-${card.kind}`}>{t(`research.kind.${card.kind}`)}</span>
          <button type="button" className="icon-btn" aria-label={t('research.close')} onClick={() => openResearch(null)}>
            ×
          </button>
        </div>
        <h2>{t(`${card.id}.title`)}</h2>
        <p className="pause-note">{t('hud.pausedResearch')}</p>
        {card.id === 'R-LOOP' && (
          <WaterLoopDiagram
            labels={{
              water: t('loop.water'),
              electro: t('loop.electro'),
              o2: 'O₂',
              h2: 'H₂',
              crew: t('loop.crew'),
              co2: 'CO₂',
              sabatier: t('loop.sabatier'),
              ch4: t('loop.ch4'),
              recycler: t('loop.recycler'),
            }}
          />
        )}
        <h3>{t('research.claim')}</h3>
        <p>
          <RichText text={t(`${card.id}.claim`)} />
        </p>
        <h3>{t('research.inGame')}</h3>
        <p>
          <RichText text={t(`${card.id}.inGame`)} />
        </p>
        {card.gameRules.length > 0 && (
          <>
            <h3>
              {t('research.rules')} <span className="kind kind-gameplay">{t('research.kind.gameplay')}</span>
            </h3>
            <ul>
              {card.gameRules.map((g) => (
                <li key={g}>{t(`rule.${g}`)}</li>
              ))}
            </ul>
          </>
        )}
        {unlocks.length > 0 && <p className="echo">✦ {t('research.unlocks', { list: unlocks.join(', ') })}</p>}
        {card.sources.length > 0 && (
          <>
            <h3>{t('research.sources', { date: card.accessedAt })}</h3>
            <ul className="sources">
              {card.sources.map((s) => (
                <li key={s.url}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer">
                    {s.title}
                  </a>
                </li>
              ))}
            </ul>
          </>
        )}
        <p className="fine">{t('research.notNasa')}</p>
        <button type="button" className="btn primary" onClick={() => openResearch(null)}>
          {t('research.close')}
        </button>
      </div>
    </Modal>
  );
}

type Tab = 'base' | 'prep' | 'crew' | 'log' | 'research';

export function SurfaceScreen() {
  const { run, t, pending } = useStore();
  const r = run!;
  const m = r.mission!;
  const reason = useMissionClock();
  const [tab, setTab] = useState<Tab>('base');
  const [inspect, setInspect] = useState<ModuleId | null>(null);
  const [returning, setReturning] = useState(false);
  // forecasts no longer stop the clock: the newest one shows as a banner for a day and a half
  const lastFc = [...m.journal].reverse().find((j) => j.tone === 'forecast');
  const [hiddenFc, setHiddenFc] = useState<number | null>(null);
  const showFc = lastFc && m.minute - lastFc.minute < 36 * 60 && hiddenFc !== lastFc.id;
  const showEvent = !!m.activeEvent && !pending;
  const crewActive = activeCrew(m).length;
  // "Open the preparation plan" on a forecast card switches to the Plan tab
  const lastDecision = m.decisions.at(-1);
  useEffect(() => {
    if (lastDecision?.eventId.startsWith('FC-') && lastDecision.optionId === 'plan') setTab('prep');
  }, [lastDecision?.instanceId]); // eslint-disable-line react-hooks/exhaustive-deps
  const prepLive = m.big.some((b) => bigStatus(b, m.minute) === 'countdown');
  // a new card below the scene: bring it into view if it starts below the fold
  const dockRef = useRef<HTMLDivElement>(null);
  const cardKey = pending ? 'pending' : m.activeEvent?.instanceId;
  useEffect(() => {
    const el = dockRef.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top;
    if (top > window.innerHeight - 160) el.scrollIntoView({ behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }, [cardKey]);
  return (
    <div className={`surface theme-${r.destination}`}>
      <Hud run={r} reason={reason} onPlan={() => setTab('prep')} onReturn={() => setReturning(true)} />
      {returning && <ReturnHomeModal run={r} onClose={() => setReturning(false)} />}
      <main id="main" className="surface-main">
        <div className={`scene-wrap ${showEvent || pending ? 'has-event' : ''}`}>
          {showFc && lastFc && (
            <div className="fc-banner" role="status">
              <span className="fc-tag">📡 {t('fc.banner')}</span>
              <span className="fc-text">{journalText(t, r, lastFc)}</span>
              <button type="button" className="btn small primary" onClick={() => setTab('prep')}>
                {t('fc.open')}
              </button>
              <button type="button" className="btn small ghost" onClick={() => setHiddenFc(lastFc.id)}>
                {t('fc.dismiss')}
              </button>
            </div>
          )}
          <div className="scene-stage">
            <BaseScene
              run={r}
              focus={showEvent ? m.activeEvent!.eventId : null}
              label={`${t('base.title')} — ${t(`dest.${r.destination}`)}`}
              moduleLabel={(mm) => t('base.inspect', { module: t(`base.module.${mm}`) })}
              onInspect={(mm) => {
                setInspect(mm);
                setTab('base');
              }}
            />
            <ChatBubble run={r} />
          </div>
          {(showEvent || pending) && (
            <div className="event-dock" ref={dockRef}>
              {pending ? <ResultCard run={r} /> : <EventCard key={m.activeEvent!.instanceId} run={r} />}
            </div>
          )}
          <div className="scene-caption fine">
            {t(`phase.${r.phase}`)} · {crewActive}/{m.crew.length} · {landingName(t, r.landing, r.site)}
          </div>
          <section className="recent-log" aria-label={t('journal.title')}>
            <h3>{t('journal.title')}</h3>
            <JournalList run={r} limit={5} />
          </section>
        </div>
        <aside className="side">
          <div className="tabs" role="tablist" aria-label={t('crewPanel.title')}>
            {(['base', 'prep', 'crew', 'log', 'research'] as Tab[]).map((x) => (
              <button key={x} role="tab" type="button" id={`tab-${x}`} aria-selected={tab === x} aria-controls={`panel-${x}`} className={tab === x ? 'on' : ''} onClick={() => setTab(x)}>
                {t(`tabs.${x}`)}
                {x === 'log' && m.journal.length > 0 && <span className="count">{m.journal.length}</span>}
                {x === 'prep' && prepLive && <span className="count dot" aria-hidden="true">!</span>}
              </button>
            ))}
          </div>
          <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="tabpanel">
            {tab === 'base' && <BasePanel run={r} inspect={inspect} setInspect={setInspect} />}
            {tab === 'prep' && <PrepPanel run={r} />}
            {tab === 'crew' && <CrewPanel run={r} />}
            {tab === 'log' && (
              <div className="panel-body">
                <JournalList run={r} />
              </div>
            )}
            {tab === 'research' && <ResearchPanel run={r} />}
          </div>
        </aside>
      </main>
    </div>
  );
}
