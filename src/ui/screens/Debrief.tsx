import { useState } from 'react';
import { characterById, computeOutcome } from '../../engine';
import { Portrait } from '../art/Portrait';
import { Landscape } from '../art/Scenes';
import { LangSwitch } from '../components/common';
import { useStore } from '../store';
import { echoText } from '../text';
import { JournalList } from './Mission';
import { RecapReel } from './Recap';
import { Brand } from './Title';

export function DebriefScreen() {
  const { run, t, startNew, quitToTitle } = useStore();
  const r = run!;
  const m = r.mission!;
  const o = computeOutcome(r);
  const [showLog, setShowLog] = useState(false);
  const status = (id: string) => {
    const c = m.crew.find((x) => x.id === id)!;
    if (c.status === 'deceased') return 'deceased';
    if (c.status === 'evacuated') return 'evacuated';
    return o.home.includes(id) ? 'home' : 'stayed';
  };
  return (
    <div className={`debrief theme-${r.destination}`}>
      <header className="topbar">
        <button type="button" className="brand-btn" onClick={quitToTitle} aria-label={t('hud.menu')}>
          <Brand small />
        </button>
        <h1 className="topbar-title">{t('debrief.heading')}</h1>
        <LangSwitch compact />
      </header>
      <main id="main" className="debrief-main">
        <section className={`debrief-hero rating-${o.rating}`}>
          <div className="debrief-art">
            <Landscape dest={r.destination!} compact />
          </div>
          <div className="debrief-hero-text">
            <p className="kind-tag kt-result">{t(`dest.${r.destination}`)}</p>
            <h2>{t(`debrief.rating.${o.rating}`)}</h2>
            <p>{t(`debrief.rating.${o.rating}.desc`)}</p>
            <p className="science">
              {t('debrief.days', { d: Math.ceil(o.daysOnSurface - 1e-6) })} · {t('debrief.science', { v: o.science })}
            </p>
            {o.rating !== 'success' && o.reasons.length > 0 && (
              <div className="reasons">
                <strong>{t('debrief.why')}</strong>
                <ul>
                  {o.reasons.map((x) => (
                    <li key={x}>{t(x)}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>

        <RecapReel run={r} />

        <section className="card">
          <h2>{t('debrief.crew')}</h2>
          <ul className="debrief-crew">
            {m.crew.map((c) => {
              const ch = characterById(r, c.id);
              const st = status(c.id);
              return (
                <li key={c.id} className={`st-${st}`}>
                  <Portrait seed={ch.portraitSeed} gender={ch.gender} age={ch.profile.age} size={64} title={ch.name} />
                  <strong>{ch.name}</strong>
                  <span className="badge">{t(`debrief.status.${st}`)}</span>
                  <span className="fine">
                    {t('crewPanel.health')} {Math.round(c.health)} · {t('crewPanel.stress')} {Math.round(c.stress)}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        <div className="debrief-grid">
          <section className="card">
            <h2>{t('debrief.decisions')}</h2>
            <ol className="key-decisions">
              {o.keyDecisions.map((d) => (
                <li key={d.instanceId}>
                  <strong>{t(d.eventId === 'EMG-MED' ? 'ev.EMG-MED.short' : `ev.${d.eventId}.title`, { dest: t(`dest.${r.destination}`) })}</strong>
                  <span>{t(`ev.${d.eventId}.${d.optionId}.label`)}</span>
                  {d.probability !== null && (
                    <span className="fine">
                      {t('debrief.chanceWas', { pct: Math.round(d.probability * 100) })} · {d.success ? t('debrief.success') : t('debrief.failed')}
                    </span>
                  )}
                  <span className="fine">{t(`ev.${d.eventId}.${d.optionId}.${d.success ? 'ok' : 'fail'}`, { names: d.crewIds.map((id) => characterById(r, id).name).join(' & '), name: '' })}</span>
                </li>
              ))}
            </ol>
          </section>
          <section className="card">
            <h2>{t('debrief.echoes')}</h2>
            {o.echoes.length ? (
              <ul className="echo-list">
                {o.echoes.map((e, i) => {
                  const x = echoText(t, r, e);
                  return (
                    <li key={i} className="echo">
                      ✦ {t(x.key, x.params)} <span className="fine">— {t(e.eventId === 'EMG-MED' ? 'ev.EMG-MED.short' : `ev.${e.eventId}.title`, { dest: t(`dest.${r.destination}`) })}</span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="muted">{t('debrief.noEchoes')}</p>
            )}
          </section>
          <section className="card wide">
            <h2>{t('debrief.lessons')}</h2>
            <ul className="lessons">
              {o.lessons.map((l) => (
                <li key={l}>{t(l)}</li>
              ))}
            </ul>
          </section>
        </div>

        <section className="card">
          <button type="button" className="link-btn" aria-expanded={showLog} onClick={() => setShowLog(!showLog)}>
            {t('debrief.timeline')} ({m.journal.length})
          </button>
          {showLog && <JournalList run={r} />}
        </section>

        <div className="launch-row">
          <button type="button" className="btn big" onClick={() => startNew(r.mode, r.seed)}>
            ↻ {t('debrief.retrySame')}
          </button>
          <button type="button" className="btn primary big" onClick={() => startNew(r.mode)}>
            {t('debrief.retryNew')}
          </button>
        </div>
      </main>
    </div>
  );
}
