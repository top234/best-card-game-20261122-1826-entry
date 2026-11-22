// Ember Duel — everything the player sees: the table, the fanned hands, the
// life bars, Cinder's intent badge, the played-card slots, and the effects
// (flying cards, floating numbers, confetti). Reads state, never changes it.
import { CHAIN_BONUS, ELEMENTS, ENEMY_NAME, cardPower, kindLabel } from './config.js';

// Element shapes, drawn as inline SVG so each element is told apart by shape
// as well as colour: flame / droplet / gem / swirl.
const SHAPES = {
  flame: '<path d="M12 2c.9 2.7-.7 4.4-1.9 5.8C9 9.2 8 10.6 8 12.6A4.6 4.6 0 0 0 12.6 17.2 4.6 4.6 0 0 0 17.2 12.6c0-1.9-.9-3.4-1.8-4.8-.3 1.1-1 1.9-2 2.3.4-3-.5-6.1-1.4-8.1z"/>',
  drop: '<path d="M12 2C12 2 5 10.4 5 14.8a7 7 0 0 0 14 0C19 10.4 12 2 12 2z"/>',
  gem: '<path d="M12 2l7.5 7L12 22 4.5 9z"/><path d="M4.5 9h15M12 2L8.5 9l3.5 13L15.5 9z" fill="none" stroke="rgba(0,0,0,0.25)" stroke-width="1"/>',
  swirl: '<path d="M12 12a2.2 2.2 0 1 1 2.2-2.2A4.4 4.4 0 1 1 7.6 14.2 6.6 6.6 0 1 1 16.4 5.4 8.8 8.8 0 1 1 5.4 16.6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
};
const ICONS = {
  sword: '<path d="M18.5 2.5l3 3L11 16l-4 1 1-4L18.5 2.5zM14 5l5 5M5 19l3-3"/>',
  shield: '<path d="M12 2l8 3v6.2c0 4.9-3.4 8.8-8 10.8-4.6-2-8-5.9-8-10.8V5z"/>',
  heart: '<path d="M12 21C7 16.5 3.2 13.3 3.2 9.4 3.2 6.5 5.4 4.6 7.8 4.6c1.7 0 3.2.9 4.2 2.3 1-1.4 2.5-2.3 4.2-2.3 2.4 0 4.6 1.9 4.6 4.8 0 3.9-3.8 7.1-8.8 11.6z"/>',
};

export function shapeSvg(shape, size, color) {
  const fill = shape === 'swirl' ? 'none' : color;
  const stroke = shape === 'swirl' ? color : 'none';
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}" stroke="${stroke}" aria-hidden="true">${SHAPES[shape]}</svg>`;
}

function iconSvg(name, size, color) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}" stroke="${color}" stroke-width="1.4" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
}

const $ = (id) => document.getElementById(id);

/** One card face, full size in the hand or mini in a played slot. */
export function cardHTML(card, mini = false) {
  const el = ELEMENTS[card.element];
  const power = cardPower(card);
  return `<div class="card${mini ? ' mini' : ''}" data-uid="${card.uid}" style="--el:${el.color};--el-dark:${el.dark};--el-light:${el.light}">
    <div class="cost">${card.cost}</div>
    <div class="card-name">${card.name}</div>
    <div class="card-art">${shapeSvg(el.shape, mini ? 34 : 52, el.color)}</div>
    <div class="card-power"><span class="power-num">${power}</span><span class="power-label">${kindLabel(card.kind)}</span></div>
    <div class="card-text">${card.text}</div>
    <div class="card-el">${el.name.toUpperCase()} · ${card.kind.toUpperCase()}</div>
  </div>`;
}

function cardBackHTML(angle, lift) {
  return `<div class="mini-back" style="transform:rotate(${angle}deg) translateY(${lift}px)">
    ${shapeSvg('flame', 34, '#e2483d')}</div>`;
}

export class Renderer {
  constructor() {
    this.seenUids = new Set();
    this.fx = $('fx');
  }

  /** Scale the fixed 1280x720 stage to fit the window, centred. */
  fitStage() {
    const stage = $('stage');
    const scale = Math.min(window.innerWidth / 1280, window.innerHeight / 720);
    stage.style.position = 'absolute';
    stage.style.left = '50%';
    stage.style.top = '50%';
    stage.style.margin = '0';
    stage.style.transformOrigin = 'center center';
    stage.style.transform = `translate(-50%, -50%) scale(${scale})`;
    this.scale = scale;
  }

  /** Stage-local coordinates of an element's centre (undoes the stage scale). */
  centreOf(el) {
    const stageRect = $('stage').getBoundingClientRect();
    const rect = el.getBoundingClientRect();
    const scale = stageRect.width / 1280;
    return {
      x: (rect.left + rect.width / 2 - stageRect.left) / scale,
      y: (rect.top + rect.height / 2 - stageRect.top) / scale,
      width: rect.width / scale,
      height: rect.height / scale,
    };
  }

