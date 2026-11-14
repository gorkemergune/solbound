import type { ReactElement } from 'react';
import type { ItemId } from '../../engine';

export const ITEM_COLOR: Record<ItemId, string> = {
  parts: '#e0b43f',
  sealant: '#d98b3a',
  filter: '#4aa3df',
  o2candle: '#7fd1c7',
  moxie: '#e07a3f',
  battery: '#77b84a',
  cleaner: '#9aa4b0',
  food: '#e0566e',
  seeds: '#8bc34a',
  shield: '#5c7ee0',
  medkit: '#f08a9a',
  spectro: '#b05ce0',
  comfort: '#f5b041',
  potato: '#c89a5b',
  soy: '#a8c84a',
  purifier: '#5fd3c6',
};

const glyph: Record<ItemId, ReactElement> = {
  parts: <path d="M9 15l6-6m-1-4a4 4 0 0 0 5 5l-9 9a2 2 0 0 1-3-3l9-9a4 4 0 0 0-2-2z" />,
  sealant: <path d="M6 18h12M8 18V9l4-4 4 4v9M10 12h4" />,
  filter: <path d="M5 5h14l-5 7v6l-4 2v-8z" />,
  o2candle: <path d="M9 21h6V9H9zM12 9V6M10.5 4.5c1-1.5 2-1.5 3 0" />,
  moxie: <path d="M5 8h14v10H5zM8 8V5h8v3M9 13h2M13 13h2" />,
  battery: <path d="M4 8h14v8H4zM18 11h2v2h-2M7 11v2M10 11v2M13 11v2" />,
  cleaner: <path d="M4 20l8-8M12 12l4-8 4 4-8 4M6 16l2 2" />,
  food: <path d="M6 4v16M6 10c2 0 3-2 3-6M14 4c2 2 3 4 3 7s-1 4-3 4v5" />,
  seeds: <path d="M12 20v-8M12 12c0-4 3-7 7-7 0 4-3 7-7 7zM12 14c0-3-2-5-6-5 0 3 2 5 6 5z" />,
  shield: <path d="M12 3l7 3v6c0 5-3 8-7 9-4-1-7-4-7-9V6z" />,
  medkit: <path d="M4 7h16v12H4zM9 7V5h6v2M12 10v6M9 13h6" />,
  spectro: <path d="M5 19l5-14h4l5 14M8 13h8M12 5v3" />,
  comfort: <path d="M9 18a3 3 0 1 1-3-3h3V5l10-2v12a3 3 0 1 1-3-3h3" />,
  potato: <path d="M7 9c1-4 8-5 10-1s1 9-4 10S6 13 7 9zM10 11h.01M14 14h.01M12 9h.01" />,
  soy: <path d="M7 18c-2-4 2-12 8-13 2 3-1 11-8 13zM9 15l5-7M10 11h.01M12 9h.01" />,
  purifier: <path d="M8 3h8v4l-2 3v9H10v-9L8 7zM10 14h4M11 17h2" />,
};

export function ItemIcon({ id, size = 28 }: { id: ItemId; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" className="item-icon" style={{ color: ITEM_COLOR[id] }}>
      <rect x="0.5" y="0.5" width="23" height="23" rx="6" fill="currentColor" opacity="0.16" />
      <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {glyph[id]}
      </g>
    </svg>
  );
}
