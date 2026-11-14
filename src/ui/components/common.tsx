import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import type { Locale } from '../../engine';
import { useStore } from '../store';

export function StatBar({ label, value, max = 100, tone, suffix, invert }: { label: string; value: number; max?: number; tone?: 'tech' | 'sci' | 'team' | 'auto'; suffix?: string; invert?: boolean }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  let cls: string = tone ?? 'auto';
  if (cls === 'auto') {
    const good = invert ? 100 - pct : pct;
    cls = good >= 60 ? 'good' : good >= 35 ? 'mid' : 'low';
  }
  return (
    <div className="statbar">
      <div className="statbar-head">
        <span>{label}</span>
        <span className="statbar-val">
          {Math.round(value)}
          {suffix}
        </span>
      </div>
      <div className="statbar-track" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.round(value)}>
        <div className={`statbar-fill ${cls}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** Info disclosure: opens on hover, focus, click and tap; closes on Escape or outside click. */
export function InfoTip({ label, children, className }: { label: ReactNode; children: ReactNode; className?: string }) {
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const id = useId();
  const ref = useRef<HTMLSpanElement>(null);
  const popRef = useRef<HTMLSpanElement>(null);
  // The popover is position:fixed so cards with overflow:hidden never clip it; keep it inside the viewport.
  useLayoutEffect(() => {
    const el = popRef.current;
    const anchor = ref.current;
    if (!open || !el || !anchor) return;
    const a = anchor.getBoundingClientRect();
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const left = Math.max(8, Math.min(window.innerWidth - w - 8, a.left - 10));
    let top = a.bottom + 6;
    if (top + h > window.innerHeight - 8) top = Math.max(8, a.top - h - 6);
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
  }, [open]);
  useEffect(() => {
    if (!open || pinned) return;
    const close = () => setOpen(false);
    window.addEventListener('scroll', close, true);
    return () => window.removeEventListener('scroll', close, true);
  }, [open, pinned]);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setPinned(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setPinned(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  return (
    <span className={`infotip ${className ?? ''}`} ref={ref} onMouseEnter={() => setOpen(true)} onMouseLeave={() => !pinned && setOpen(false)}>
      <button
        type="button"
        className="infotip-btn"
        aria-expanded={open}
        aria-controls={id}
        onClick={(e) => {
          e.stopPropagation();
          setPinned(!pinned || !open);
          setOpen(!(pinned && open));
        }}
        onFocus={() => setOpen(true)}
        onBlur={(e) => {
          if (!pinned && !ref.current?.contains(e.relatedTarget as Node)) setOpen(false);
        }}
      >
        {label}
      </button>
      {open && (
        <span className="infotip-pop" id={id} role="note" ref={popRef}>
          {children}
        </span>
      )}
    </span>
  );
}

export function LangSwitch({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, t } = useStore();
  const cur: Locale = locale ?? 'en';
  return (
    <div className={`lang-switch ${compact ? 'compact' : ''}`} role="group" aria-label={t('app.language')}>
      {(['en', 'tr'] as const).map((l) => (
        <button key={l} type="button" className={cur === l ? 'on' : ''} aria-pressed={cur === l} onClick={() => setLocale(l)}>
          {l === 'en' ? 'EN' : 'TR'}
        </button>
      ))}
    </div>
  );
}

export function Toast() {
  const { error, clearError, t } = useStore();
  useEffect(() => {
    if (!error) return;
    const id = window.setTimeout(clearError, 3500);
    return () => window.clearTimeout(id);
  }, [error, clearError]);
  if (!error) return null;
  return (
    <div className="toast" role="alert" onClick={clearError}>
      {t(error)}
    </div>
  );
}

export function Modal({ title, onClose, children, labelledBy, wide }: { title?: string; onClose?: () => void; children: ReactNode; labelledBy?: string; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const el = ref.current;
    const first = el?.querySelector<HTMLElement>('button, [href], input, [tabindex]:not([tabindex="-1"])');
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) onClose();
      if (e.key === 'Tab' && el) {
        const f = Array.from(el.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input, [tabindex]:not([tabindex="-1"])'));
        if (!f.length) return;
        const a = f[0];
        const z = f[f.length - 1];
        if (e.shiftKey && document.activeElement === a) {
          e.preventDefault();
          z.focus();
        } else if (!e.shiftKey && document.activeElement === z) {
          e.preventDefault();
          a.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} aria-labelledby={labelledBy} ref={ref}>
        {children}
      </div>
    </div>
  );
}

export function pad2(n: number) {
  return String(n).padStart(2, '0');
}

export function clockParts(minute: number) {
  const day = Math.floor(minute / 1440) + 1;
  const hh = Math.floor((minute % 1440) / 60);
  const mm = Math.floor(minute % 60);
  return { day, hh: pad2(hh), mm: pad2(mm) };
}
