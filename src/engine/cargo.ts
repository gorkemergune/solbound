import type { Character, DestinationId, ItemId } from './types';

/**
 * Launch mass budget. NASA's crop researchers note that "you can't pack everything you need for a
 * long-duration spaceflight" (sourced, R-MASS). The numbers below are GAMEPLAY parameters:
 * total payload for the crew vehicle, including the four people, their personal kit and extra cargo.
 */
export const LAUNCH_CAPACITY_KG = 520;
/** Per person: suit liner and clothes, hygiene, personal tools and small spare parts (gameplay). */
export const PERSONAL_KIT_KG = 20;

export type ItemCategory = 'lifeSupport' | 'power' | 'food' | 'repair' | 'safety' | 'science' | 'crew';

export type ItemDef = {
  id: ItemId;
  mass: number; // kg per unit (gameplay value)
  max: number;
  category: ItemCategory;
  /** if set, the item only works at these destinations; launch is blocked otherwise */
  onlyAt?: DestinationId[];
};

export const ITEMS: ItemDef[] = [
  { id: 'parts', mass: 24, max: 3, category: 'repair' },
  { id: 'sealant', mass: 6, max: 2, category: 'repair' },
  { id: 'filter', mass: 8, max: 3, category: 'lifeSupport' },
  { id: 'o2candle', mass: 9, max: 2, category: 'lifeSupport' },
  { id: 'purifier', mass: 22, max: 1, category: 'lifeSupport', onlyAt: ['mars'] },
  { id: 'moxie', mass: 24, max: 1, category: 'lifeSupport', onlyAt: ['mars'] },
  { id: 'battery', mass: 32, max: 2, category: 'power' },
  { id: 'cleaner', mass: 7, max: 1, category: 'power' },
  { id: 'food', mass: 18, max: 4, category: 'food' },
  { id: 'seeds', mass: 5, max: 2, category: 'food' },
  { id: 'potato', mass: 12, max: 1, category: 'food' },
  { id: 'soy', mass: 6, max: 1, category: 'food' },
  { id: 'shield', mass: 32, max: 1, category: 'safety' },
  { id: 'medkit', mass: 7, max: 2, category: 'safety' },
  { id: 'spectro', mass: 14, max: 1, category: 'science' },
  { id: 'comfort', mass: 4, max: 2, category: 'crew' },
];

export const ITEM_BY_ID: Record<ItemId, ItemDef> = Object.fromEntries(ITEMS.map((i) => [i.id, i])) as Record<ItemId, ItemDef>;

export function cargoMass(cargo: Partial<Record<ItemId, number>>): number {
  let v = 0;
  for (const [id, qty] of Object.entries(cargo)) {
    const def = ITEM_BY_ID[id as ItemId];
    if (def && qty) v += def.mass * qty;
  }
  return v;
}

export type PayloadBreakdown = { crewKg: number; kitKg: number; cargoKg: number; totalKg: number; capacityKg: number; freeKg: number };

/** Crew bodies + personal kits + cargo. Only selected people count. */
export function payload(crew: Character[], cargo: Partial<Record<ItemId, number>>): PayloadBreakdown {
  const crewKg = crew.reduce((a, c) => a + c.profile.massKg, 0);
  const kitKg = crew.length * PERSONAL_KIT_KG;
  const cargoKg = cargoMass(cargo);
  const totalKg = crewKg + kitKg + cargoKg;
  return { crewKg, kitKg, cargoKg, totalKg, capacityKg: LAUNCH_CAPACITY_KG, freeKg: LAUNCH_CAPACITY_KG - totalKg };
}

export type CargoError = 'unknownItem' | 'notInteger' | 'negative' | 'overMax' | 'overCapacity';

export function validateQuantity(crew: Character[], cargo: Partial<Record<ItemId, number>>, itemId: string, qty: number): CargoError | null {
  const def = ITEM_BY_ID[itemId as ItemId];
  if (!def) return 'unknownItem';
  if (!Number.isInteger(qty)) return 'notInteger';
  if (qty < 0) return 'negative';
  if (qty > def.max) return 'overMax';
  const cur = cargo[itemId as ItemId] ?? 0;
  // Removing is always allowed, so an over-budget bay can be fixed.
  if (qty > cur && payload(crew, { ...cargo, [itemId]: qty }).freeKg < 0) return 'overCapacity';
  return null;
}

/** Items that cannot work at the chosen destination (blocks launch with a reason). */
export function incompatibleItems(cargo: Partial<Record<ItemId, number>>, destination: DestinationId | null): ItemId[] {
  if (!destination) return [];
  return (Object.keys(cargo) as ItemId[]).filter((id) => {
    const def = ITEM_BY_ID[id];
    return (cargo[id] ?? 0) > 0 && def.onlyAt && !def.onlyAt.includes(destination);
  });
}
