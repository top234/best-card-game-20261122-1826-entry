// Ember Duel — deterministic screenshot scenes behind ?shot=start|play|win|loss.
// Each scene plays the real rules forward from a fresh game with the seeded
// autopilot (the same code that stages nothing by hand), searching upward from
// the requested seed for a game that fits the scene, so the frame is always
// what a real game looks like and the same seed always gives the same frame.
import { createGame, endPlayerTurn, playCard } from './rules.js';
import { autopilotPlayerTurn, planEnemyTurn, runEnemyTurn } from './ai.js';

function freshGame(seed) {
  const state = createGame(seed);
  planEnemyTurn(state);
  return state;
}

/** Play `rounds` full rounds (player autopilot, then Cinder) and stop. */
function playRounds(state, rounds) {
  for (let r = 0; r < rounds; r += 1) {
    if (state.winner) break;
    autopilotPlayerTurn(state);
    if (!state.winner) endPlayerTurn(state, runEnemyTurn);
  }
  return state;
}

/** A mid-game table: both fighters hurt but alive, full hands, Cinder threatening. */
function stagePlay(seed) {
  for (let s = seed; s < seed + 100; s += 1) {
    const state = playRounds(freshGame(s), 2);
    if (state.winner) continue;
    const index = state.player.hand.findIndex((c) => c.cost <= state.player.mana);
    if (index >= 0) playCard(state, 'player', index);
    if (state.winner) continue;
    const intent = state.enemyPlan?.summary;
    if (
      state.player.life >= 12 && state.player.life < state.player.maxLife
      && state.enemy.life >= 10 && state.enemy.life < state.enemy.maxLife
      && state.player.hand.length >= 4 && state.enemy.hand.length >= 4
      && intent && intent.damage > 0
    ) return { state, screen: 'play' };
  }
  return { state: playRounds(freshGame(seed), 2), screen: 'play' };
}

/** A finished game with the requested winner, played out by the autopilot. */
function stageEnding(seed, winner) {
  for (let s = seed; s < seed + 300; s += 1) {
    const state = freshGame(s);
    let guard = 0;
    while (!state.winner && guard < 60) {
      guard += 1;
      autopilotPlayerTurn(state);
      if (!state.winner) endPlayerTurn(state, runEnemyTurn);
    }
    if (state.winner === winner) return { state, screen: 'over' };
  }
  const state = freshGame(seed);
  return { state, screen: 'play' };
}

/** Stage the named scene (start, play, win or loss; any other name is start). */
export function stageShot(name, seed) {
  if (name === 'play') return stagePlay(seed);
  if (name === 'win') return stageEnding(seed, 'player');
  if (name === 'loss') return stageEnding(seed, 'enemy');
  return { state: null, screen: 'title' };
}
