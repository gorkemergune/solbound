import { useEffect, useRef } from 'react';
import { DEPART_HOUR, returnStatus, scenarioOf, type RunState } from '../../engine';
import { formatFixed } from '../../i18n';
import { useLocale, useStore } from '../store';
import { Modal } from './common';

/** "Go home": what the trip needs against what the base has, and what it means for the goal. */
export function ReturnHomeModal({ run, onClose }: { run: RunState; onClose: () => void }) {
  const { t, dispatch } = useStore();
  const locale = useLocale();
  const m = run.mission!;
  const s = scenarioOf(run);
  const st = returnStatus(run, m);
  const n = m.crew.filter((c) => c.status === 'active').length;
  const now = Math.floor((m.minute - 360) / 1440) + 1;
  const reached = (m.minute - 360) / 1440 >= m.goal.target;
  // pause while the dialog is open, and restore the previous state afterwards
  const wasPaused = useRef(run.manualPause);
  useEffect(() => {
    dispatch({ type: 'setPause', paused: true });
    return () => {
      dispatch({ type: 'setPause', paused: wasPaused.current });
    };
  }, [dispatch]);
  const unit: Record<string, (v: number) => string> = {
    food: (v) => t('res.crewDays', { v: formatFixed(locale, v, 1) }),
    o2: (v) => t('res.kg', { v: formatFixed(locale, v, 1) }),
    water: (v) => t('res.l', { v: formatFixed(locale, v, 0) }),
    battery: (v) => `${formatFixed(locale, v, 0)} kWh`,
  };
  return (
    <Modal title={t('ret.title')} onClose={onClose}>
      <div className="return-home" data-testid="return-home">
        <h2>{t('ret.title')}</h2>
        <p>{t('ret.sub', { d: s.returnDays, how: t(`ret.how.${run.destination}`), n })}</p>
        <ul className="ret-lines">
          {st.lines
            .filter((l) => l.key !== 'crew')
            .map((l) => (
              <li key={l.key} className={l.ok ? 'ok' : 'short'}>
                <span className="check-mark" aria-hidden="true">
                  {l.ok ? '✓' : '!'}
                </span>
                <strong>{t(`return.line.${l.key}`)}</strong>
                <span>{unit[l.key](l.need)}</span>
                <span className="fine">{t('ret.have', { v: unit[l.key](l.have) })}</span>
              </li>
            ))}
        </ul>
        <p className={st.ready ? 'good-line' : 'warn-line'}>{st.ready ? t('ret.ready') : t('ret.notReady')}</p>
        <p className={reached ? 'good-line' : 'warn-line'}>{reached ? t('ret.goalOk', { d: m.goal.target }) : t('ret.goalLeft', { d: m.goal.target, now })}</p>
        <p className="fine">{t('ret.window', { hh: String(DEPART_HOUR).padStart(2, '0') })}</p>
        {m.activeEvent && <p className="fine">{t('ret.busy')}</p>}
        <div className="row gap">
          <button type="button" className="btn" onClick={onClose}>
            {t('ret.cancel')}
          </button>
          <button
            type="button"
            className="btn primary"
            disabled={!!m.activeEvent}
            onClick={() => {
              wasPaused.current = false;
              dispatch({ type: 'returnHome' });
              dispatch({ type: 'setPause', paused: false }); // the clock runs on to the departure window
              onClose();
            }}
          >
            {t('ret.confirm')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
