// Ember Duel — the pure rules engine: turns, mana, the Elemental Chain, damage,
// block and healing. No DOM here, so the same code runs the live game, the
// screenshot staging and headless simulations.
import {
  CARDS, CARD_BY_ID, CHAIN_BONUS, MAX_HAND, MAX_MANA, START_HAND, START_LIFE, START_MANA,
} from './config.js';
import { buildDeck, drawCards, shuffleDeck } from './deck.js';
import { makeRng } from './random.js';

export function otherSide(side) {
  return side === 'player' ? 'enemy' : 'player';
}

function freshSide() {
  return {
    life: START_LIFE, maxLife: START_LIFE, mana: 0, maxMana: 0, block: 0,
    deck: [], hand: [], discard: [], lastElement: null,
  };
}

/** A fresh game: shuffled decks, opening hands, Cinder's first intent planned. */
export function createGame(seed) {
  const rng = makeRng(seed);
  const state = {
    seed, rng, turn: 1, phase: 'player', winner: null,
    player: freshSide(), enemy: freshSide(),
    enemyPlan: null, log: [], lastPlay: null, lastPlayBy: { player: null, enemy: null },
    stats: { turns: 0, damageDealt: 0, cardsPlayed: 0 },
  };
  state.player.deck = shuffleDeck(buildDeck(), rng);
  state.enemy.deck = shuffleDeck(buildDeck(), rng);
  drawCards(state.player, START_HAND, rng, MAX_HAND);
  drawCards(state.enemy, START_HAND, rng, MAX_HAND);
  startTurn(state, 'player');
  return state;
}

/** Begin a side's turn: mana grows by one and refills, block fades, draw a card. */
export function startTurn(state, side) {
  const me = state[side];
  me.maxMana = Math.min(MAX_MANA, me.maxMana + 1);
  if (me.maxMana < START_MANA) me.maxMana = START_MANA;
  me.mana = me.maxMana;
  me.block = 0;
  me.lastElement = null;
  drawCards(me, 1, state.rng, MAX_HAND);
}

export function canPlay(state, side, handIndex) {
  if (state.phase !== side || state.winner) return false;
  const card = state[side].hand[handIndex];
  return Boolean(card) && card.cost <= state[side].mana;
}

/** The chain bonus a card would get if played right now (0 when it breaks the chain). */
export function chainBonusFor(state, side, card) {
  return state[side].lastElement === card.element ? CHAIN_BONUS : 0;
}

function applyDamage(state, target, amount, source) {
  const absorbed = Math.min(target.block, amount);
  target.block -= absorbed;
  const dealt = amount - absorbed;
  target.life = Math.max(0, target.life - dealt);
  if (source === 'player') state.stats.damageDealt += dealt;
  return { absorbed, dealt };
}

/**
 * Play the card at `handIndex` for `side`, resolving its full effect (including
 * the chain bonus and any draw). Returns the events the renderer animates, or
 * null when the play is illegal.
 */
export function playCard(state, side, handIndex) {
  if (!canPlay(state, side, handIndex)) return null;
  const me = state[side];
  const foe = state[otherSide(side)];
  const card = me.hand[handIndex];
  const chain = chainBonusFor(state, side, card);
  me.mana -= card.cost;
  me.hand.splice(handIndex, 1);
  me.discard.push(card);
  me.lastElement = card.element;
  if (side === 'player') state.stats.cardsPlayed += 1;
  state.lastPlay = { side, card, chain, turn: state.turn };
  state.lastPlayBy[side] = { card, chain, turn: state.turn };

  const events = [{ type: 'played', side, card, chain }];
  const damage = (card.damage ?? 0) + (card.kind === 'strike' ? chain : 0);
  const block = (card.block ?? 0) + (card.kind === 'guard' ? chain : 0);
  const heal = (card.heal ?? 0) + (card.kind === 'mend' ? chain : 0);
  if (damage > 0) {
    const hit = applyDamage(state, foe, damage, side);
    events.push({ type: 'damage', side: otherSide(side), amount: hit.dealt, absorbed: hit.absorbed });
  }
  if (block > 0) {
    me.block += block;
    events.push({ type: 'block', side, amount: block });
  }
  if (heal > 0) {
    const restored = Math.min(heal, me.maxLife - me.life);
    me.life += restored;
    events.push({ type: 'heal', side, amount: restored });
  }
  if (card.draw) {
    const drawn = drawCards(me, card.draw, state.rng, MAX_HAND);
    if (drawn.length > 0) events.push({ type: 'draw', side, amount: drawn.length });
  }
  const who = side === 'player' ? 'You' : 'Cinder';
  const chainText = chain > 0 ? ` (chain +${chain})` : '';
  state.log.unshift(`${who} played ${card.name}${chainText}.`);
  state.log.length = Math.min(state.log.length, 6);
  checkWinner(state);
  return events;
}

function checkWinner(state) {
  if (state.player.life <= 0) state.winner = 'enemy';
  else if (state.enemy.life <= 0) state.winner = 'player';
  if (state.winner) state.phase = 'over';
}

/** Begin a new round for the player after Cinder's turn: turn counter, phase, refill. */
export function beginPlayerTurn(state) {
  state.turn += 1;
  state.stats.turns = state.turn;
  state.phase = 'player';
  startTurn(state, 'player');
}

/** End the player's turn: Cinder takes hers (see ai.js), then a new round begins. */
export function endPlayerTurn(state, runEnemyTurn) {
  if (state.phase !== 'player' || state.winner) return [];
  const events = runEnemyTurn(state);
  if (state.winner) return events;
  beginPlayerTurn(state);
  return events;
}

export { CARDS, CARD_BY_ID };
