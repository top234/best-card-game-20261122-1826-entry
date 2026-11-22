# Ember Duel

[![make.fun](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/c/best-card-game-20261122-1826)
[![rank](https://make.fun/badge/best-card-game-20261122-1826/top234/best-card-game-20261122-1826-entry/rank.svg)](https://make.fun/c/best-card-game-20261122-1826)
[![reward](https://make.fun/badge/best-card-game-20261122-1826/top234/best-card-game-20261122-1826-entry/reward.svg)](https://make.fun/c/best-card-game-20261122-1826)

A turn-based duel of elemental cards for the [make.fun best card game bounty](https://make.fun/c/best-card-game-20261122-1826). You face Cinder, Warden of the Last Flame — first to 0 life loses.

## How to play

- **Play cards with mana.** Each turn you gain +1 max mana (up to 10) and refill.
- **Four elements, told apart by colour and shape:** Ember (flame), Tide (droplet), Stone (gem), Gale (swirl).
- **Chain elements:** playing two cards of one element in the same turn gives the second +2 power.
- **Read Cinder's intent:** her next move is shown before your turn (attack / guard / heal totals), so you can guard, heal, or strike first.
- **Win** by reducing Cinder to 0 life; **lose** if she does it to you first.

Mouse: click a card to select it, click again (or press Enter) to play it. Keys: `1–5` select, `Enter`/`Space` play, `E` end turn, `Esc` back.

## Run it

Static files, no build step, no network: serve `game/` with any static server and open `game/index.html`.

```sh
cd game && python3 -m http.server 8080
```

Deterministic screenshot scenes: `?shot=start|play|win|loss&seed=1`.

## Structure

- `game/index.html` — the table layout, title and end screens
- `game/style.css` — table, cards and effects
- `game/src/config.js` — constants, elements, the 16-card catalogue
- `game/src/random.js` — seeded RNG (mulberry32)
- `game/src/deck.js` — deck building, shuffling, drawing
- `game/src/rules.js` — the pure rules engine (turns, mana, chain, damage, block, heal)
- `game/src/ai.js` — Cinder's planning, intent and turn execution, plus the autopilot
- `game/src/render.js` — the table, hands, life bars, intent badge and effects
- `game/src/input.js` — mouse and keyboard input
- `game/src/audio.js` — synthesised WebAudio bleeps (no audio files)
- `game/src/shots.js` — deterministic screenshot staging from the real engine
- `game/src/main.js` — entry point: wires engine, renderer and input together
