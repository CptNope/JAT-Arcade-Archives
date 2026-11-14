# JAT Arcade Archives

A walk-through 3D museum of video game history, built with three.js. Every machine in the hall is playable.

Visitors arrive facing **The Pioneers (1947–1962)**, then turn around to **The Golden Age (1972–1989)**. A doorway on the east wall leads to **The Mainframe Era (1951–1976)**, one on the west wall to **Experiments & Prototypes (1948–1977)**, two on the north wall to **The Arcade Boom (1976–1981)** and **Home Computers & Consoles (1980–1984)**, and one on the south wall to **The 8-Bit Console Era (1983–1989)**.

| Year | Exhibit | Machine model | Playable game |
|---|---|---|---|
| 1947 | Cathode-Ray Tube Amusement Device | lab chassis + round CRT | **Target Beam** (reconstruction) |
| 1950 | Bertie the Brain | tall lamp-panel cabinet | **Bertie**: noughts and crosses (reconstruction) |
| 1952 | OXO on EDSAC | valve racks + dot CRT + rotary dial | **OXO**: perfect-play noughts and crosses (reconstruction) |
| 1958 | Tennis for Two | analog computer + oscilloscope | **Tennis for Two** (reconstruction) |
| 1962 | Spacewar! | minicomputer console + round display | **Spacewar** (reconstruction) |
| 1951 | Nimrod *(Mainframe room)* | wide lamp cabinet + button desk | **Nimrod**: Nim vs perfect play (reconstruction) |
| 1952 | Bouncing Ball on Whirlwind | console with round scope + light gun | **Bouncing Ball** (reconstruction) |
| 1971 | Star Trek (mainframe) | video terminal | **Star Patrol** |
| 1972 | Hunt the Wumpus | teleprinter printing on paper | **Hunt the Beast** |
| 1975 | PLATO dungeon games | orange plasma terminal | **Plasma Dungeon** |
| 1976 | Colossal Cave Adventure | video terminal | **Cavern Quest** (original adventure) |
| 1948 | Turochamp *(Experiments room)* | study desk, drafting board, chessboard | **Paper Machine**: chess with Turing's piece values (reconstruction) |
| 1952 | Strachey's draughts | console with storage-tube displays | **Draughts** (reconstruction) |
| 1954 | MIDSAC pool | lab cabinet with square CRT | **Pocket Pool** (reconstruction) |
| 1964 | The Sumerian Game | typewriter terminal | **Sumerian Steward** (reconstruction) |
| 1968 | The Brown Box | prototype box, knob controllers, portable TV | **Chase** (reconstruction) |
| 1977 | Empire | video terminal | **Conquest** |
| 1976 | Night Driver *(Arcade Boom room)* | upright with steering wheel | **Night Road** |
| 1979 | Lunar Lander | vector upright | **Moon Lander** |
| 1979 | Asteroids | vector upright | **Rock Field** |
| 1980 | Missile Command | trackball upright | **City Shield** |
| 1981 | Centipede | trackball upright | **Garden Pest** |
| 1981 | Frogger | joystick upright | **Hop Across** |
| 1980 | Adventure *(Home Computers room)* | TV + wood-grain console + joystick | **Castle Quest** |
| 1981 | 3D Monster Maze | wedge micro + portable TV + cassette deck | **Maze Monster** |
| 1982 | Pitfall! | TV + wood-grain console | **Jungle Run** (screens generated from their number) |
| 1982 | Choplifter | beige home computer | **Chopper Rescue** |
| 1983 | Lode Runner | silver home computer | **Gold Digger** |
| 1984 | Boulder Dash | black home computer | **Rock & Gem** |
| 1984 | Excitebike *(8-Bit Console room)* | TV cabinet + grey console + pads | **Dirt Jump** |
| 1985 | Super Mario Bros. | TV cabinet + charcoal console | **Block Hopper** |
| 1985 | Gradius | TV cabinet + black console | **Star Lancer** (power meter) |
| 1986 | The Legend of Zelda | TV cabinet + white console + disk drive | **Sword & Key** |
| 1986 | Dragon Quest | TV cabinet + charcoal console | **Hero's Road** (turn-based RPG) |
| 1989 | Tetris and Columns | landscape pocket console on a plinth | **Jewel Drop** |
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

## Works on every device

