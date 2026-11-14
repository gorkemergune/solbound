import { useEffect, useState } from 'react';
import { MissionPatch, Panorama } from '../art/Panorama';
import { LangSwitch, Modal } from '../components/common';
import { RichText } from '../components/RichText';
import { SpaceWeatherCard } from '../components/SpaceWeatherCard';
import { useStore } from '../store';

function Logo() {
  return (
    <svg viewBox="0 0 48 48" width="44" height="44" aria-hidden="true" className="logo-mark">
      <circle cx="24" cy="30" r="15" fill="#c2643a" />
      <path d="M9 30a15 15 0 0 1 30 0" fill="#e08a56" />
      <circle cx="34" cy="11" r="4" fill="#f5b041" />
      <path d="M4 34c12-8 28-12 42-12" stroke="#f5b041" strokeWidth="2" fill="none" strokeDasharray="2 4" />
    </svg>
  );
}

export function Brand({ small }: { small?: boolean }) {
  return (
    <span className={`brand ${small ? 'small' : ''}`}>
      <Logo />
      <span className="brand-name">Solbound</span>
    </span>
  );
}

const FEATURES = [
  { id: 'crew', icon: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 4-6 8-6s8 2 8 6' },
  { id: 'mass', icon: 'M6 9h12l2 11H4zM9 9V7a3 3 0 0 1 6 0v2' },
  { id: 'science', icon: 'M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3' },
  { id: 'home', icon: 'M3 11l9-7 9 7M5 10v10h14V10' },
] as const;

export function TitleScreen() {
  const { t, savedRun, startNew, resume, saveNotice, storageOk } = useStore();
  const [confirm, setConfirm] = useState(false);
  const [modal, setModal] = useState<null | 'story' | 'how'>(null);
  const [fact, setFact] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setFact((f) => (f + 1) % 6), 7000);
    return () => window.clearInterval(id);
  }, []);

  const info =
    savedRun &&
    t('title.continueInfo', {
      name: savedRun.player.name,
      dest: savedRun.destination ? t(`dest.${savedRun.destination}`) : '—',
      phase: t(`phase.${savedRun.phase}`),
    });

  return (
    <div className="title-page">
      <header className="title-nav">
        <Brand small />
        <nav className="title-links" aria-label="Solbound">
          <button type="button" className="nav-link" onClick={() => setModal('story')}>
            {t('title.story')}
          </button>
          <button type="button" className="nav-link" onClick={() => setModal('how')}>
            {t('title.how')}
          </button>
        </nav>
        <LangSwitch />
      </header>

      <main id="main" className="title-hero">
        <Panorama />
        <div className="hero-content">
          <MissionPatch size={132} />
          <h1 className="hero-title">Solbound</h1>
          <p className="hero-tagline">{t('app.tagline')}</p>
          <ol className="pitch">
            {(['title.pitch1', 'title.pitch2', 'title.pitch3', 'title.pitch4'] as const).map((k, i) => (
              <li key={k}>
                <span className="pitch-n">{i + 1}</span>
                {t(k)}
              </li>
            ))}
          </ol>
          <div className="title-actions">
            <button type="button" className="btn primary big" onClick={() => (savedRun ? setConfirm(true) : startNew())}>
              {t('title.newMission')}
            </button>
            {savedRun && (
              <button type="button" className="btn big ghost" onClick={resume}>
                <strong>{t('title.continue')}</strong>
                <span>{info}</span>
              </button>
            )}
            <button type="button" className="btn big ghost" onClick={() => setModal('story')}>
              <strong>{t('title.story')}</strong>
            </button>
          </div>
          {saveNotice && <p className="notice">{t(saveNotice === 'corrupt' ? 'title.saveCorrupt' : 'title.saveVersion')}</p>}
          {!storageOk && <p className="notice">{t('title.noStorage')}</p>}
          <p className="demo-badge">{t('app.missionBadge')}</p>
        </div>
        <aside className="fact-card" aria-live="polite">
          <span className="fact-kicker">{t('title.facts')}</span>
          <p key={fact} className="fact-text">
            {t(`title.fact${fact + 1}`)}
          </p>
          <div className="fact-dots" role="group" aria-label={t('title.facts')}>
            {Array.from({ length: 6 }, (_, i) => (
              <button key={i} type="button" className={i === fact ? 'on' : ''} aria-label={`${i + 1}`} aria-pressed={i === fact} onClick={() => setFact(i)} />
            ))}
          </div>
          <span className="fine">{t('title.factSource')}</span>
        </aside>
      </main>

      <div className="title-sw">
        <SpaceWeatherCard />
      </div>

      <section className="features" aria-label={t('title.how')}>
        {FEATURES.map((f, i) => (
          <article key={f.id} className="feature">
            <svg viewBox="0 0 24 24" width="34" height="34" aria-hidden="true">
              <path d={f.icon} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p>{t(`title.how${i + 1}`)}</p>
          </article>
        ))}
      </section>

      <footer className="title-footer fine">
        <p>{t('app.missionNote')}</p>
        <p>
          {t('app.footer')} {t('title.dataNote')}
        </p>
      </footer>

      {modal === 'story' && (
        <Modal title={t('title.storyTitle')} onClose={() => setModal(null)} wide>
          <div className="story">
            <MissionPatch size={88} />
            <h2>{t('title.storyTitle')}</h2>
            {[1, 2, 3, 4].map((i) => (
              <p key={i}>{t(`title.story${i}`)}</p>
            ))}
            <div className="row gap">
              <button type="button" className="btn" onClick={() => setModal(null)}>
                {t('title.close')}
              </button>
              <button
                type="button"
                className="btn primary"
                onClick={() => {
                  setModal(null);
                  if (savedRun) setConfirm(true);
                  else startNew();
                }}
              >
                {t('title.newMission')}
              </button>
            </div>
          </div>
        </Modal>
      )}
      {modal === 'how' && (
        <Modal title={t('title.how')} onClose={() => setModal(null)} wide>
          <h2>{t('title.how')}</h2>
          <ol className="how-list">
            {[1, 2, 3, 4].map((i) => (
              <li key={i}>
                <RichText text={t(`title.how${i}`)} />
              </li>
            ))}
          </ol>
          <button type="button" className="btn primary" onClick={() => setModal(null)}>
            {t('title.close')}
          </button>
        </Modal>
      )}
      {confirm && (
        <Modal title={t('title.newMission')} onClose={() => setConfirm(false)}>
          <p>{t('title.overwrite')}</p>
          <div className="row gap">
            <button type="button" className="btn" onClick={() => setConfirm(false)}>
              {t('title.cancel')}
            </button>
            <button
              type="button"
              className="btn primary"
              onClick={() => {
                setConfirm(false);
                startNew();
              }}
            >
              {t('title.overwriteYes')}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
