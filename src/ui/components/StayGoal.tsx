import { useMemo } from 'react';
import { estimateStay, scenarioOf, type RunState } from '../../engine';
import { useStore } from '../store';
import { InfoTip } from './common';

/** Pre-launch endurance estimate and the mission goal; recomputed whenever crew, site or cargo change. */
export function StayGoal({ run, compact = false }: { run: RunState; compact?: boolean }) {
  const { t } = useStore();
  const key = JSON.stringify([run.destination, run.site, run.crewIds, run.cargo, run.seed]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const g = useMemo(() => estimateStay(run), [key]);
  const max = scenarioOf(run).missionDays;
  return (
    <section className={`stay-goal ${compact ? 'compact' : ''}`} data-testid="stay-goal">
      <h3>
        {t('goal.title')}{' '}
        <InfoTip label="i" className="gloss">
          {t('goal.explain')}
        </InfoTip>
      </h3>
      <p className="sg-est">{g.estimate >= max ? t('goal.estimateMax', { d: max }) : t('goal.estimate', { d: g.estimate })}</p>
      <p className="sg-target">
        <strong>{t('goal.target', { d: g.target })}</strong>
      </p>
      <p className="fine">{t(`goal.limit.${g.limiting ?? 'none'}`)}</p>
    </section>
  );
}
