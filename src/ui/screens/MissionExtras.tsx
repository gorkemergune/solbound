import { useState } from 'react';
import {
  PREP_EVENT,
  availableCrewFor,
  bigStatus,
  characterById,
  clockDrift,
  earthMinutesElapsed,
  eventOf,
  lunarSun,
  optionState,
  prepStatusKey,
  scenarioOf,
  signalDelay,
  successChance,
  suggestCrew,
  surfaceEndMinute,
  type BigEventState,
  type BigKind,
  type EventOption,
  type RunState,
} from '../../engine';
import { formatFixed } from '../../i18n';
import { Portrait } from '../art/Portrait';
import { RichText } from '../components/RichText';
import { SiteChip } from '../components/LandingInfo';
import { InventoryChip } from '../components/Inventory';
import { useLocale, useStore } from '../store';
import { journalText, lockText, swLink } from '../text';

const ICON: Record<BigKind | 'return', string> = {
  storm: 'M3 9h11a3 3 0 1 0-3-3M3 13h15a3 3 0 1 1-3 3M3 17h7',
  night: 'M20 14A8 8 0 1 1 10 4a6 6 0 0 0 10 10z',
  meteor: 'M4 20l7-7M14 4l6 6-8 8-6-6zM14 4l-3 3',
  dark: 'M3 18h18M6 18l4-8 3 5 2-3 3 6M17 6a2 2 0 1 0 0 .1',
  resupply: 'M12 3l7 4v6c0 4-3 7-7 8-4-1-7-4-7-8V7zM9 12l2 2 4-4',
  crew: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20c0-3 3-5 6-5s6 2 6 5M17 11a2.5 2.5 0 1 0 0-5M16 15c3 0 5 2 5 5',
  cme: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2',
  return: 'M12 3l3 6h-6zM12 9v9M8 21h8',
};

