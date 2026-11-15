// Credits shown by the "Credits" button on the title screen. Fill in the names, roles and the portfolio link.
// Empty entries are hidden; with no names at all the modal shows only the NASA data note.
export type CreditPerson = { name: string; role?: { en: string; tr: string }; link?: string };

export const CREDITS: { team: CreditPerson[]; portfolio: string } = {
  team: [
    { name: 'Görkem Ergüne' },
    { name: 'Gözde Kacar' },
    // { name: 'Ad Soyad', role: { en: 'Design and code', tr: 'Tasarım ve kod' }, link: 'https://…' },
  ],
  portfolio: '', // e.g. 'https://example.com'
};
