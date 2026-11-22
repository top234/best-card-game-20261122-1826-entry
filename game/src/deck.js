// Ember Duel — deck building, shuffling and drawing. A deck is two copies of
// every card in the catalogue; each copy gets a unique id so the renderer can
// track one physical card from deck to hand to discard.
import { CARDS } from './config.js';
import { shuffle } from './random.js';

let nextUid = 1;

/** A fresh 32-card deck (two copies of each catalogue card), unshuffled. */
export function buildDeck() {
  const deck = [];
  for (const card of CARDS) {
    for (let copy = 0; copy < 2; copy += 1) {
      deck.push({ ...card, uid: nextUid });
      nextUid += 1;
    }
  }
  return deck;
}

/** Shuffle a deck with the game's seeded generator. */
export function shuffleDeck(deck, rng) {
  return shuffle(deck, rng);
}

/**
 * Draw up to `count` cards from `side`'s deck into its hand (respecting the hand
 * limit); when the deck runs dry the discard pile is shuffled back in. Returns
 * the cards actually drawn.
 */
export function drawCards(side, count, rng, maxHand) {
  const drawn = [];
  for (let i = 0; i < count; i += 1) {
    if (side.hand.length >= maxHand) break;
    if (side.deck.length === 0) {
      if (side.discard.length === 0) break;
      side.deck = shuffle(side.discard, rng);
      side.discard = [];
    }
    const card = side.deck.pop();
    side.hand.push(card);
    drawn.push(card);
  }
  return drawn;
}
