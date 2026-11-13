# JAT Arcade Archives

A walk-through 3D museum of video game history, built with three.js. Every machine in the hall is playable.

Visitors arrive facing **The Pioneers (1947–1962)**, then turn around to **The Golden Age (1972–1989)**.

| Year | Exhibit | Machine model | Playable game |
|---|---|---|---|
| 1947 | Cathode-Ray Tube Amusement Device | lab chassis + round CRT | **Target Beam** (reconstruction) |
| 1950 | Bertie the Brain | tall lamp-panel cabinet | **Bertie**: noughts and crosses (reconstruction) |
| 1952 | OXO on EDSAC | valve racks + dot CRT + rotary dial | **OXO**: perfect-play noughts and crosses (reconstruction) |
| 1958 | Tennis for Two | analog computer + oscilloscope | **Tennis for Two** (reconstruction) |
| 1962 | Spacewar! | minicomputer console + round display | **Spacewar** (reconstruction) |
| 1972 | Home TV games | wood-grain TV + console + paddles | **Volley** |
| 1978 | Arcade fixed shooters | upright cabinet | **Star Siege** |
| 1980 | Maze-chase cocktail tables | cocktail table | **Gem Runner** |
| 1982 | Home computers & type-in listings | desk, keyboard, monitor, drive | **Serpent** |
| 1989 | Monochrome handhelds | handheld on a pedestal | **Brickfall** |

**Content rules**
- Machines are original era-style models. They are not replicas of real products and carry no logos.
- Games are original code that recreates each genre. No ROMs, emulators or copyrighted art.
- Plaques for pre-1970 exhibits say plainly that the game is a *modern reconstruction*.

## Run it

It's static files with no build step. Serve `web/` from any web server:

```bash
cd web && python3 -m http.server 8080
# open http://localhost:8080
```

three.js r187 loads from jsDelivr through an import map in `web/index.html`.

### GitHub Pages
`.github/workflows/pages.yml` deploys `web/` on every push to `main` that touches it.
One-time setup: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
The site appears at `https://cptnope.github.io/JAT-Arcade-Archives/`. All paths are relative, so it also works from a subfolder or a custom domain.

## Controls

| | Desktop | Touch | Gamepad |
|---|---|---|---|
| Walk | WASD / arrows | left stick | left stick |
| Look | drag | drag | right stick |
| Play a machine | **E**, or click it | tap it, or **Play** | A |
| A button | Space / Enter / Z | **A** pad | A |
| Stand up | Esc | **Stand up** | B |

`#<exhibit-id>` in the URL (e.g. `#spacewar`) takes you straight to that machine.

## Layout

```
web/
  index.html            UI shell, import map, styles
  manifest.webmanifest  PWA manifest
  sw.js                 offline cache (cache-first)
  src/
    main.js             hall, lighting, bloom, walking, camera moves, input, UI
    exhibits.js         exhibit catalogue (shared data format)
    machines.js         procedural 3D machine builders
    crt.js              CRT / LCD / lamp-panel screen shader
    sfx.js              synthesized sound effects
    games/              one file per game + base.js contract
```

### Adding an exhibit
1. Write a game in `src/games/` that extends `Game` (`base.js`). Implement `reset`, `update(dt, input)`, `draw(ctx)` and `ai()` (attract-mode demo).
2. Add a machine builder to `machines.js` that returns `{ group, screen, radius }`.
3. Add an entry to `EXHIBITS` in `exhibits.js`.

The camera's "sit down" pose comes from the screen mesh's position and facing, so it works for any screen angle, including the cocktail table's upward-facing screen.

## Roadmap
- **Mainframe & Terminal wing**: Nimrod (Nim, 1951), Strachey's checkers (1952), Bouncing Ball on Whirlwind (1952), MIDSAC pool (1954), Brown Box (1968), Star Trek (1971), Hunt the Wumpus (1972), Colossal Cave Adventure (1976), PLATO dungeon crawlers (1975).
- **WordPress plugin**: shortcode/block that enqueues `web/`, exhibit JSON editable in wp-admin, high scores via REST. Every handler will check a nonce and the user's capabilities.
- Shared engine with the Librarium Archives (board and card game museum): same exhibit format and game contract, so wings can link to each other.
- glTF machine models as an optional upgrade over the procedural ones.

Built with guidance from the [CloudAI-X three.js skills](https://github.com/CloudAI-X/threejs-skills).

MIT License © 2026 Jeremy Anderson
