import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ITEMS, activeCrew, type RunState } from '../../engine';
import { formatFixed } from '../../i18n';
import { useLocale, useStore } from '../store';

// items that work on their own once loaded (same list as the cargo screen)
const PASSIVE = new Set(['battery', 'food', 'shield', 'moxie', 'spectro']);

/** Surface top row: an "Inventory" chip that opens a small panel with stocks and the cargo still left. */
export function InventoryChip({ run }: { run: RunState }) {
  const { t } = useStore();
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLSpanElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const leaveTimer = useRef<number | undefined>(undefined);
  const m = run.mission!;

  // the chip row can scroll sideways on phones, so the panel is position:fixed under the button and kept on screen
  useLayoutEffect(() => {
    const el = panel.current;
    const b = btn.current;
    if (!open || !el || !b) return;
    const a = b.getBoundingClientRect();
    const w = el.offsetWidth;
    el.style.left = `${Math.max(8, Math.min(window.innerWidth - w - 8, a.left))}px`;
    el.style.top = `${a.bottom + 6}px`;
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const onScroll = (e: Event) => {
      if (panel.current && e.target instanceof Node && panel.current.contains(e.target)) return;
      setOpen(false);
    };
    window.addEventListener('scroll', onScroll, true);
    return () => window.removeEventListener('scroll', onScroll, true);
  }, [open]);
  useEffect(() => () => window.clearTimeout(leaveTimer.current), []);

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const away = (e: PointerEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', esc);
    document.addEventListener('pointerdown', away);
    return () => {
      document.removeEventListener('keydown', esc);
      document.removeEventListener('pointerdown', away);
    };
  }, [open]);

  const r = m.resources;
  const n = Math.max(1, activeCrew(m).length);
  const brought = ITEMS.filter((i) => (run.cargo[i.id] ?? 0) > 0);
  const row = (label: string, value: string, pct?: number) => (
    <li className="inv-row">
      <span>{label}</span>
      <strong>{value}</strong>
      {pct !== undefined && (
        <span className="inv-bar" aria-hidden="true">
          <span style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
        </span>
      )}
    </li>
  );

  return (
    // closes with ×, Escape, a click elsewhere, or when the mouse leaves the panel
    <span
      role="listitem"
      className="inv-wrap"
      ref={box}
      onMouseEnter={() => window.clearTimeout(leaveTimer.current)}
      onMouseLeave={() => {
        window.clearTimeout(leaveTimer.current);
        leaveTimer.current = window.setTimeout(() => setOpen(false), 250);
      }}
    >
      <button ref={btn} type="button" className="cd-chip cd-inv" aria-expanded={open} aria-controls="inv-panel" onClick={() => setOpen((o) => !o)} data-testid="inv-btn">
        <span aria-hidden="true">🎒</span>
        <span className="cd-name">{t('inv.open')}</span>
      </button>
      {open && (
        <div ref={panel} className="inv-panel" id="inv-panel" role="dialog" aria-label={t('inv.title')} data-testid="inv-panel">
          <div className="inv-head">
            <strong>{t('inv.title')}</strong>
            <button type="button" className="inv-x" aria-label={t('inv.close')} onClick={() => setOpen(false)}>
              ×
            </button>
          </div>
          <p className="inv-kicker">{t('inv.supplies')}</p>
          <ul className="inv-list">
            {row(t('inv.battery'), `${formatFixed(locale, r.batteryKWh, 0)} / ${r.batteryCapKWh} kWh`, (r.batteryKWh / r.batteryCapKWh) * 100)}
            {row(t('inv.o2'), `${formatFixed(locale, r.o2Kg, 1)} kg`)}
            {row(t('inv.water'), `${formatFixed(locale, r.waterL, 0)} L`)}
            {row(t('inv.food'), t('inv.foodDays', { v: formatFixed(locale, r.foodCrewDays, 1), d: formatFixed(locale, r.foodCrewDays / n, 1), n }))}
          </ul>
          <p className="fine inv-note">
            {t('inv.crop', { crop: t(`crop.${m.crop}`), p: Math.round(m.systems.greenhouseGrowth) })} · {t('inv.harvests', { n: m.harvests })}
          </p>
          <p className="inv-kicker">{t('inv.cargo')}</p>
          {brought.length === 0 ? (
            <p className="fine">{t('inv.none')}</p>
          ) : (
            <ul className="inv-list">
              {brought.map((i) => {
                const had = run.cargo[i.id] ?? 0;
                const left = m.items[i.id] ?? 0;
                return (
                  <li key={i.id} className={`inv-row ${left === 0 ? 'used' : ''}`}>
                    <span>{t(`item.${i.id}`)}</span>
                    <strong>{PASSIVE.has(i.id) ? t('inv.passive') : t('inv.left', { left, brought: had })}</strong>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </span>
  );
}