export function KindIcon({ kind, size = 16 }: { kind: BigKind | 'return'; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" className="kind-icon">
      <path d={ICON[kind]} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function span(t: ReturnType<typeof useStore>['t'], minutes: number, active: boolean) {
  const h = Math.max(0, Math.floor(minutes / 60));
  const d = Math.floor(h / 24);
  if (active) return d > 0 ? t('big.active', { d, h: h % 24 }) : t('big.activeHours', { h });
  return d > 0 ? t('big.in', { d, h: h % 24 }) : t('big.inHours', { h });
}

/** Countdown chips for announced / running big events, plus the return countdown. */
export function CountdownChips({ run, onOpen }: { run: RunState; onOpen: () => void }) {
  const { t } = useStore();
  const m = run.mission!;
  const depart = typeof m.flags.departAt === 'number' ? (m.flags.departAt as number) : null;
  const end = depart ?? surfaceEndMinute(scenarioOf(run));
  // arrivals (reinforcement crew, cargo) are news only until they land; storms and nights stay while active
  const ARRIVAL = new Set(['crew', 'resupply']);
  const live = m.big.filter((b) => {
    const st = bigStatus(b, m.minute);
    return st === 'countdown' || (st === 'active' && !ARRIVAL.has(b.kind));
  });
  return (
    <div className="countdowns" role="list" aria-label={t('big.countdownLabel')}>
      {(run.phase === 'surface' || run.phase === 'returnPrep') && <SiteChip id={run.landing} />}
      {(run.phase === 'surface' || run.phase === 'returnPrep') && <InventoryChip run={run} />}
      {live.map((b) => {
        const st = bigStatus(b, m.minute);
        const left = st === 'active' ? b.endAt - m.minute : b.startAt - m.minute;
        const urgent = st === 'countdown' && left < 1440;
        return (
          <button key={b.id} type="button" role="listitem" className={`cd-chip cd-${b.kind} ${st} ${urgent ? 'urgent' : ''}`} onClick={onOpen}>
            <KindIcon kind={b.kind} />
            <span className="cd-name">{t(`big.${b.kind}`)}</span>
            <span className="cd-time">{span(t, left, st === 'active')}</span>
          </button>
        );
      })}
      {run.phase === 'surface' && (
        <span role="listitem" className={`cd-chip cd-goal ${(m.minute - 360) / 1440 >= m.goal.target ? 'reached' : ''}`} title={t('goal.explain')}>
          {(m.minute - 360) / 1440 >= m.goal.target ? `✓ ${t('goal.reached')}` : `◎ ${t('goal.chip', { d: m.goal.target })}`}
        </span>
      )}
      {run.phase === 'surface' && (
        <span role="listitem" className="cd-chip cd-return">
          <KindIcon kind="return" />
          <span className="cd-name">{depart ? t('ret.booked') : t('big.return')}</span>
          <span className="cd-time">{span(t, end - m.minute, false)}</span>
        </span>
      )}
    </div>
  );
}

/** Earth-time equivalent, clock drift, signal delay and (equator) the lunar Sun. */
export function TimeAwareness({ run }: { run: RunState }) {
  const { t } = useStore();
  const locale = useLocale();
  const m = run.mission!;
  const e = earthMinutesElapsed(run, m.minute);
  const d = Math.floor(e / 1440);
  const hh = String(Math.floor((e % 1440) / 60)).padStart(2, '0');
  const mm = String(Math.floor(e % 60)).padStart(2, '0');
  const drift = clockDrift(run, m.minute);
  const delay = signalDelay(run, m.minute);
  const sun = run.site === 'equator' ? lunarSun(m.minute) : null;
  return (
    <div className="time-aware fine">
      <span className="ta-earth" title={t(run.destination === 'mars' ? 'time.localMars' : 'time.localMoon')}>
        <span aria-hidden="true">🌍</span> {t('time.earth', { d, hh, mm })}
      </span>
      <span className="ta-drift">
        {drift.unit === 'min' ? t('time.marsDrift', { m: formatFixed(locale, drift.value, 0) }) : t('time.moonDrift', { us: formatFixed(locale, drift.value, 0) })}
      </span>
      <span className="ta-delay" title={delay.computed ? t('time.computed') : undefined}>
        {delay.unit === 's' ? t('time.delay.s', { v: formatFixed(locale, delay.value, 1) }) : t('time.delay.min', { v: formatFixed(locale, delay.value, 1) })}
        {delay.computed && <span className="sw-mini"> · JPL</span>}
      </span>
      {sun && (
        <span className="ta-sun">
          {t(sun.up ? 'time.sunUp' : 'time.sunDown', { d: Math.floor(sun.hoursToChange / 24), h: Math.floor(sun.hoursToChange % 24) })}
        </span>
      )}
      {run.site === 'polar' && <span className="ta-sun">{t('time.polar')}</span>}
    </div>
  );
}

// ---------------- preparation plan ----------------

function PrepAction({ run, big, option, kind }: { run: RunState; big: BigEventState; option: EventOption; kind: BigKind }) {
  const { t, dispatch } = useStore();
  const locale = useLocale();
  const m = run.mission!;
  const evId = PREP_EVENT[kind];
  const status = m.flags[prepStatusKey(big.id, option.id)] as string | undefined;
  const st = optionState(run, option, null);
  const free = option.crew ? availableCrewFor(run, option) : [];
  const [sel, setSel] = useState<string[]>(() => suggestCrew(run, option));
  const valid = sel.filter((id) => free.some((c) => c.id === id));
  const crewOk = !option.crew || valid.length === option.crew.count;
  const chance = option.check && crewOk ? successChance(run, option.check, valid).p : null;
  const open = bigStatus(big, m.minute) === 'countdown';
  const blockedByEvent = !!m.activeEvent;
  const toggle = (id: string) => {
    if (!option.crew) return;
    setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s.filter((x) => free.some((c) => c.id === x)), id].slice(-option.crew!.count)));
  };
  const start = () => {
    dispatch({ type: 'prep', bigId: big.id, actionId: option.id, crewIds: option.crew ? valid : [] }); // errors surface in the toast
  };
  const statusLabel = status === 'done' ? t('prep.done') : status === 'doing' ? t('prep.doing') : status === 'failed' ? t('prep.failed') : !open ? t('prep.closed') : null;
  return (
    <li className={`prep-action ${status ?? ''} ${!st.available && !status ? 'locked' : ''}`}>
      <div className="prep-head">
        <strong>{t(`ev.${evId}.${option.id}.label`)}</strong>
        <span className="chips">
          <span className="chip">{option.hours ? t('prep.hours', { h: option.hours }) : t('prep.instant')}</span>
          {chance !== null && !status && <span className="chip">{t('prep.chance', { pct: Math.round(chance * 100) })}</span>}
        </span>
      </div>
      <p className="fine">
        <RichText text={t(`ev.${evId}.${option.id}.desc`)} />
      </p>
      {statusLabel ? (
        <p className={`prep-status st-${status ?? 'closed'}`}>{statusLabel}</p>
      ) : !st.available ? (
        <ul className="locks fine">
          {st.reasons.map((r, i) => (
            <li key={i}>🔒 {lockText(t, r, locale)}</li>
          ))}
        </ul>
      ) : (
        <div className="prep-go">
          {option.crew && (
            <div className="prep-crew" role="group" aria-label={t('prep.who')}>
              {free.map((c) => {
                const ch = characterById(run, c.id);
                const on = valid.includes(c.id);
                return (
                  <button key={c.id} type="button" className={`prep-pick ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => toggle(c.id)} title={ch.name}>
                    <Portrait seed={ch.portraitSeed} gender={ch.gender} age={ch.profile.age} size={26} />
                    <span>{ch.name.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>
          )}
          <button type="button" className="btn primary small" disabled={!crewOk || blockedByEvent} onClick={start}>
            {t('prep.start')}
          </button>
          {blockedByEvent && <span className="fine">{t('prep.busyEvent')}</span>}
        </div>
      )}
    </li>
  );
}

export function PrepPanel({ run }: { run: RunState }) {
  const { t } = useStore();
  const m = run.mission!;
  const live = m.big.filter((b) => ['countdown', 'active'].includes(bigStatus(b, m.minute)));
  return (
    <div className="panel-body prep-panel">
      <h3>{t('prep.title')}</h3>
      <p className="fine">{t('prep.sub')}</p>
      {!live.length && <p className="muted">{t('prep.none')}</p>}
      {live.map((b) => {
        const st = bigStatus(b, m.minute);
        const ev = eventOf(PREP_EVENT[b.kind]);
        return (
          <section key={b.id} className={`prep-card cd-${b.kind} ${st}`}>
            <header>
              <KindIcon kind={b.kind} size={22} />
              <h4>{t(`big.${b.kind}`)}</h4>
              <span className="cd-time">{span(t, st === 'active' ? b.endAt - m.minute : b.startAt - m.minute, st === 'active')}</span>
            </header>
            <p className="fine">
              <strong>{t('prep.effectsTitle')}:</strong> {t(`prep.hit.${b.kind}`)}
            </p>
            {b.swIndex !== undefined && run.spaceWeather?.records[b.swIndex] && (
              <p className="sw-source fine">
                <span className="sw-badge">NASA DONKI</span>{' '}
                <a href={run.spaceWeather.records[b.swIndex].link} target="_blank" rel="noopener noreferrer">
                  {t('sw.open')} ↗
                </a>
              </p>
            )}
            {st === 'countdown' && (
              <ul className="prep-actions">
                {ev.options.map((o) => (
                  <PrepAction key={o.id} run={run} big={b} option={o} kind={b.kind} />
                ))}
              </ul>
            )}
          </section>
        );
      })}
      {run.spaceWeather && <Bulletins run={run} />}
    </div>
  );
}

function Bulletins({ run }: { run: RunState }) {
  const { t } = useStore();
  const items = run.mission!.journal.filter((j) => j.tone === 'sw').slice(-6).reverse();
  return (
    <section className="bulletins">
      <h4>
        <span className="sw-badge">NASA DONKI</span> {t('sw.bulletins')}
      </h4>
      {!items.length && <p className="fine">{t('sw.noBulletins')}</p>}
      <ul>
        {items.map((j) => (
          <li key={j.id} className="fine">
            <RichText text={journalText(t, run, j)} />{' '}
            {swLink(run, j.params?.rec) && (
              <a href={swLink(run, j.params?.rec)!} target="_blank" rel="noopener noreferrer">
                ↗
              </a>
            )}
          </li>
        ))}
      </ul>
      <p className="fine">{t('sw.quiet')}</p>
    </section>
  );
}

/** Four seats in the capsule: everyone who flies is shown. */
export function CrewAboard({ run }: { run: RunState }) {
  const { t } = useStore();
  const m = run.mission;
  const ids = m ? m.crew.filter((c) => c.status === 'active').map((c) => c.id) : ['player', ...run.crewIds];
  return (
    <div className="crew-aboard">
      <span className="fine">{t('transit.aboard')}</span>
      <ul>
        {ids.map((id) => {
          const ch = characterById(run, id);
          return (
            <li key={id}>
              <Portrait seed={ch.portraitSeed} gender={ch.gender} age={ch.profile.age} size={40} title={ch.name} />
              <span>{ch.name.split(' ')[0]}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
