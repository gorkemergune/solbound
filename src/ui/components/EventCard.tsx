import { useMemo, useState } from 'react';
import {
  availableCrewFor,
  characterById,
  echoesFor,
  eventOf,
  optionState,
  returnStatus,
  successChance,
  suggestCrew,
  type EventOption,
  type RunState,
} from '../../engine';
import { formatFixed, listFormat } from '../../i18n';
import { EventArt } from '../art/Scenes';
import { Portrait } from '../art/Portrait';
import { useLocale, useStore, type PendingResult } from '../store';
import { computeDeltas, destName, echoText, forecastDays, lockText, speakerFor, swParams } from '../text';
import { InfoTip } from './common';
import { RichText } from './RichText';

export function ReturnChecklist({ run }: { run: RunState }) {
  const { t } = useStore();
  const locale = useLocale();
  const st = returnStatus(run, run.mission!);
  const unit: Record<string, string> = { food: 'res.crewDays', o2: 'res.kg', water: 'res.l', battery: 'res.kwh' };
  return (
    <div className="checklist">
      <h4>{t('return.heading')}</h4>
      <ul>
        {st.lines.map((l) => (
          <li key={l.key} className={l.ok ? 'ok' : 'short'}>
            <span className="check-mark" aria-hidden="true">{l.ok ? '✓' : '!'}</span>
            <span className="check-label">{t(`return.line.${l.key}`)}</span>
            {l.key !== 'crew' ? (
              <span className="check-val">
                {t(unit[l.key], { v: formatFixed(locale, l.have, 1) })} / {t(unit[l.key], { v: formatFixed(locale, l.need, 1) })}
              </span>
            ) : (
              <span className="check-val" />
            )}
            <span className="check-state">{l.ok ? t('return.ok') : t('return.short')}</span>
          </li>
        ))}
      </ul>
      <p className="fine">{t('return.note')}</p>
    </div>
  );
}

function KnownFacts({ run, eventId }: { run: RunState; eventId: string }) {
  const { t } = useStore();
  const locale = useLocale();
  const m = run.mission!;
  const r = m.resources;
  const facts: string[] = [];
  const pct = (v: number) => `${Math.round(v)}%`;
  const add = (label: string, v: string) => facts.push(`${label}: ${v}`);
  const bat = `${formatFixed(locale, r.batteryKWh, 0)}/${r.batteryCapKWh} kWh (${pct((r.batteryKWh / r.batteryCapKWh) * 100)})`;
  if (['MOON-01', 'MARS-02', 'RETURN-01', 'RETURN-02', 'EMG-O2', 'MOON-S1'].includes(eventId)) add(t('res.battery'), bat);
  if (['MOON-02', 'EMG-O2', 'MOON-03', 'RETURN-01'].includes(eventId)) add(t('res.o2'), t('res.kg', { v: formatFixed(locale, r.o2Kg, 1) }));
  if (['MARS-01', 'MARS-03', 'RETURN-01', 'MOON-03'].includes(eventId)) add(t('res.water'), t('res.l', { v: formatFixed(locale, r.waterL, 0) }));
  if (['MARS-03', 'RETURN-01'].includes(eventId)) add(t('res.food'), t('res.crewDays', { v: formatFixed(locale, r.foodCrewDays, 1) }));
  if (['MOON-01', 'MARS-02'].includes(eventId)) add(t('sys.solar'), pct(m.systems.solar));
  if (eventId === 'MARS-02') add(t('power.dust', { pct: Math.round(m.env.dust * 100) }), '');
  if (eventId === 'MARS-01') add(t('sys.waterRecycler'), pct(m.systems.waterRecycler));
  if (eventId === 'MARS-03') add(t('sys.greenhouseHealth'), pct(m.systems.greenhouseHealth));
  if (eventId === 'MARS-03') add(t('sys.greenhouseGrowth'), pct(m.systems.greenhouseGrowth));
  if (eventId === 'MOON-03') add(t('sys.shelter'), pct(m.systems.shelter));
  if (eventId === 'MOON-02' || eventId === 'EMG-O2' || eventId === 'QUAKE') add(t('sys.seal'), pct(m.systems.seal));
  if (['GEAR', 'DEVIL', 'SHADOW', 'HEAT', 'MICRO', 'ISRU'].includes(eventId)) add(t('res.battery'), bat);
  if (['GEAR', 'DEVIL'].includes(eventId)) add(t('sys.solar'), pct(m.systems.solar));
  if (['WQ', 'BRINE', 'SAB', 'ICE'].includes(eventId)) add(t('res.water'), t('res.l', { v: formatFixed(locale, r.waterL, 0) }));
  if (['WQ', 'SAB'].includes(eventId)) add(t('sys.waterRecycler'), pct(m.systems.waterRecycler));
  if (['CROP', 'HARVEST', 'BRINE'].includes(eventId)) {
    add(t('gh.crop', { crop: t(`crop.${m.crop}`) }), '');
    add(t('sys.greenhouseGrowth'), pct(m.systems.greenhouseGrowth));
    add(t('res.food'), t('res.crewDays', { v: formatFixed(locale, r.foodCrewDays, 1) }));
  }
  if (['HAYFEVER', 'MARS-SAR', 'MOON-SAR'].includes(eventId)) {
    const avgH = m.crew.filter((c) => c.status === 'active').reduce((a, c) => a + c.health, 0) / Math.max(1, m.crew.filter((c) => c.status === 'active').length);
    add(t('crewPanel.health'), `${Math.round(avgH)}`);
  }
  if (!facts.length) return null;
  return (
    <div className="known">
      <h4>{t('event.known')}</h4>
      <ul>
        {facts.map((f) => (
          <li key={f}>{f.replace(/: $/, '')}</li>
        ))}
      </ul>
    </div>
  );
}

