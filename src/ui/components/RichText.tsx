import { Fragment, type ReactNode } from 'react';
import { useStore } from '../store';
import { InfoTip } from './common';

// Glossary markup inside translations: [[termId|shown text]]
const RE = /\[\[([a-zA-Z0-9]+)\|([^\]]+)\]\]/g;

/** Plain text version (for aria-labels, titles, lists). */
export function stripGloss(s: string): string {
  return s.replace(RE, '$2');
}

/** Renders translated text; glossary terms get a small ⓘ that explains them on hover, focus or tap. */
export function RichText({ text }: { text: string }) {
  const { t } = useStore();
  const lines = text.split('\n');
  return (
    <>
      {lines.map((line, li) => {
        const parts: ReactNode[] = [];
        let last = 0;
        for (const m of line.matchAll(RE)) {
          const idx = m.index ?? 0;
          if (idx > last) parts.push(line.slice(last, idx));
          const def = t(`gloss.${m[1]}`);
          parts.push(
            <span className="term" key={idx}>
              {m[2]}
              <InfoTip label={<span aria-label={`${stripGloss(m[2])}: ?`}>i</span>} className="gloss">
                {def}
              </InfoTip>
            </span>,
          );
          last = idx + m[0].length;
        }
        if (last < line.length) parts.push(line.slice(last));
        return (
          <Fragment key={li}>
            {li > 0 && <br />}
            {parts}
          </Fragment>
        );
      })}
    </>
  );
}

/** Shorthand: translate + render glossary. */
export function useRt() {
  const { t } = useStore();
  return (key: string, params?: Record<string, string | number | undefined>) => <RichText text={t(key, params)} />;
}