  render(state, ui) {
    this.renderFighter(state, 'player', ui);
    this.renderFighter(state, 'enemy', ui);
    this.renderHand(state, ui);
    this.renderEnemyHand(state);
    this.renderIntent(state);
    this.renderPlayed(state);
    this.renderMiddle(state, ui);
    this.renderLog(state);
    $('end-turn').disabled = ui.busy || state.phase !== 'player' || Boolean(state.winner);
    $('status').textContent = state.winner
      ? `${state.winner === 'player' ? 'Victory' : 'Defeat'} after ${state.turn} turns.`
      : `Turn ${state.turn}. You have ${state.player.life} life and ${state.player.mana} mana. Cinder has ${state.enemy.life} life.`;
  }

  renderFighter(state, side, ui) {
    const me = state[side];
    const bar = $(`${side}-life`);
    bar.querySelector('.fill').style.width = `${(me.life / me.maxLife) * 100}%`;
    bar.querySelector('.num').textContent = `${me.life} / ${me.maxLife}`;
    const badge = $(`${side}-block`);
    badge.innerHTML = me.block > 0 ? `${iconSvg('shield', 14, '#dff0ff')} ${me.block}` : '';
    if (side === 'player') {
      const pips = Array.from({ length: me.maxMana }, (_, i) => `<span class="pip${i < me.mana ? ' on' : ''}"></span>`).join('');
      $('player-mana').innerHTML = `${pips}<span style="margin-left:6px">${me.mana}/${me.maxMana} mana</span>`;
      $('deck-count').textContent = me.deck.length;
      $('discard-count').textContent = me.discard.length;
    }
  }

  renderHand(state, ui) {
    const hand = $('player-hand');
    const n = state.player.hand.length;
    const mid = (n - 1) / 2;
    hand.innerHTML = state.player.hand.map((card, i) => {
      const angle = (i - mid) * 4.5;
      const lift = Math.abs(i - mid) * 5;
      const isNew = !this.seenUids.has(card.uid);
      this.seenUids.add(card.uid);
      const el = cardHTML(card).replace(
        'class="card"',
        `class="card${ui.selectedUid === card.uid ? ' selected' : ''}${card.cost > state.player.mana ? ' unaffordable' : ''}"`,
      );
      const style = `transform:rotate(${angle}deg) translateY(${lift}px);${isNew ? `animation-delay:${i * 70}ms;` : 'animation:none;'}`;
      return el.replace('style="', `data-index="${i}" style="${style}`);
    }).join('');
  }

  renderEnemyHand(state) {
    const n = state.enemy.hand.length;
    const mid = (n - 1) / 2;
    $('enemy-hand').innerHTML = state.enemy.hand.map((_, i) => {
      const angle = (i - mid) * 4;
      return cardBackHTML(angle, Math.abs(i - mid) * 5);
    }).join('');
  }

  renderIntent(state) {
    const pill = $('intent-pill');
    const s = state.enemyPlan?.summary;
    if (!s || (s.damage === 0 && s.block === 0 && s.heal === 0)) {
      pill.innerHTML = '<span class="intent-none">Cinder gathers her thoughts…</span>';
      return;
    }
    const parts = [];
    if (s.damage > 0) parts.push(`<span class="intent-stat atk">${iconSvg('sword', 17, '#ff8a7a')} ${s.damage}</span>`);
    if (s.block > 0) parts.push(`<span class="intent-stat blk">${iconSvg('shield', 16, '#8fc3f0')} ${s.block}</span>`);
    if (s.heal > 0) parts.push(`<span class="intent-stat heal">${iconSvg('heart', 16, '#9fe8a8')} ${s.heal}</span>`);
    pill.innerHTML = parts.join('');
  }

  renderPlayed(state) {
    for (const side of ['player', 'enemy']) {
      const body = $(`slot-${side}`).querySelector('.slot-body');
      const last = state.lastPlayBy[side];
      body.innerHTML = last
        ? cardHTML(last.card, true)
        : '<div class="slot-empty">—</div>';
    }
  }

  renderMiddle(state, ui) {
    const banner = $('turn-banner');
    const sub = $('turn-sub');
    const chain = $('chain-badge');
    if (state.winner) {
      banner.textContent = '';
      sub.textContent = '';
    } else if (state.phase === 'enemy') {
      banner.textContent = `${ENEMY_NAME} plays…`;
      sub.textContent = 'Watch her cards land.';
    } else {
      banner.textContent = `Turn ${state.turn} — Your move`;
      sub.textContent = ui.selectedUid
        ? 'Press Enter or click the card again to play it.'
        : 'Click a card to select it, then play it — or end your turn.';
    }
    if (!state.winner && state.phase === 'player' && state.player.lastElement) {
      const el = ELEMENTS[state.player.lastElement];
      chain.textContent = `CHAIN: ${el.name} — another ${el.name} card gets +${CHAIN_BONUS} power`;
      chain.classList.add('hot');
      chain.style.borderColor = el.color;
      chain.style.color = el.light;
    } else {
      chain.textContent = '';
      chain.classList.remove('hot');
    }
  }

