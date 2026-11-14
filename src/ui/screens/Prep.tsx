import { useEffect, useState, type ReactNode } from 'react';
import {
  MISSION_DAYS,
  EVENT_BY_ID,
  ITEMS,
  ITEM_BY_ID,
  PERSONAL_KIT_KG,
  PREP_PHASES,
  SITES,
  canEnter,
  flyingCrew,
  incompatibleItems,
  payloadOf,
  scenarioFor,
  itemUsage,
  launchBlockers,
  validateQuantity,
  type Character,
  type DestinationId,
  type ItemId,
  type Phase,
  type SkillKey,
} from '../../engine';
import { listFormat } from '../../i18n';
import { ITEM_COLOR, ItemIcon } from '../art/ItemIcon';
import { Portrait } from '../art/Portrait';
import { Landscape } from '../art/Scenes';
import { InfoTip, LangSwitch, StatBar } from '../components/common';
import { RichText } from '../components/RichText';
import { SpaceWeatherCard } from '../components/SpaceWeatherCard';
import { StayGoal } from '../components/StayGoal';
import { useSpaceWeather } from '../../live/useSpaceWeather';
import { newSeed, useLocale, useStore } from '../store';
import { Brand } from './Title';

/** Items with an effect that does not need an event (applied at launch or every hour). */
const PASSIVE = new Set<ItemId>(['battery', 'food', 'shield', 'moxie', 'spectro']);
const SKILLS: SkillKey[] = ['technical', 'science', 'teamwork'];
const SKILL_TONE: Record<SkillKey, 'tech' | 'sci' | 'team'> = { technical: 'tech', science: 'sci', teamwork: 'team' };

