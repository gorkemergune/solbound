import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { getSoundSettings, setSoundSettings, subscribeSound } from '../../audio/sound';
import { useStore } from '../store';

/** Speaker button in the top bar of every screen: mute, music volume and effects volume. */
export function SoundControl() {
  const { t } = useStore();
  const s = useSyncExternalStore(subscribeSound, getSoundSettings, getSoundSettings);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', away);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  const silent = s.muted || (s.music === 0 && s.sfx === 0);
  const icon = silent ? '🔇' : s.music + s.sfx < 0.6 ? '🔈' : '🔊';
  return (
    <div className="sound-ctl" ref={box}>
      <button
        type="button"
        className="sound-btn"
        aria-label={t('sound.title')}
        aria-expanded={open}
        aria-controls={panelId}
        title={t('sound.title')}
        onClick={() => setOpen((o) => !o)}
        data-testid="sound-btn"
      >
        <span aria-hidden="true">{icon}</span>
      </button>
      {open && (
        <div className="sound-panel" id={panelId} role="group" aria-label={t('sound.title')} data-testid="sound-panel">
          <button type="button" className={`btn small ${s.muted ? '' : 'ghost'}`} aria-pressed={s.muted} onClick={() => setSoundSettings({ muted: !s.muted })}>
            {s.muted ? t('sound.unmute') : t('sound.mute')}
          </button>
          <label>
            <span>{t('sound.music')}</span>
            <input type="range" min={0} max={100} step={5} value={Math.round(s.music * 100)} onChange={(e) => setSoundSettings({ music: Number(e.target.value) / 100, muted: false })} />
          </label>
          <label>
            <span>{t('sound.sfx')}</span>
            <input type="range" min={0} max={100} step={5} value={Math.round(s.sfx * 100)} onChange={(e) => setSoundSettings({ sfx: Number(e.target.value) / 100, muted: false })} />
          </label>
          <p className="fine">{t('sound.note')}</p>
        </div>
      )}
    </div>
  );
}
