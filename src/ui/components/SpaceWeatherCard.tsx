import { useEffect, useState } from 'react';
import { countByKind, lightMinutes, marsDistanceAU, type DestinationId } from '../../engine';
import { formatFixed } from '../../i18n';
import { useSpaceWeather } from '../../live/useSpaceWeather';
import { useLocale, useStore } from '../store';

const hhmm = (iso: string | null, locale: string) =>
  iso ? new Date(iso).toLocaleString(locale === 'tr' ? 'tr-TR' : 'en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

/** Live NASA DONKI summary: refreshes itself, shows where the data came from and when it was checked. */
export function SpaceWeatherCard({ dest, compact = false }: { dest?: DestinationId | null; compact?: boolean }) {
  const { t } = useStore();
  const locale = useLocale();
  const { snapshot: s, status, lastCheck, refresh } = useSpaceWeather();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  const c = countByKind(s);
  const toMars = s.records.filter((r) => r.arrivalMars).length;
  const toEarth = s.records.filter((r) => r.arrivalEarth).length;
  const flares = s.records.filter((r) => r.kind === 'flr' && /^[MX]/.test(r.cls ?? '')).length;
  const lastCme = [...s.records].reverse().find((r) => r.kind === 'cme');
  const au = marsDistanceAU(now);
  // a list that could not be fetched is "unknown", never "0"
  const failed = new Set(s.failed);
  const val = (ep: string, n: number) => (failed.has(ep) ? '—' : n);
  const rows: [number | string, string, boolean][] = [
    [val('CME', c.cme), t('sw.cmes'), failed.has('CME')],
    [val('CME', toMars), t('sw.toMars'), failed.has('CME')],
    [val('CME', toEarth), t('sw.toEarth'), failed.has('CME')],
    [val('GST', c.gst), t('sw.storms'), failed.has('GST')],
    [val('SEP', c.sep), t('sw.seps'), failed.has('SEP')],
    [val('FLR', flares), t('sw.flares'), failed.has('FLR')],
  ];
  const shownStatus = status === 'ok' && failed.size ? 'partial' : status;
  return (
    <section className={`sw-card ${compact ? 'compact' : ''}`} aria-live="polite" data-testid="sw-card">
      <header>
        <span className={`sw-dot st-${shownStatus}`} aria-hidden="true" />
        <h3>
          {t('sw.title')} <span className="sw-badge">{t('sw.by')}</span>
        </h3>
        <button type="button" className="btn small ghost" onClick={refresh} disabled={status === 'loading'}>
          ↻ {t('sw.refresh')}
        </button>
      </header>
      <p className="fine sw-meta">
        <span className="sw-status">{t(`sw.status.${shownStatus}`)}</span> · {t('sw.window', { start: s.rangeStart, end: s.rangeEnd })} ·{' '}
        <span className="sw-source-label">{t('sw.fetched', { time: hhmm(s.fetchedAt, locale), source: t(`sw.source.${s.source}`) })}</span>
        {lastCheck && <> · {t('sw.lastCheck', { time: hhmm(lastCheck, locale) })}</>}
      </p>
      <ul className="sw-counts">
        {rows
          .filter(([, label]) => !dest || (dest === 'mars' ? label !== t('sw.toEarth') : label !== t('sw.toMars')))
          .map(([n, label, missing]) => (
            <li key={label} className={missing ? 'missing' : ''}>
              <strong>{n}</strong>
              <span>
                {label}
                {missing && <em> · {t('sw.unknown')}</em>}
              </span>
            </li>
          ))}
      </ul>
      {failed.size > 0 && <p className="fine warn-line">{t('sw.failedList', { list: s.failed.map((e) => t(`sw.ep.${e}`)).join(', ') })}</p>}
      <p className="fine">{t('app.eduSim')}</p>
      {lastCme && <p className="fine">{t('sw.latest', { date: lastCme.time.slice(0, 16).replace('T', ' '), speed: lastCme.speed ?? '?' })}</p>}
      {(!dest || dest === 'mars') && (
        <p className="fine sw-signal">{t('sw.signalToday', { au: formatFixed(locale, au, 3), min: formatFixed(locale, lightMinutes(au), 1) })}</p>
      )}
      {!compact && <p className="fine">{t('sw.how', { start: s.rangeStart })}</p>}
      <p className="fine muted">{t('sw.quiet')}</p>
    </section>
  );
}
