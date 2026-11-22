// Ember Duel — mouse and keyboard input. Clicks select and play cards; keys
// 1-5 select, Enter/Space plays, E ends the turn, Esc steps back.
export function bindInput(actions) {
  const hand = document.getElementById('player-hand');
  hand.addEventListener('click', (event) => {
    const cardEl = event.target.closest('.card');
    if (!cardEl) return;
    actions.onCardClick(Number(cardEl.dataset.uid), cardEl);
  });
  document.getElementById('end-turn').addEventListener('click', () => actions.onEndTurn());
  document.getElementById('play-btn').addEventListener('click', () => actions.onPlay());
  document.getElementById('again-btn').addEventListener('click', () => actions.onPlay());

  document.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    if (event.key >= '1' && event.key <= '5') {
      actions.onSelectIndex(Number(event.key) - 1);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      actions.onPlaySelected();
    } else if (event.key === 'Escape') {
      actions.onEscape();
    } else if (event.key === 'e' || event.key === 'E') {
      actions.onEndTurn();
    }
  });
}
