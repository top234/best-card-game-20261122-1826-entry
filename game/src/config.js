// Ember Duel — shared constants, the four elements and the full card catalogue.
// Every card is original: no names, art or mechanics copied from any commercial game.
export const START_LIFE = 22;
export const START_HAND = 5;
export const MAX_HAND = 7;
export const START_MANA = 3;
export const MAX_MANA = 10;
// Bonus to a card's main number when it shares its element with the card played
// just before it on the same turn (the Elemental Chain).
export const CHAIN_BONUS = 2;
export const PLAYER_NAME = 'You';
export const ENEMY_NAME = 'Cinder';

// Each element is told apart by colour AND by shape (flame / drop / gem / swirl),
// never by text alone: the shape is drawn as an inline SVG on every card.
export const ELEMENTS = {
  ember: { name: 'Ember', color: '#e2483d', dark: '#8f1d16', light: '#ffd9cf', shape: 'flame' },
  tide: { name: 'Tide', color: '#2f7fd0', dark: '#144a80', light: '#d3e9ff', shape: 'drop' },
  stone: { name: 'Stone', color: '#7a9a3d', dark: '#42571c', light: '#e4f0c4', shape: 'gem' },
  gale: { name: 'Gale', color: '#17a398', dark: '#0b5c55', light: '#c8f5ef', shape: 'swirl' },
};

// kind: strike (damage), guard (block), mend (heal). `draw` draws extra cards,
// `block` on a strike is bonus block gained alongside the damage.
export const CARDS = [
  { id: 'ember-strike', name: 'Ember Strike', element: 'ember', cost: 1, kind: 'strike', damage: 3, text: 'Deal 3 damage.' },
  { id: 'flame-lash', name: 'Flame Lash', element: 'ember', cost: 2, kind: 'strike', damage: 7, text: 'Deal 7 damage.' },
  { id: 'cinder-guard', name: 'Cinder Guard', element: 'ember', cost: 1, kind: 'guard', block: 3, text: 'Gain 3 block.' },
  { id: 'phoenix-mend', name: 'Phoenix Mend', element: 'ember', cost: 2, kind: 'mend', heal: 2, text: 'Restore 2 life.' },
  { id: 'tide-strike', name: 'Tide Strike', element: 'tide', cost: 1, kind: 'strike', damage: 2, draw: 1, text: 'Deal 2 damage. Draw a card.' },
  { id: 'wave-crash', name: 'Wave Crash', element: 'tide', cost: 3, kind: 'strike', damage: 7, text: 'Deal 7 damage.' },
  { id: 'coral-guard', name: 'Coral Guard', element: 'tide', cost: 2, kind: 'guard', block: 4, text: 'Gain 4 block.' },
  { id: 'spring-mend', name: 'Spring Mend', element: 'tide', cost: 1, kind: 'mend', heal: 2, text: 'Restore 2 life.' },
  { id: 'stone-strike', name: 'Stone Strike', element: 'stone', cost: 2, kind: 'strike', damage: 4, block: 2, text: 'Deal 4 damage. Gain 2 block.' },
  { id: 'boulder-slam', name: 'Boulder Slam', element: 'stone', cost: 3, kind: 'strike', damage: 7, text: 'Deal 7 damage.' },
  { id: 'granite-guard', name: 'Granite Guard', element: 'stone', cost: 1, kind: 'guard', block: 4, text: 'Gain 4 block.' },
  { id: 'roots-mend', name: 'Roots Mend', element: 'stone', cost: 2, kind: 'mend', heal: 4, text: 'Restore 4 life.' },
  { id: 'gale-strike', name: 'Gale Strike', element: 'gale', cost: 0, kind: 'strike', damage: 2, text: 'Deal 2 damage.' },
  { id: 'storm-lash', name: 'Storm Lash', element: 'gale', cost: 2, kind: 'strike', damage: 4, draw: 1, text: 'Deal 4 damage. Draw a card.' },
  { id: 'wind-guard', name: 'Wind Guard', element: 'gale', cost: 1, kind: 'guard', block: 3, draw: 1, text: 'Gain 3 block. Draw a card.' },
  { id: 'zephyr-mend', name: 'Zephyr Mend', element: 'gale', cost: 2, kind: 'mend', heal: 2, draw: 1, text: 'Restore 2 life. Draw a card.' },
];

export const CARD_BY_ID = Object.fromEntries(CARDS.map((card) => [card.id, card]));

/** The big number a card shows: its damage, block or heal, whichever it does. */
export function cardPower(card) {
  return card.damage ?? card.block ?? card.heal ?? 0;
}

/** Short label for the card's kind, shown under its power number. */
export function kindLabel(kind) {
  return kind === 'strike' ? 'ATK' : kind === 'guard' ? 'BLK' : 'HEAL';
}