- **Adaptive quality.** In Auto mode the resolution, and then the glow, drop when the frame rate does. You can also pick High or Low in ⚙ settings (remembered per browser).
- **Light pool.** A fixed set of lights is moved to whichever room you're in, so the GPU never lights all 40 exhibits at once and shaders never recompile mid-walk.
- **Offscreen machines pause.** Only screens in view, within 26 m, run their demos and upload frames.
- **2D mode.** `src/main.js` boots the 3D museum only when WebGL works. If WebGL is missing, the three.js download fails, or the GPU drops its context, every game opens in a plain 2D arcade (`src/flat.js`, which never loads three.js). Visitors can also choose it in settings or link to `#2d`.
- **Zoom.** While playing, the game can fill the screen with crisp, whole-number pixel scaling. It's on by default on small screens.
- **Phones.** Safe areas for notches, dynamic viewport height, resize on rotation and toolbar changes, no accidental zoom or scroll, controls sized to the screen. Rendering pauses in background tabs.

## Visitor features

- **High scores:** a top-10 board on every machine (all time and today) with arcade-style initials.
- **Passport:** a stamp for each machine you play, 15 achievements, and a printable certificate for each finished wing.
- **Machine of the day:** the same featured machine for every visitor, with a streak achievement.
- **Guided tour:** walks you through every machine in date order, with spoken narration and captions.

Everything works in 3D and 2D mode. Progress stays in the visitor's browser; scores go to the site when the page sets `window.JAT_ARCADE_CONFIG = { scoresUrl, nonce }` (the WordPress plugin does this).

## WordPress plugin

The plugin lives in `wordpress/jat-arcade-archives/`. Package it with:

```
npm install
npm run build:plugin      # -> dist/jat-arcade-archives.zip
```

The build copies the museum in and bundles three.js (only the add-ons used) and the fonts locally, since WordPress.org plugins can't load code or fonts from a CDN. GitHub Actions builds the zip on every push and attaches it to `v*` releases.

- **Block** "JAT Arcade Archives" and shortcodes `[jat_arcade]`, `[jat_arcade exhibit="spacewar" height="600px" mode="2d"]` and `[jat_arcade_scores game="spacewar"]`.
- The museum runs in an iframe served by the plugin (`/?jat_arcade_museum=1`), so the theme's styles never clash with it.
- **REST API** `jat-arcade/v1/scores`: public `GET`; `POST` requires a `wp_rest` nonce, respects the "who can save scores" setting, is rate limited per visitor and validates the game, initials and maximum score.
- **Settings › JAT Arcade**: who can save scores, board size, rate limit, maximum score, default height, and clearing boards (admin-post handler checks `manage_options` and a nonce).
- Passes `phpcs --standard=WordPress`, including every security sniff.

## Testing

Open `web/tests/smoke.html` from the local server. It runs all games for 100 simulated seconds each and flags any that crash, stop advancing or produce a broken score.

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
    main.js             boot: picks 3D or 2D (never imports three.js)
    museum.js           3D hall, lighting, bloom, walking, camera moves, input, UI, adaptive quality
    flat.js             2D arcade mode
    registry.js         every game by id
    exhibits.js         exhibit catalogue (shared data format)
    machines.js         procedural 3D machine builders
    crt.js              CRT / LCD / lamp-panel screen shader
    sfx.js              synthesized sound effects
    games/              one file per game + base.js contract (terminal.js for text games)
```

### Adding an exhibit
1. Write a game in `src/games/` that extends `Game` (`base.js`). Implement `reset`, `update(dt, input)`, `draw(ctx)` and `ai()` (attract-mode demo).
2. Add a machine builder to `machines.js` that returns `{ group, screen, radius }`.
3. Add an entry to `EXHIBITS` in `exhibits.js`.

The camera's "sit down" pose comes from the screen mesh's position and facing, so it works for any screen angle, including the cocktail table's upward-facing screen.

## Roadmap
- More exhibits: home computers and consoles of the late 1970s and 1980s, PLATO multiplayer games, early arcade racers.
- Submit the plugin to WordPress.org.
- Inside-the-machine views, a game maker lab, multiplayer visits, WebXR, and a portal to the Librarium Archives.
- Shared engine with the Librarium Archives (board and card game museum): same exhibit format and game contract, so wings can link to each other.
- glTF machine models as an optional upgrade over the procedural ones.

Built with guidance from the [CloudAI-X three.js skills](https://github.com/CloudAI-X/threejs-skills).

MIT License © 2026 Jeremy Anderson
