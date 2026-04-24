# Scavenger: Iron Swarm

A browser-based vampire-survival style canvas game built from the supplied sci-fi asset sheets.

## Run

```sh
python3 -m http.server 5173
```

Open `http://localhost:5173`.

## Controls

- Desktop: `WASD` or arrow keys to move, `P` or `Esc` to pause.
- Mobile: drag anywhere on the screen to move.
- Weapons fire automatically at nearby enemies.

## Assets

The original sheets are in `assets/source`. Cropped transparent sprites are in `assets/sprites`.
New generated source sheets and processed frame outputs are in `assets/generated`.

Current regenerated sets:

- `player_walk_0..3.png`
- `spider_walk_0..3.png`
- `crate.png`, `barrel.png`, `generator.png`, `barricade.png`
- `arena_floor_tile.png`

Regenerate sprites after changing crop coordinates:

```sh
bash scripts/extract-assets.sh
```
