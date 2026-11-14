import { useMemo } from 'react';
import { GOAL_SHARE, estimateRange, estimateStay, scenarioOf, type RunState } from '../../engine';
import { useStore } from '../store';
import { InfoTip } from './common';

/**
 * Pre-launch endurance estimate and the mission goal; recomputed whenever crew, site or cargo change.
 * Before launch the landing site is still a surprise, so the estimate is shown as a range over every possible site.
 */
export function StayGoal({ run, compact = false }: { run: RunState; compact?: boolean }) {
  const { t } = useStore();
  const known = run.launched || !!run.landing;
  const key = JSON.stringify([run.destination, run.site, run.landing, run.crewIds, run.cargo, run.seed, known]);
  const g = useMemo(
    () => (known ? { one: estimateStay(run), range: null } : { one: null, range: estimateRange(run) }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );
  const max = scenarioOf(run).missionDays;
  return (
    <section className={`stay-goal ${compact ? 'compact' : ''}`} data-testid="stay-goal">
      <h3>
        {t('goal.title')}{' '}
        <InfoTip label="i" className="gloss">
          {t('goal.explain')}
        </InfoTip>
      </h3>
      {g.one ? (
        <>
          <p className="sg-est">{g.one.estimate >= max ? t('goal.estimateMax', { d: max }) : t('goal.estimate', { d: g.one.estimate })}</p>
          <p className="sg-target">
            <strong>{t('goal.target', { d: g.one.target })}</strong>
          </p>
          <p className="fine">{t(`goal.limit.${g.one.limiting ?? 'none'}`)}</p>
        </>
      ) : (
        <>
          <p className="sg-est">{t('land.estimateRange', { min: g.range!.min, max: g.range!.max })}</p>
          <p className="sg-target">
            <strong>{t('goal.targetRange', { min: Math.max(8, Math.floor(g.range!.min * GOAL_SHARE)), max: Math.max(8, Math.floor(g.range!.max * GOAL_SHARE)) })}</strong>
          </p>
        </>
      )}
    </section>
  );
}
