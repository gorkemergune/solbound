import { LANDING_BY_ID, landingsFor, type DestinationId, type Difficulty, type LandingSite } from '../../engine';
import { useStore } from '../store';

export function DiffChip({ d }: { d: Difficulty }) {
  const { t } = useStore();
  return <span className={`diff-chip diff-${d}`}>{t(`diff.${d}`)}</span>;
}

/** What a landing site changes, as short plain-language lines (from the site's gameplay modifiers). */
export function landingTraits(l: LandingSite): string[] {
  const out: string[] = [];
  if (l.solarMul > 1.02) out.push('land.t.sunUp');
  if (l.solarMul < 0.98) out.push('land.t.sunDown');
  if (l.thermalAdd > 0.05) out.push('land.t.cold');
  if (l.thermalAdd < -0.05) out.push('land.t.warm');
  if (l.waterDelta > 5) out.push('land.t.wet');
  if (l.waterDelta < -5) out.push('land.t.dry');
  if (l.shelterAdd > 0) out.push('land.t.shelter');
  if (l.dustMul > 1.02) out.push('land.t.dusty');
  if (l.dustMul < 0.98) out.push('land.t.calm');
  if (l.ghMul > 1.02) out.push('land.t.grow');
  if (l.ghMul < 0.98) out.push('land.t.poor');
  return out;
}

/** Destination screen: the site is a surprise; list every possible site with its difficulty. */
export function RandomLanding({ dest }: { dest: DestinationId }) {
  const { t } = useStore();
  const sites = landingsFor(dest);
  return (
    <div className="random-landing">
      <h3>🎲 {t('land.random')}</h3>
      <p className="fine">{t('land.randomDesc', { n: sites.length })}</p>
      <h4>{t('land.possible')}</h4>
      <ul className="landing-list">
        {sites.map((l) => (
          <li key={l.id} title={t(`site.landing.${l.id}.desc`)}>
            <span>{t(`site.landing.${l.id}`)}</span> <DiffChip d={l.difficulty} />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Landing reveal: name, difficulty, description and what it means. */
export function LandingCard({ id }: { id: string | null }) {
  const { t } = useStore();
  const l = id ? LANDING_BY_ID[id] : null;
  if (!l) return null;
  const traits = landingTraits(l);
  return (
    <section className="landing-reveal" data-testid="landing-reveal">
      <p className="lc-kicker">{t('land.reveal')}</p>
      <h2>
        {t(`site.landing.${l.id}`)} <DiffChip d={l.difficulty} />
      </h2>
      <p className="fine">{t(`site.landing.${l.id}.desc`)}</p>
      {traits.length > 0 && (
        <ul className="lc-traits" aria-label={t('land.traits')}>
          {traits.map((k) => (
            <li key={k}>{t(k)}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Display name of the run's landing site (falls back to the base site type). */
export function landingName(t: (k: string, p?: Record<string, string | number>) => string, landing: string | null, site: string | null): string {
  return landing ? t(`site.landing.${landing}`) : site ? t(`site.${site}`) : '';
}
