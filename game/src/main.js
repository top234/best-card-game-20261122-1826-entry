// Ember Duel — entry point: wires the rules engine, the renderer and the input
// together, runs the turn loop (player acts, Cinder answers one card at a time),
// and stages the deterministic screenshot scenes behind ?shot=…&seed=….
import { createGame, playCard } from './rules.js';
import {
  beginEnemyTurn, finishEnemyTurn, planEnemyTurn, playNextPlanned,
} from './ai.js';
import { beginPlayerTurn } from './rules.js';
import { Renderer } from './render.js';
import { bindInput } from './input.js';
import { stageShot } from './shots.js';
import { sfx } from './audio.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const renderer = new Renderer();
const ui = { selectedUid: null, busy: false };
let state = null;
let shotMode = false;

renderer.fitStage();
window.addEventListener('resize', () => renderer.fitStage());

/** Floating numbers and shakes for one card's resolved events. */
function animateEvents(events) {
  for (const event of events) {
    if (event.type === 'played' && event.chain > 0) {
      renderer.floatText(event.side, `CHAIN +${event.chain}`, 'chain');
    } else if (event.type === 'damage' && event.amount > 0) {
      renderer.floatText(event.side, `-${event.amount}`, 'dmg');
      renderer.shake(event.side);
      sfx.hit();
    } else if (event.type === 'block') {
      renderer.floatText(event.side, `+${event.amount} BLK`, 'block');
    } else if (event.type === 'heal' && event.amount > 0) {
      renderer.floatText(event.side, `+${event.amount}`, 'heal');
      sfx.heal();
    }
  }
}

function endGame() {
  renderer.showEnd(state, shotMode);
  if (!shotMode) {
    if (state.winner === 'player') sfx.win();
    else sfx.lose();
  }
}

function startGame() {
  state = createGame((Math.random() * 1000000000) | 0);
  planEnemyTurn(state);
  renderer.seenUids.clear();
  ui.selectedUid = null;
  ui.busy = false;
  renderer.hideOverlays();
  renderer.render(state, ui);
}

async function playSelected() {
  if (!state || ui.busy || state.phase !== 'player' || state.winner) return;
  if (ui.selectedUid === null) return;
  const index = state.player.hand.findIndex((c) => c.uid === ui.selectedUid);
  if (index < 0) return;
  const cardEl = document.querySelector(`.card[data-uid="${ui.selectedUid}"]`);
  const fromRect = cardEl ? renderer.centreOf(cardEl) : null;
  const card = state.player.hand[index];
  const events = playCard(state, 'player', index);
  if (!events) {
    if (cardEl) {
      cardEl.classList.add('shake');
      setTimeout(() => cardEl.classList.remove('shake'), 450);
    }
    return;
  }
  ui.selectedUid = null;
  sfx.play();
  renderer.render(state, ui);
  if (fromRect) renderer.flyCard(card, fromRect, 'player');
  animateEvents(events);
  if (state.winner) {
    await sleep(700);
    endGame();
  }
}

async function doEndTurn() {
  if (!state || ui.busy || state.phase !== 'player' || state.winner) return;
  ui.busy = true;
  ui.selectedUid = null;
  sfx.click();
  renderer.render(state, ui);
  beginEnemyTurn(state);
  renderer.render(state, ui);
  await sleep(600);
  let events;
  while (!state.winner && (events = playNextPlanned(state))) {
    const played = events.find((e) => e.type === 'played');
    renderer.render(state, ui);
    if (played) {
      const handEl = document.getElementById('enemy-hand');
      renderer.flyCard(played.card, renderer.centreOf(handEl), 'enemy');
    }
    animateEvents(events);
    await sleep(850);
  }
  finishEnemyTurn(state);
  if (!state.winner) beginPlayerTurn(state);
  ui.busy = false;
  renderer.render(state, ui);
  if (state.winner) {
    await sleep(600);
    endGame();
  }
}

function selectCard(uid) {
  if (!state || ui.busy || state.phase !== 'player' || state.winner) return;
  ui.selectedUid = uid;
  sfx.click();
  renderer.render(state, ui);
}

bindInput({
  onCardClick(uid) {
    if (ui.selectedUid === uid) void playSelected();
    else selectCard(uid);
  },
  onSelectIndex(index) {
    if (state && state.player.hand[index]) selectCard(state.player.hand[index].uid);
  },
  onPlaySelected() {
    if (!state) startGame();
    else void playSelected();
  },
  onEndTurn() { void doEndTurn(); },
  onPlay() {
    sfx.unlock();
    startGame();
  },
  onEscape() {
    if (ui.selectedUid !== null) {
      ui.selectedUid = null;
      if (state) renderer.render(state, ui);
    } else if (state && !state.winner) {
      state = null;
      renderer.showTitle();
    }
  },
});

// Screenshot scenes: ?shot=start|play|win|loss&seed=1 — staged from the real
// engine, animations frozen, and a readiness flag for the screenshot tool.
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seed = Number(params.get('seed') || 1);
renderer.showTitle();
if (shot) {
  shotMode = true;
  document.getElementById('stage').classList.add('shot-mode');
  const staged = stageShot(shot, seed);
  if (staged.screen === 'title') {
    renderer.showTitle();
  } else {
    state = staged.state;
    renderer.hideOverlays();
    renderer.render(state, ui);
    if (staged.screen === 'over') renderer.showEnd(state, true);
  }
  document.body.dataset.shotReady = 'true';
}

// Small hook for automated checks: the live state, read-only.
window.__ember = { getState: () => state, getUi: () => ui };