  renderLog(state) {
    $('log-lines').innerHTML = state.log.slice(0, 3).map((line) => `<div>${line}</div>`).join('')
      || '<div>The duel begins. Good luck.</div>';
  }

  /** Floating damage / heal / block number over a fighter's life bar. */
  floatText(side, text, kind) {
    const anchor = $(`${side}-life`);
    const c = this.centreOf(anchor);
    const span = document.createElement('span');
    span.className = `float-text ${kind}`;
    span.textContent = text;
    span.style.left = `${c.x - 20}px`;
    span.style.top = `${c.y - 20}px`;
    this.fx.appendChild(span);
    span.addEventListener('animationend', () => span.remove());
  }

  shake(side) {
    const bar = $(`${side}-life`);
    bar.classList.remove('shake');
    void bar.offsetWidth;
    bar.classList.add('shake');
  }

  /** Fly a copy of a card from its old spot to its played slot, then vanish. */
  flyCard(card, fromRect, toSide) {
    const slot = $(`slot-${toSide}`).querySelector('.slot-body');
    if (!slot) return;
    const to = this.centreOf(slot);
    const clone = document.createElement('div');
    clone.className = 'fly-clone';
    clone.innerHTML = cardHTML(card, true);
    clone.style.left = `${fromRect.x - fromRect.width / 2}px`;
    clone.style.top = `${fromRect.y - fromRect.height / 2}px`;
    this.fx.appendChild(clone);
    const dx = to.x - fromRect.x;
    const dy = to.y - fromRect.y;
    clone.animate(
      [
        { transform: 'translate(0, 0) rotate(0deg) scale(1)', opacity: 1 },
        { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 40}px) rotate(8deg) scale(1.05)`, opacity: 1, offset: 0.5 },
        { transform: `translate(${dx}px, ${dy}px) rotate(0deg) scale(0.9)`, opacity: 0.25 },
      ],
      { duration: 480, easing: 'ease-in-out' },
    ).onfinish = () => clone.remove();
  }

  /** Confetti on victory; static=true scatters it frozen for a screenshot. */
  confettiBurst(staticMode = false) {
    const colors = ['#f2cd7e', '#e2483d', '#2f7fd0', '#7a9a3d', '#17a398', '#ffffff'];
    for (let i = 0; i < 90; i += 1) {
      const piece = document.createElement('div');
      piece.className = 'confetti';
      piece.style.left = `${(i * 137.5) % 1280}px`;
      piece.style.background = colors[i % colors.length];
      if (staticMode) {
        piece.style.top = `${(i * 197.3) % 680}px`;
        piece.style.transform = `rotate(${(i * 47) % 360}deg)`;
      } else {
        piece.style.animationDelay = `${(i % 10) * 0.12}s`;
        piece.style.animationDuration = `${2.2 + (i % 7) * 0.25}s`;
      }
      this.fx.appendChild(piece);
      if (!staticMode) setTimeout(() => piece.remove(), 5200);
    }
  }

  showTitle() {
    $('title-screen').classList.remove('hidden');
    $('end-screen').classList.add('hidden');
    $('title-sigil').innerHTML = shapeSvg('flame', 64, '#e2483d');
    $('legend').innerHTML = Object.values(ELEMENTS).map((el) => `
      <div class="legend-item" style="color:${el.light}">
        <span class="swatch" style="background:${el.dark}">${shapeSvg(el.shape, 26, el.color)}</span>${el.name.toUpperCase()}
      </div>`).join('');
    $('enemy-portrait').innerHTML = shapeSvg('flame', 38, '#ffd9cf');
    $('player-portrait').innerHTML = shapeSvg('drop', 38, '#d3e9ff');
  }

  showEnd(state, staticMode = false) {
    const won = state.winner === 'player';
    const title = $('end-title');
    title.textContent = won ? 'VICTORY!' : 'DEFEAT';
    title.className = `end-title ${won ? 'win' : 'loss'}`;
    $('end-sub').textContent = won
      ? 'The Last Flame bows to you. Cinder is beaten.'
      : 'Cinder’s flame burns on. The duel is hers — this time.';
    $('end-stats').innerHTML = `
      <div class="stat"><b>${state.turn}</b><span>TURNS</span></div>
      <div class="stat"><b>${state.stats.damageDealt}</b><span>DAMAGE DEALT</span></div>
      <div class="stat"><b>${state.stats.cardsPlayed}</b><span>CARDS PLAYED</span></div>`;
    $('title-screen').classList.add('hidden');
    $('end-screen').classList.remove('hidden');
    if (won) this.confettiBurst(staticMode);
  }

  hideOverlays() {
    $('title-screen').classList.add('hidden');
    $('end-screen').classList.add('hidden');
  }
}