export function PrepShell() {
  const { run, t, dispatch, quitToTitle } = useStore();
  const r = run!;
  const idx = PREP_PHASES.indexOf(r.phase);
  const next = PREP_PHASES[idx + 1] as Phase | undefined;
  const prev = PREP_PHASES[idx - 1] as Phase | undefined;
  const nextErr = next ? canEnter(r, next) : null;

  useEffect(() => {
    document.getElementById('main')?.focus();
    window.scrollTo({ top: 0 });
  }, [r.phase]);

  let body: ReactNode = null;
  if (r.phase === 'identity') body = <IdentityScreen />;
  if (r.phase === 'destination') body = <DestinationScreen />;
  if (r.phase === 'crew') body = <CrewScreen />;
  if (r.phase === 'cargo') body = <CargoScreen />;
  if (r.phase === 'briefing') body = <BriefingScreen />;

  return (
    <div className={`prep theme-${r.destination ?? 'neutral'}`}>
      <header className="topbar">
        <button type="button" className="brand-btn" onClick={quitToTitle} aria-label={t('hud.menu')}>
          <Brand small />
        </button>
        <nav className="stepper" aria-label={t('step.of', { n: idx + 1, total: PREP_PHASES.length })}>
          <ol>
            {PREP_PHASES.map((p, i) => {
              const err = canEnter(r, p);
              return (
                <li key={p} className={p === r.phase ? 'cur' : i < idx ? 'done' : ''}>
                  <button type="button" disabled={!!err && p !== r.phase} aria-current={p === r.phase ? 'step' : undefined} onClick={() => dispatch({ type: 'goTo', phase: p })}>
                    <span className="step-n">{i + 1}</span>
                    <span className="step-label">{t(`step.${p}`)}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>
        <LangSwitch compact />
      </header>
      <main id="main" tabIndex={-1} className="prep-main">
        {body}
      </main>
      {r.phase !== 'briefing' && (
        <footer className="prep-nav">
          {prev ? (
            <button type="button" className="btn" onClick={() => dispatch({ type: 'goTo', phase: prev })}>
              ← {t('step.back')}
            </button>
          ) : (
            <span />
          )}
          <span className="fine">{nextErr ? t(nextErr) : t('step.of', { n: idx + 1, total: PREP_PHASES.length })}</span>
          {next && (
            <button type="button" className="btn primary" disabled={!!nextErr} onClick={() => dispatch({ type: 'goTo', phase: next })}>
              {t('step.next')} →
            </button>
          )}
        </footer>
      )}
    </div>
  );
}

// ---------------- identity ----------------

function SkillRows({ c, compact }: { c: Character; compact?: boolean }) {
  const { t } = useStore();
  return (
    <div className="skills">
      {SKILLS.map((k) => (
        <div key={k} className="skill-row">
          <StatBar label={t(`skill.${k}`)} value={c.skills[k]} tone={SKILL_TONE[k]} />
          {!compact && (
            <InfoTip label={<span className="q">?</span>}>
              <strong>{t('identity.whatAffects')}</strong> {t(`skill.${k}.desc`)}
            </InfoTip>
          )}
        </div>
      ))}
    </div>
  );
}

function ProfileList({ c }: { c: Character }) {
  const { t } = useStore();
  return (
    <dl className="profile">
      <dt>{t('identity.background')}</dt>
      <dd>{t(`bg.${c.backgroundId}`)}</dd>
      <dt>{t('identity.age')}</dt>
      <dd>{c.profile.age}</dd>
      <dt>{t('identity.height')}</dt>
      <dd>{c.profile.heightCm} cm</dd>
      <dt>{t('identity.mass')}</dt>
      <dd>{c.profile.massKg} kg</dd>
      <dt>{t('identity.experience')}</dt>
      <dd>{t('identity.years', { n: c.profile.experienceYears })}</dd>
      <dt>{t('identity.motivation')}</dt>
      <dd>{t(`mot.${c.profile.motivationId}`)}</dd>
    </dl>
  );
}

function IdentityScreen() {
  const { run, t, dispatch } = useStore();
  const locale = useLocale();
  const p = run!.player;
  const [name, setName] = useState(p.name);
  useEffect(() => setName(p.name), [p.name]);
  const commitName = () => {
    if (name === p.name && name.trim()) return;
    const res = dispatch({ type: 'renamePlayer', name, locale });
    if (res.after) setName(res.after.player.name); // empty input shows the assigned fallback name
  };
  return (
    <div className="identity">
      <section className="id-hero">
        <div className="id-portrait">
          <Portrait seed={p.portraitSeed} gender={p.gender} age={p.profile.age} size={220} title={p.name} />
        </div>
        <div className="id-head">
          <h1>{t('identity.heading')}</h1>
          <p className="muted">{t('identity.sub')}</p>
          <label className="field">
            <span>{t('identity.nameLabel')}</span>
            <input
              value={name}
              maxLength={28}
              placeholder={t('identity.namePlaceholder')}
              onChange={(e) => setName(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => e.key === 'Enter' && commitName()}
            />
          </label>
          <button type="button" className="btn ghost" onClick={() => dispatch({ type: 'rerollProfile', seed: newSeed(), locale })}>
            ↻ {t('identity.newProfile')}
          </button>
          <p className="fine">{t('identity.newProfileNote')}</p>
        </div>
      </section>
      <div className="id-grid">
        <section className="card">
          <h2>{t('identity.skills')}</h2>
          <SkillRows c={p} />
          <div className="trait-box">
            <span className="trait-chip">{t(`trait.${p.traitId}`)}</span>
            <span>{t(`trait.${p.traitId}.desc`)}</span>
          </div>
        </section>
        <section className="card">
          <h2>{t('identity.profile')}</h2>
          <ProfileList c={p} />
          <p className="fine">{t('identity.profileNote')}</p>
          <p className="fine">{t('identity.expNote')}</p>
        </section>
        <section className="card">
          <h2>{t('identity.mode')}</h2>
          <div className="mode-choice" role="radiogroup" aria-label={t('identity.mode')}>
            {(['standard', 'explorer'] as const).map((mode) => (
              <button key={mode} type="button" role="radio" aria-checked={run!.mode === mode} className={`mode ${run!.mode === mode ? 'sel' : ''}`} onClick={() => dispatch({ type: 'setMode', mode })}>
                <strong>{t(mode === 'standard' ? 'identity.modeStandard' : 'identity.modeExplorer')}</strong>
                <span>{t(mode === 'standard' ? 'identity.modeStandardDesc' : 'identity.modeExplorerDesc')}</span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

// ---------------- destination ----------------

function DestinationScreen() {
  const { run, t, dispatch } = useStore();
  const cur = run!.destination;
  return (
    <div className="destination">
      <h1>{t('dest.heading')}</h1>
      <p className="muted">{t('dest.sub')}</p>
      <div className="dest-grid">
        {(['moon', 'mars'] as DestinationId[]).map((d) => {
          const s = scenarioFor(d, cur === d ? run!.site : null);
          const titles = s.mandatory.filter((e) => EVENT_BY_ID[e.eventId].kind === 'main').map((e) => t(`ev.${e.eventId}.title`));
          return (
            <article key={d} className={`dest-card theme-${d} ${cur === d ? 'sel' : ''}`}>
              <div className="dest-art">
                <Landscape dest={d} />
                <h2>{t(`dest.${d}`)}</h2>
              </div>
              <div className="dest-body">
                <p className="dest-tag">{t(`dest.${d}.tag`)}</p>
                <ul>
                  <li>{t(`dest.${d}.p1`)}</li>
                  <li>{t(`dest.${d}.p2`)}</li>
                  <li>{t(`dest.${d}.p3`)}</li>
                </ul>
                <p className="fine">{t('dest.events', { list: titles.join(' · ') })}</p>
                <button type="button" className={`btn ${cur === d ? 'primary' : ''} big`} aria-pressed={cur === d} onClick={() => dispatch({ type: 'setDestination', destination: d })}>
                  {cur === d ? `✓ ${t('dest.selected')}` : t('dest.select', { dest: t(`dest.${d}`) })}
                </button>
                {cur === d && (
                  <div className="sites" role="radiogroup" aria-label={t(d === 'moon' ? 'site.title' : 'site.titleMars')}>
                    <h3>{t(d === 'moon' ? 'site.title' : 'site.titleMars')}</h3>
                    {SITES[d].map((site) => (
                      <div
                        key={site}
                        role="radio"
                        tabIndex={0}
                        aria-checked={run!.site === site}
                        className={`site ${run!.site === site ? 'sel' : ''}`}
                        onClick={() => dispatch({ type: 'setSite', site })}
                        onKeyDown={(e) => {
                          if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) {
                            e.preventDefault();
                            dispatch({ type: 'setSite', site });
                          }
                        }}
                      >
                        <strong>{t(`site.${site}`)}</strong>
                        <span>
                          <RichText text={t(`site.${site}.desc`)} />
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
      <p className="demo-badge">{t('app.missionBadge')}</p>
    </div>
  );
}

// ---------------- crew ----------------


/**
 * Details open and close only with the Details button (never on hover or focus), so several cards
 * can stay open side by side for comparison. `allOpen` is the "show / hide all" switch.
 */
function CandidateCard({ c, selected, full, allOpen }: { c: Character; selected: boolean; full: boolean; allOpen: { v: boolean; n: number } }) {
  const { t, dispatch } = useStore();
  const locale = useLocale();
  const [open, setOpen] = useState(allOpen.v);
  useEffect(() => {
    if (allOpen.n) setOpen(allOpen.v);
  }, [allOpen]);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(c.name);
  useEffect(() => setDraft(c.name), [c.name]);
  const save = () => {
    dispatch({ type: 'renameCandidate', id: c.id, name: draft, locale });
    setEditing(false);
  };
  return (
    <article className={`cand ${selected ? 'sel' : ''} ${open ? 'open' : ''}`}>
      <div className="cand-top">
        <Portrait seed={c.portraitSeed} gender={c.gender} age={c.profile.age} size={64} title={c.name} />
        <div className="cand-id">
          {editing ? (
            <span className="rename">
              <label className="sr-only" htmlFor={`rn-${c.id}`}>
                {t('crew.renameLabel', { name: c.name })}
              </label>
              <input id={`rn-${c.id}`} value={draft} maxLength={28} autoFocus onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} />
              <button type="button" className="btn tiny" onClick={save}>
                {t('crew.save')}
              </button>
            </span>
          ) : (
            <h3>
              {c.name}
              <button type="button" className="icon-btn" aria-label={`${t('crew.rename')}: ${c.name}`} onClick={() => setEditing(true)}>
                ✎
              </button>
            </h3>
          )}
          <p className="fine">{t(`bg.${c.backgroundId}`)}</p>
          <span className="trait-chip">{t(`trait.${c.traitId}`)}</span> <span className="mass-chip">{t('crew.massLine', { kg: c.profile.massKg })}</span>
        </div>
      </div>
      <SkillRows c={c} compact />
      <button type="button" className="link-btn details-btn" aria-expanded={open} aria-controls={`cd-${c.id}`} onClick={() => setOpen(!open)}>
        {open ? `▴ ${t('crew.hideDetails')}` : `▾ ${t('crew.details')}`}
      </button>
      {open && (
        <div className="cand-details" id={`cd-${c.id}`}>
          <p>
            <strong>{t(`trait.${c.traitId}`)}:</strong> {t(`trait.${c.traitId}.desc`)}
          </p>
          <ProfileList c={c} />
        </div>
      )}
      <button
        type="button"
        className={`btn ${selected ? '' : 'primary'} block`}
        aria-pressed={selected}
        disabled={!selected && full}
        onClick={() => dispatch({ type: 'toggleCrew', id: c.id })}
      >
        {selected ? t('crew.remove') : full ? t('crew.full') : t('crew.add')}
      </button>
    </article>
  );
}

function CrewSummary() {
  const { run, t } = useStore();
  const locale = useLocale();
  const r = run!;
  const team = [r.player, ...r.crewIds.map((id) => r.candidates.find((c) => c.id === id)!)];
  const best = Object.fromEntries(SKILLS.map((k) => [k, Math.max(...team.map((c) => c.skills[k]))])) as Record<SkillKey, number>;
  const strong = SKILLS.reduce((a, b) => (best[b] > best[a] ? b : a));
  const weak = SKILLS.reduce((a, b) => (best[b] < best[a] ? b : a));
  const traits = [...new Set(team.map((c) => c.traitId))];
  const keyMissing = (['mechanic', 'medic', 'eva'] as const).filter((x) => !traits.includes(x));
  return (
    <aside className="card crew-summary" aria-live="polite">
      <h2>{t('crew.summary')}</h2>
      <div className="seats">
        {[0, 1, 2, 3].map((i) => {
          const c = team[i];
          return (
            <div key={i} className={`seat ${c ? 'filled' : ''}`}>
              {c ? <Portrait seed={c.portraitSeed} gender={c.gender} age={c.profile.age} size={52} title={c.name} /> : <span className="seat-empty" aria-hidden="true" />}
              <span className="fine">{c ? (c.isPlayer ? t('crew.you') : c.name) : t('crew.empty')}</span>
            </div>
          );
        })}
      </div>
      <p className="crew-count">{t('crew.count', { n: r.crewIds.length })}</p>
      {(() => {
        const p = payloadOf(r);
        return (
          <p className={`payload-line ${p.freeKg < 0 ? 'over' : ''}`}>
            {p.freeKg >= 0 ? t('crew.payload', { used: p.totalKg, cap: p.capacityKg, free: p.freeKg }) : t('crew.payloadOver', { used: p.totalKg, cap: p.capacityKg, over: -p.freeKg })}
          </p>
        );
      })()}
      <ul className="summary-list">
        <li>{t('crew.strong', { skill: t(`skill.${strong}`), value: best[strong] })}</li>
        {r.crewIds.length === 3 && <li>{t('crew.weak', { skill: t(`skill.${weak}`), value: best[weak] })}</li>}
        <li>{t('crew.traitsCovered', { list: listFormat(locale, traits.map((x) => t(`trait.${x}`))) })}</li>
        {r.crewIds.length === 3 && keyMissing.map((m) => <li key={m} className="warn">{t('crew.noTrait', { trait: t(`trait.${m}`) })}</li>)}
      </ul>
    </aside>
  );
}

function CrewScreen() {
  const { run, t } = useStore();
  const r = run!;
  const full = r.crewIds.length >= 3;
  const [allOpen, setAllOpen] = useState({ v: false, n: 0 });
  return (
    <div className="crew-screen">
      <div className="crew-head">
        <h1>{t('crew.heading')}</h1>
        <p className="muted">{t('crew.sub')}</p>
        <div className="row gap crew-tools">
          <span className="fine">{t('crew.count', { n: r.candidates.length })}</span>
          <button type="button" className="btn small" aria-pressed={allOpen.v} onClick={() => setAllOpen((a) => ({ v: !a.v, n: a.n + 1 }))}>
            {allOpen.v ? `▴ ${t('crew.hideAll')}` : `▾ ${t('crew.showAll')}`}
          </button>
        </div>
      </div>
      <div className="crew-layout">
        <div className="cand-grid">
          {r.candidates.map((c) => (
            <CandidateCard key={c.id} c={c} selected={r.crewIds.includes(c.id)} full={full} allOpen={allOpen} />
          ))}
        </div>
        <CrewSummary />
      </div>
    </div>
  );
}

// ---------------- cargo ----------------

function MassBar() {
  const { run, t } = useStore();
  const p = payloadOf(run!);
  const cap = p.capacityKg;
  const seg = (kg: number) => `${Math.max(0, Math.min(100, (kg / Math.max(cap, p.totalKg)) * 100))}%`;
  return (
    <div className="mass">
      <div className="cap-readout">
        <strong className={p.freeKg < 0 ? 'over' : ''}>{t('cargo.massReadout', { used: p.totalKg, cap })}</strong>
        <span className="fine">{p.freeKg >= 0 ? t('cargo.massFree', { free: p.freeKg }) : t('cargo.massOver', { over: -p.freeKg })}</span>
      </div>
      <div className={`mass-bar ${p.freeKg < 0 ? 'over' : ''}`} role="meter" aria-valuemin={0} aria-valuemax={cap} aria-valuenow={p.totalKg} aria-label={t('cargo.massReadout', { used: p.totalKg, cap })}>
        <span className="m-crew" style={{ width: seg(p.crewKg) }} />
        <span className="m-kit" style={{ width: seg(p.kitKg) }} />
        <span className="m-cargo" style={{ width: seg(p.cargoKg) }} />
      </div>
      <ul className="mass-legend">
        <li>
          <span className="swatch m-crew" /> {t('cargo.part.crew')}: <strong>{p.crewKg} kg</strong>
        </li>
        <li>
          <span className="swatch m-kit" /> {t('cargo.part.kit', { kit: PERSONAL_KIT_KG })}: <strong>{p.kitKg} kg</strong>
        </li>
        <li>
          <span className="swatch m-cargo" /> {t('cargo.part.cargo')}: <strong>{p.cargoKg} kg</strong>
        </li>
        <li>
          <span className="swatch m-free" /> {t('cargo.part.free')}: <strong>{Math.max(0, p.freeKg)} kg</strong>
        </li>
      </ul>
      <div className="mass-crew">
        {flyingCrew(run!).map((c) => (
          <span key={c.id} className="mass-person" title={c.name}>
            <Portrait seed={c.portraitSeed} gender={c.gender} age={c.profile.age} size={30} title={c.name} />
            <span>{c.profile.massKg}+{PERSONAL_KIT_KG}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function CargoScreen() {
  const { run, t, dispatch, openResearch } = useStore();
  const locale = useLocale();
  const r = run!;
  const dest = r.destination!;
  const s = scenarioFor(dest, r.site);
  const bad = incompatibleItems(r.cargo, dest);
  const cats = [...new Set(ITEMS.map((i) => i.category))];
  const crew = flyingCrew(r);
  const p = payloadOf(r);
  return (
    <div className={`cargo theme-${dest}`}>
      <div className="cargo-head">
        <h1>{t('cargo.massHeading')}</h1>
        <p className="muted">
          {t('cargo.massSub', { cap: p.capacityKg })}{' '}
          <button type="button" className="link-btn" onClick={() => openResearch('R-MASS')}>
            {t('R-MASS.title')}
          </button>
        </p>
      </div>
      <div className="cargo-layout">
        <aside className="card cargo-bay">
          <MassBar />
          {r.crewIds.length === 3 && <StayGoal run={r} compact />}
          <ul className="cargo-legend">
            {ITEMS.filter((i) => (r.cargo[i.id] ?? 0) > 0).map((i) => (
              <li key={i.id}>
                <span className="swatch" style={{ background: ITEM_COLOR[i.id] }} />
                {t(`item.${i.id}`)} × {r.cargo[i.id]} = {(r.cargo[i.id] ?? 0) * i.mass} kg
              </li>
            ))}
          </ul>
          {p.cargoKg === 0 && <p className="fine">{t('cargo.empty')}</p>}
          {!r.cargo.food && <p className="warn-line">{t('cargo.warnFood')}</p>}
          {!r.cargo.parts && !r.cargo.sealant && <p className="warn-line">{t('cargo.warnRepair')}</p>}
          {bad.map((id) => (
            <p key={id} className="error-line" role="alert">
              {t('cargo.incompatible', { item: t(`item.${id}`), dest: t(`dest.${dest}`), reason: t(`item.${id}.incompatible`) })}
            </p>
          ))}
          <p className="fine">{t('cargo.massNote')}</p>
          <div className="base-provides">
            <h3>{t('cargo.base')}</h3>
            <p className="fine">
              {t('cargo.baseListMass', {
                battery: s.start.resources.batteryCapKWh,
                charge: s.start.resources.batteryKWh,
                food: s.start.resources.foodCrewDays,
                o2: s.start.resources.o2Kg,
                water: s.start.resources.waterL,
              })}
            </p>
          </div>
        </aside>
        <div className="items">
          {cats.map((cat) => (
            <section key={cat} className="item-cat">
              <h2>{t(`cargo.cat.${cat}`)}</h2>
              {ITEMS.filter((i) => i.category === cat).map((def) => {
                const q = r.cargo[def.id] ?? 0;
                const usage = itemUsage(def.id)[dest];
                const canAdd = validateQuantity(crew, r.cargo, def.id, q + 1) === null;
                const incompatible = def.onlyAt && !def.onlyAt.includes(dest);
                const usageTitles = [...new Set(usage.map((e) => t(e === 'EMG-MED' ? 'ev.EMG-MED.short' : `ev.${e}.title`)))];
                return (
                  <article key={def.id} className={`item ${q ? 'packed' : ''} ${incompatible ? 'incompat' : ''}`}>
                    <ItemIcon id={def.id} size={40} />
                    <div className="item-info">
                      <h3>
                        {t(`item.${def.id}`)} <span className="vol">{t('cargo.perUnitKg', { v: def.mass })}</span>
                      </h3>
                      <p>
                        <RichText text={t(`item.${def.id}.desc`)} />
                      </p>
                      <p className="fine">
                        {def.onlyAt ? t('cargo.onlyAt', { dest: listFormat(locale, def.onlyAt.map((d) => t(`dest.${d}`))) }) + ' · ' : ''}
                        {usageTitles.length ? t('cargo.usedIn', { list: usageTitles.join(' · ') }) : !PASSIVE.has(def.id) ? t('cargo.unused') : ''}
                        {usageTitles.length && PASSIVE.has(def.id) ? ' · ' : ''}
                        {PASSIVE.has(def.id) && !incompatible ? t('cargo.passive') : ''}
                      </p>
                    </div>
                    <div className="stepper-ctl">
                      <button type="button" className="btn round" aria-label={t('cargo.removeOne', { item: t(`item.${def.id}`) })} disabled={q === 0} onClick={() => dispatch({ type: 'setCargo', itemId: def.id, qty: q - 1 })}>
                        −
                      </button>
                      <span className="qty" aria-live="polite">
                        {t('cargo.qty', { n: q, max: def.max })}
                      </span>
                      <button type="button" className="btn round" aria-label={t('cargo.add', { item: t(`item.${def.id}`) })} disabled={!canAdd} onClick={() => dispatch({ type: 'setCargo', itemId: def.id, qty: q + 1 })}>
                        +
                      </button>
                    </div>
                  </article>
                );
              })}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------- briefing ----------------

function BriefingScreen() {
  const { run, t, dispatch } = useStore();
  const r = run!;
  const dest = r.destination!;
  const blockers = launchBlockers(r);
  const team = [r.player, ...r.crewIds.map((id) => r.candidates.find((c) => c.id === id)!)];
  const pay = payloadOf(r);
  const used = pay.cargoKg;
  const [launching, setLaunching] = useState(false);
  // attach the current NASA DONKI snapshot to the run; it is frozen at launch
  const { snapshot } = useSpaceWeather();
  useEffect(() => {
    if (!r.launched && r.spaceWeather?.fetchedAt !== snapshot.fetchedAt) dispatch({ type: 'setSpaceWeather', snapshot });
  }, [snapshot, r.launched, r.spaceWeather?.fetchedAt, dispatch]);
  const sw = r.spaceWeather;
  const cmeHere = sw ? sw.records.filter((x) => (dest === 'mars' ? x.arrivalMars : x.arrivalEarth)).length : 0;
  return (
    <div className={`briefing theme-${dest}`}>
      <div className="brief-banner">
        <Landscape dest={dest} />
        <div className="brief-banner-text">
          <h1>{t('brief.heading')}</h1>
          <p>{t('brief.goal', { days: MISSION_DAYS })}</p>
          <p>
            <strong>{t(`site.${r.site}`)}</strong> · {t('brief.payload', { used: pay.totalKg, cap: pay.capacityKg })}
          </p>
          <p className="demo-badge">{t('app.missionBadge')}</p>
          {sw && (
            <p className="sw-brief">
              <span className="sw-badge">NASA DONKI</span> {t('sw.brief', { start: sw.rangeStart, end: sw.rangeEnd, source: t(`sw.source.${sw.source}`), dest: t(`dest.${dest}`), n: cmeHere })}
            </p>
          )}
        </div>
      </div>
      <div className="brief-sw">
        <StayGoal run={r} />
        <SpaceWeatherCard dest={dest} compact />
      </div>
      <div className="brief-grid">
        <section className="card">
          <div className="card-head">
            <h2>{t('brief.crew')}</h2>
            <button type="button" className="link-btn" onClick={() => dispatch({ type: 'goTo', phase: 'crew' })}>
              {t('brief.edit')}
            </button>
          </div>
          <ul className="brief-crew">
            {team.map((c) => (
              <li key={c.id}>
                <Portrait seed={c.portraitSeed} gender={c.gender} age={c.profile.age} size={52} title={c.name} />
                <div>
                  <strong>
                    {c.name}
                    {c.isPlayer ? ` (${t('crew.you')})` : ''}
                  </strong>
                  <span className="fine">
                    {t(`trait.${c.traitId}`)} · {SKILLS.map((k) => `${t(`skill.${k}`)} ${c.skills[k]}`).join(' · ')} · {c.profile.massKg} kg
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
        <section className="card">
          <div className="card-head">
            <h2>{t('brief.cargoMass', { kg: used })}</h2>
            <button type="button" className="link-btn" onClick={() => dispatch({ type: 'goTo', phase: 'cargo' })}>
              {t('brief.edit')}
            </button>
          </div>
          {used === 0 ? (
            <p className="muted">{t('brief.cargoNone')}</p>
          ) : (
            <ul className="brief-cargo">
              {ITEMS.filter((i) => (r.cargo[i.id] ?? 0) > 0).map((i) => (
                <li key={i.id}>
                  <ItemIcon id={i.id} size={26} /> {t(`item.${i.id}`)} × {r.cargo[i.id]} <span className="fine">({(r.cargo[i.id] ?? 0) * ITEM_BY_ID[i.id].mass} kg)</span>
                </li>
              ))}
            </ul>
          )}
          <div className="card-head">
            <h2>{t('step.destination')}</h2>
            <button type="button" className="link-btn" onClick={() => dispatch({ type: 'goTo', phase: 'destination' })}>
              {t('brief.edit')}
            </button>
          </div>
          <p>
            <strong>{t(`dest.${dest}`)}</strong> — {t(`dest.${dest}.tag`)}
          </p>
          <p>
            <strong>{t(`site.${r.site}`)}</strong> — <RichText text={t(`site.${r.site}.desc`)} />
          </p>
        </section>
      </div>
      <p className="fine center">{t('brief.timeRule')}</p>
      {blockers.length > 0 && (
        <div className="blockers" role="alert">
          <strong>{t('brief.blocked')}</strong>
          <ul>
            {blockers.map((b) => (
              <li key={b}>{t(b)}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="launch-row">
        <button type="button" className="btn" onClick={() => dispatch({ type: 'goTo', phase: 'cargo' })}>
          ← {t('step.back')}
        </button>
        <button
          type="button"
          className="btn primary huge"
          disabled={blockers.length > 0 || launching}
          onClick={() => {
            setLaunching(true);
            dispatch({ type: 'launch' });
          }}
        >
          {t('brief.launch')} ↗
        </button>
      </div>
    </div>
  );
}
