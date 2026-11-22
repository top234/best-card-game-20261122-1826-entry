// Ember Duel — Cinder's brain and the autopilot used by screenshot staging.
// Cinder commits to a plan at the end of her turn, and the plan's totals are
// shown as her intent (attack / guard / heal icons) all through your turn, so
// her next move can be read and countered. The plan is honoured exactly.
import { CHAIN_BONUS, MAX_MANA, START_MANA } from './config.js';
import { canPlay, otherSide, playCard, startTurn } from './rules.js';

/** Score one card in hand for the side playing it: damage, survival and draw. */
function scoreCard(state, side, card, lastElement) {
  const me = state[side];
  const chain = lastElement === card.element ? CHAIN_BONUS : 0;
  let score = 0;
  if (card.damage) {
    score += card.damage + (card.kind === 'strike' ? chain : 0);
    // Lethal damage is worth everything.
    if (card.damage + chain >= state[otherSide(side)].life) score += 100;
  }
  if (card.block) {
    const hurt = me.life <= 12;
    score += (card.block + (card.kind === 'guard' ? chain : 0)) * (hurt ? 0.9 : 0.45);
  }
  if (card.heal) {
    score += me.life <= 10 ? (card.heal + chain) * 1.4 : (card.heal + chain) * 0.25;
  }
  if (card.draw) score += 0.6;
  // Prefer cheap cards when scores tie, so mana is never wasted.
  score -= card.cost * 0.05;
  return score;
}

/**
 * Greedy plan: repeatedly take the best-scoring affordable card until mana runs
 * out or nothing is worth playing. Returns the card uids, in play order.
 * `mana` defaults to the side's current mana; Cinder plans with the mana she
 * will have next turn, so the plan always fits when it runs.
 */
export function greedyPlan(state, side, mana = state[side].mana) {
  const me = state[side];
  const hand = [...me.hand];
  let remaining = mana;
  let lastElement = me.lastElement;
  const picks = [];
  for (;;) {
    let best = -1;
    let bestScore = 0.5;
    for (let i = 0; i < hand.length; i += 1) {
      if (hand[i].cost > remaining) continue;
      const score = scoreCard(state, side, hand[i], lastElement);
      if (score > bestScore) {
        bestScore = score;
        best = i;
      }
    }
    if (best < 0) break;
    picks.push(hand[best].uid);
    remaining -= hand[best].cost;
    lastElement = hand[best].element;
    hand.splice(best, 1);
  }
  return picks;
}

/** Summarise a plan's totals for the intent badge (damage / block / heal). */
export function summarisePlan(state, side, uids) {
  const summary = { damage: 0, block: 0, heal: 0 };
  let lastElement = null;
  for (const uid of uids) {
    const card = state[side].hand.find((c) => c.uid === uid);
    if (!card) continue;
    const chain = lastElement === card.element ? CHAIN_BONUS : 0;
    if (card.damage) summary.damage += card.damage + (card.kind === 'strike' ? chain : 0);
    if (card.block) summary.block += card.block + (card.kind === 'guard' ? chain : 0);
    if (card.heal) summary.heal += card.heal + (card.kind === 'mend' ? chain : 0);
    lastElement = card.element;
  }
  return summary;
}

/** Plan Cinder's next turn from the hand she holds now, and store it as her intent. */
export function planEnemyTurn(state) {
  const projected = Math.min(MAX_MANA, Math.max(START_MANA, state.enemy.maxMana + 1));
  const uids = greedyPlan(state, 'enemy', projected);
  state.enemyPlan = { uids, summary: summarisePlan(state, 'enemy', uids) };
  return state.enemyPlan;
}

/**
 * Run Cinder's turn, stepwise so the live game can animate one card at a time:
 * begin (refill and draw), play the committed plan one card per call, finish
 * (plan the turn after next). `runEnemyTurn` runs all three at once, for
 * simulations and screenshot staging.
 */
export function beginEnemyTurn(state) {
  state.phase = 'enemy';
  startTurn(state, 'enemy');
  if (!state.enemyPlan) planEnemyTurn(state);
  return state.enemyPlan;
}

export function playNextPlanned(state) {
  const plan = state.enemyPlan;
  if (!plan) return null;
  while (plan.uids.length > 0) {
    const uid = plan.uids.shift();
    const index = state.enemy.hand.findIndex((c) => c.uid === uid);
    if (index < 0) continue;
    return playCard(state, 'enemy', index);
  }
  return null;
}

export function finishEnemyTurn(state) {
  if (!state.winner) planEnemyTurn(state);
}

export function runEnemyTurn(state) {
  beginEnemyTurn(state);
  const groups = [];
  let events;
  while (!state.winner && (events = playNextPlanned(state))) groups.push(events);
  finishEnemyTurn(state);
  return groups;
}

/** The autopilot that stages screenshots: the player plays greedily, like Cinder. */
export function autopilotPlayerTurn(state) {
  const picks = greedyPlan(state, 'player');
  const groups = [];
  for (const uid of picks) {
    if (state.winner) break;
    const index = state.player.hand.findIndex((c) => c.uid === uid);
    if (index < 0) continue;
    const events = playCard(state, 'player', index);
    if (events) groups.push(events);
  }
  return groups;
}