function OptionChips({ run, option, available }: { run: RunState; option: EventOption; available: boolean }) {
  const { t } = useStore();
  const chips: string[] = [];
  chips.push(option.hours && run.phase === 'surface' ? t('event.duration', { h: option.hours }) : t('event.instant'));
  if (option.crew) chips.push(t('event.assign', { n: option.crew.count }));
  if (available && option.check) {
    const p = successChance(run, option.check, suggestCrew(run, option)).p;
    chips.push(t('event.chance', { pct: Math.round(p * 100) }));
  }
  return (
    <span className="chips">
      {chips.map((c) => (
        <span key={c} className="chip">
          {c}
        </span>
      ))}
    </span>
  );
}

export function EventCard({ run }: { run: RunState }) {
  const { t, dispatch, setPending, openResearch } = useStore();
  const locale = useLocale();
  const m = run.mission!;
  const active = m.activeEvent!;
  const ev = eventOf(active.eventId);
  const [selected, setSelected] = useState<string | null>(null);
  const [crewSel, setCrewSel] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const states = useMemo(() => Object.fromEntries(ev.options.map((o) => [o.id, optionState(run, o, active)])), [run, ev, active]);
  const opt = ev.options.find((o) => o.id === selected) ?? null;
  const subjectName = active.subjectCrewId ? characterById(run, active.subjectCrewId).name : undefined;
  const subjectNames = (active.subjects ?? []).map((id) => characterById(run, id).name).join(' & ');
  const speaker = speakerFor(run, ev.speaker, active.subjectCrewId);
  const speakerChar = [run.player, ...run.candidates].find((c) => c.name === speaker);
  const kindKey =
    ev.kind === 'emergency' ? 'event.emergency' : ev.kind === 'small' ? 'event.small' : ev.kind === 'transit' ? 'event.transit' : ev.kind === 'forecast' ? 'event.forecast' : 'event.decision';

  const choose = (o: EventOption) => {
    setSelected(o.id);
    setCrewSel(suggestCrew(run, o));
  };

  const crewOk = !opt?.crew || crewSel.length === opt.crew.count;
  const chance = opt?.check && crewOk ? successChance(run, opt.check, crewSel) : null;
  const enabled = opt && states[opt.id].available ? echoesFor(run, ev, opt, crewSel) : [];

  const commit = () => {
    if (!opt || busy) return;
    setBusy(true);
    const phaseAtDecision = run.phase;
    const { before, after, error } = dispatch({ type: 'resolve', instanceId: active.instanceId, optionId: opt.id, crewIds: opt.crew ? crewSel : [] });
    setBusy(false);
    if (error || !before || !after) return;
    const rec = after.mission!.decisions.at(-1)!;
    const pending: PendingResult = {
      screenPhase: phaseAtDecision,
      eventId: ev.id,
      optionId: opt.id,
      success: rec.success,
      probability: rec.probability,
      task: !!opt.hours && phaseAtDecision === 'surface' && !after.mission!.ended,
      names: rec.crewIds.map((id) => characterById(after, id).name).join(' & '),
      subjectName,
      deltas: computeDeltas(before, after),
      echoKeys: after.mission!.echoes.slice(before.mission!.echoes.length).map((e) => echoText(t, after, e)),
    };
    setPending(pending);
  };

  const sw = ev.id === 'CME' || ev.id === 'FC-CME' ? swParams(run, active.instanceId) : null;
  const titleParams = {
    name: subjectName ?? '',
    names: subjectNames,
    dest: destName(t, run),
    days: ev.kind === 'forecast' ? forecastDays(run, m.minute, ev.id, active.instanceId) : 0,
    ...(sw ?? {}),
  };
  return (
    <section className={`event-card kind-${ev.kind}`} aria-labelledby="event-title">
      <header className="event-head">
        <span className={`kind-tag kt-${ev.kind}`}>{t(kindKey)}</span>
        <h2 id="event-title">{t(`ev.${ev.id}.title`, titleParams)}</h2>
      </header>
      <div className="event-art-wrap">
        <EventArt id={ev.illustration} dest={run.destination!} />
      </div>
      <div className="event-body">
        <p className="speaker">
          {speakerChar ? <Portrait seed={speakerChar.portraitSeed} size={36} /> : null}
          <span>
            <RichText text={t(`ev.${ev.id}.say`, { name: speaker })} />
          </span>
        </p>
        <p>
          <RichText text={t(`ev.${ev.id}.body`, titleParams)} />
        </p>
        {sw?.link && (
          <p className="sw-source">
            <span className="sw-badge">NASA DONKI</span>{' '}
            <a href={sw.link} target="_blank" rel="noopener noreferrer">
              {t('sw.open')} ↗
            </a>
          </p>
        )}
        {ev.id === 'RETURN-01' ? <ReturnChecklist run={run} /> : <KnownFacts run={run} eventId={ev.id} />}
        {ev.research.length > 0 && (
          <div className="research-links">
            <span>{t('event.research')}:</span>
            {ev.research.map((rid) => (
              <button key={rid} type="button" className="link-btn" onClick={() => openResearch(rid)}>
                {t(`${rid}.title`)}
                {!m.research.includes(rid) && <span className="new-dot">{t('research.unread')}</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      <fieldset className="options">
        <legend>{t('event.options')}</legend>
        {ev.options.map((o) => {
          const st = states[o.id];
          // Options whose only lock is "not needed" (e.g. ration when ready) are hidden to reduce noise.
          if (!st.available && st.reasons.every((r) => r.key === 'lock.notNeeded' || r.key === 'lock.subject')) return null;
          return (
            <div
              key={o.id}
              role="radio"
              tabIndex={st.available ? 0 : -1}
              aria-checked={selected === o.id}
              aria-disabled={!st.available}
              className={`option ${selected === o.id ? 'sel' : ''} ${st.available ? '' : 'locked'}`}
              onClick={() => st.available && choose(o)}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && st.available && e.target === e.currentTarget) {
                  e.preventDefault();
                  choose(o);
                }
              }}
            >
              <span className="option-title">{t(`ev.${ev.id}.${o.id}.label`)}</span>
              <span className="option-desc">
                <RichText text={t(`ev.${ev.id}.${o.id}.desc`)} />
              </span>
              {st.available ? (
                <OptionChips run={run} option={o} available />
              ) : (
                <span className="lock-reasons">
                  <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" className="lock-icon">
                    <path d="M4 7V5a4 4 0 0 1 8 0v2h1v8H3V7zm2 0h4V5a2 2 0 0 0-4 0z" fill="currentColor" />
                  </svg>
                  {st.reasons.map((r) => lockText(t, r, locale)).join(' · ')}
                </span>
              )}
            </div>
          );
        })}
      </fieldset>

      <div className="option-detail" aria-live="polite">
        {!opt ? (
          <p className="muted">{t('event.selectOption')}</p>
        ) : (
          <>
            {enabled.length > 0 && (
              <p className="enabled-by">
                <span aria-hidden="true">✦ </span>
                {t('event.enabledBy', {
                  list: listFormat(
                    locale,
                    enabled.map((e) =>
                      e.source.kind === 'item'
                        ? t(`item.${e.source.itemId}`)
                        : e.source.kind === 'trait'
                          ? `${characterById(run, e.source.crewId).name} (${t(`trait.${e.source.traitId}`)})`
                          : t(`${e.source.researchId}.title`),
                    ),
                  ),
                })}
              </p>
            )}
            {opt.crew && (
              <div className="crew-pick">
                <h4>{t('event.crewPick')}</h4>
                <div className="crew-pick-list">
                  {availableCrewFor(run, opt).map((c) => {
                    const ch = characterById(run, c.id);
                    const on = crewSel.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        className={`pick ${on ? 'on' : ''}`}
                        aria-pressed={on}
                        onClick={() => {
                          if (on) setCrewSel(crewSel.filter((x) => x !== c.id));
                          else if (crewSel.length < opt.crew!.count) setCrewSel([...crewSel, c.id]);
                          else setCrewSel([...crewSel.slice(1), c.id]);
                        }}
                      >
                        <Portrait seed={ch.portraitSeed} size={40} />
                        <span className="pick-name">{ch.name}</span>
                        <span className="pick-meta">
                          {t(`skill.${opt.crew!.skill}`)} {ch.skills[opt.crew!.skill]} · {t('crewPanel.fatigue')} {Math.round(c.fatigue)}
                        </span>
                        {opt.crew!.traits?.includes(ch.traitId) && <span className="pick-trait">{t(`trait.${ch.traitId}`)}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="risk-row">
              {chance ? (
                <>
                  <div className="chance" aria-label={t('event.chance', { pct: Math.round(chance.p * 100) })}>
                    <div className="chance-bar">
                      <div style={{ width: `${Math.round(chance.p * 100)}%` }} />
                    </div>
                    <strong>{t('event.chance', { pct: Math.round(chance.p * 100) })}</strong>
                  </div>
                  <InfoTip label={t('event.factors')}>
                    <span className="factors">
                      {chance.factors.map((f, i) => (
                        <span key={i} className="factor">
                          <span>
                            {t(`factor.${f.key}`, {
                              ...f.params,
                              skill: f.params?.skill ? t(`skill.${f.params.skill}`) : undefined,
                              trait: f.params?.trait ? t(`trait.${f.params.trait}`) : undefined,
                              item: f.params?.item ? t(`item.${f.params.item}`) : undefined,
                            })}
                          </span>
                          <span className={f.value >= 0 ? 'pos' : 'neg'}>
                            {f.value >= 0 ? '+' : '−'}
                            {Math.abs(Math.round(f.value * 100))}%
                          </span>
                        </span>
                      ))}
                      <em>{t('event.assumption')}</em>
                    </span>
                  </InfoTip>
                </>
              ) : (
                <span className="muted">{t('event.noRoll')}</span>
              )}
            </div>
            <button type="button" className="btn primary big" disabled={!crewOk || busy || !states[opt.id].available} onClick={commit}>
              {t('event.choose')}
            </button>
          </>
        )}
      </div>
    </section>
  );
}

export function ResultCard({ run }: { run: RunState }) {
  const { t, pending, setPending } = useStore();
  const locale = useLocale();
  if (!pending) return null;
  const key = `ev.${pending.eventId}.${pending.optionId}.${pending.success ? 'ok' : 'fail'}`;
  const fmt = (v: number) => (v > 0 ? '+' : '−') + formatFixed(locale, Math.abs(v), Math.abs(v) < 10 ? 1 : 0);
  const unitText = (u: string) => (u === 'kWh' ? ' kWh' : u === 'kg' ? ' kg' : u === 'L' ? ' L' : u === 'cd' ? '' : u === 'pts' ? '' : u === '%' ? ' %' : '');
  return (
    <section className="event-card result" aria-labelledby="result-title" aria-live="assertive">
      <header className="event-head">
        <span className="kind-tag kt-result">{t('event.outcomeTitle')}</span>
        <h2 id="result-title">{t(`ev.${pending.eventId}.${pending.optionId}.label`)}</h2>
      </header>
      <div className="event-body">
        {pending.task ? (
          <p className="outcome">{t('event.taskStarted', { names: pending.names })}</p>
        ) : (
          <p className={`outcome ${pending.success ? 'good' : 'warn'}`}>
            <RichText text={t(key, { names: pending.names, name: pending.subjectName ?? '' })} />
          </p>
        )}
        {pending.probability !== null && !pending.task && (
          <p className="fine">
            {t('debrief.chanceWas', { pct: Math.round(pending.probability * 100) })} · {pending.success ? t('debrief.success') : t('debrief.failed')}
          </p>
        )}
        {pending.echoKeys.map((e, i) => (
          <p key={i} className="echo">
            <span aria-hidden="true">✦ </span>
            {t(e.key, e.params)}
          </p>
        ))}
        {pending.deltas.length > 0 && (
          <ul className="deltas">
            {pending.deltas.map((d, i) => (
              <li key={i} className={d.unit === 'gh' || d.unit === 'leakFixed' ? 'neutral' : (d.key.includes('stress') || d.key.includes('fatigue') || d.key.includes('radiation') ? -d.value : d.value) >= 0 ? 'up' : 'down'}>
                <span>{t(d.key)}</span>
                <strong>{d.unit === 'gh' ? '✓' : d.unit === 'leakFixed' ? '✓' : d.unit === 'x' ? `${d.value > 0 ? '+' : '−'}${Math.abs(d.value)}` : fmt(d.value) + unitText(d.unit)}</strong>
              </li>
            ))}
          </ul>
        )}
        <button type="button" className="btn primary big" onClick={() => setPending(null)} autoFocus>
          {t('event.continue')}
        </button>
      </div>
      <span hidden>{run.revision}</span>
    </section>
  );
}
