// Exhibit catalogue. This is the shared format the WordPress plugin will later load from JSON.
//   machine: key in BUILDERS (machines.js)   game: key in GAMES (main.js)
//   pos/rot: placement in the hall (metres, radians)
export const EXHIBITS = [
  // ---- The Pioneers: front row, facing the visitor on arrival -----------------------------
  {
    id: 'targetbeam', year: 1947, title: 'A Game on a Tube', machine: 'crtdevice', game: 'targetbeam',
    pos: [10, 0, 4.4], rot: Math.PI, recon: true,
    short: 'The earliest known interactive electronic display game.',
    plaque: [
      'In 1947 Thomas T. Goldsmith Jr. and Estle Ray Mann filed a patent for a "cathode-ray tube amusement device", granted in 1948. Players turned knobs to steer a glowing spot toward targets printed on a clear overlay laid over the screen. After a set time the spot blurred out, like an explosion.',
      'It used analog circuits, not a computer, and was never sold. Only the patent survives, so this exhibit is a modern reconstruction.',
    ],
    play: 'TARGET BEAM: arrows aim the beam, A fires. Hit the planes on the overlay before your shots run out.',
  },
  {
    id: 'bertie', year: 1950, title: 'Bertie the Brain', machine: 'bertie', game: 'bertie',
    pos: [5, 0, 4.4], rot: Math.PI, recon: true,
    short: 'A four-metre giant that played noughts and crosses at a fair.',
    plaque: [
      'Josef Kates built Bertie the Brain for the 1950 Canadian National Exhibition in Toronto. It stood about four metres tall and played noughts and crosses on a panel of lights against fairgoers, who entered moves on a keypad.',
      'Its difficulty could be adjusted. This cabinet is a smaller modern reconstruction.',
    ],
    play: 'BERTIE: arrows pick a square, A places your X. Best of three.',
  },
  {
    id: 'oxo', year: 1952, title: 'OXO on EDSAC', machine: 'edsac', game: 'oxo',
    pos: [0, 0, 4.4], rot: Math.PI, recon: true,
    short: 'A PhD thesis that became one of the first games on a computer screen.',
    plaque: [
      'Alexander "Sandy" Douglas wrote OXO in 1952 for his Cambridge University PhD thesis on human–computer interaction. It ran on EDSAC, one of the first stored-program computers, and showed the board on a 35 by 16 dot CRT.',
      'Players dialled moves on a rotary telephone dial. The computer played a perfect game, so the best a human could hope for was a draw.',
    ],
    play: 'OXO: arrows pick a square, A "dials" your move. Getting a draw is an achievement.',
  },
  {
    id: 'tennis', year: 1958, title: 'Tennis for Two', machine: 'scope', game: 'tennis',
    pos: [-5, 0, 4.4], rot: Math.PI, recon: true,
    short: 'Made just for fun, for a laboratory visitors\' day.',
    plaque: [
      'Physicist William Higinbotham built Tennis for Two at Brookhaven National Laboratory for its 1958 visitors\' day. An analog computer drew a side view of a tennis court on a small oscilloscope. Each player had a knob to set the angle of a shot and a button to hit the ball over the net.',
      'It is widely considered the first game made purely for entertainment rather than research, and visitors queued to play it.',
    ],
    play: 'TENNIS FOR TWO: Up/Down set your angle, A hits when the ball is on your side. First to 5.',
  },
  {
    id: 'spacewar', year: 1962, title: 'Spacewar!', machine: 'pdp1', game: 'spacewar',
    pos: [-10, 0, 4.4], rot: Math.PI, recon: true,
    short: 'Two ships, one star, and the birth of computer gaming culture.',
    plaque: [
      'Steve Russell and colleagues at MIT wrote Spacewar! in 1962 for the DEC PDP-1. Two ships duel around a star whose gravity pulls them in, firing torpedoes and risking a hyperspace jump to escape.',
      'Its code was passed between research labs, and it became the foundational game of early computing culture. It inspired the first coin-operated video games.',
    ],
    play: 'SPACEWAR: Left/Right rotate, Up thrusts, A fires, Down jumps to hyperspace (risky!). First to 3.',
  },
  // ---- The Golden Age: back row ------------------------------------------------------------
  {
    id: 'volley', year: 1972, title: 'The Living-Room Game', machine: 'tv', game: 'volley',
    pos: [-9, 0, -4.2], rot: 0.35,
    short: 'Home TV games arrive. Two knobs, one ball, endless rallies.',
    plaque: [
      'The first home video game console, the Magnavox Odyssey, went on sale in 1972. It grew out of engineer Ralph Baer\'s "Brown Box" prototype, had no sound, and came with plastic overlays you taped to the TV screen.',
      'The same year, Atari\'s Pong became an arcade hit, and dedicated home versions followed from 1975. Ball-and-paddle games dominated the decade.',
    ],
    play: 'VOLLEY: move your paddle with Up/Down. First to 7 wins.',
  },
  {
    id: 'starsiege', year: 1978, title: 'The Invasion of the Arcades', machine: 'arcade', game: 'starsiege',
    pos: [-4.5, 0, -5.2], rot: 0.12,
    short: 'Fixed shooters turn arcades into a craze.',
    plaque: [
      'Taito\'s Space Invaders (1978) made the fixed shooter a worldwide sensation. It kept a high score on screen, which gave players a reason to come back and beat it.',
      'Its aliens march faster as you destroy them. The game is often said to have started that way by accident: the hardware simply drew fewer sprites faster.',
    ],
    play: 'STAR SIEGE: Left/Right to move, A to fire. Hide behind the shields.',
  },
  {
    id: 'gemrunner', year: 1980, title: 'Maze Craze at the Table', machine: 'cocktail', game: 'gemrunner',
    pos: [0, 0, -3.6], rot: 0,
    short: 'Cocktail cabinets put games on the table — literally.',
    plaque: [
      'Cocktail cabinets placed the screen under a glass tabletop so two players could sit across from each other, often in bars and restaurants. The picture flipped for each player\'s turn.',
      'Namco\'s Pac-Man (1980) made maze-chase games a phenomenon. Each pursuer used a different chase rule, which made them feel like they had personalities.',
    ],
    play: 'GEM RUNNER: steer with the arrows, collect every gem. Yellow cores let you zap the drones.',
  },
  {
    id: 'serpent', year: 1982, title: 'Type It In Yourself', machine: 'computer', game: 'serpent',
    pos: [4.6, 0, -5.0], rot: -0.12,
    short: 'Home computers turn players into programmers.',
    plaque: [
      'Early-1980s home computers such as the Commodore 64 (1982), one of the best-selling single computer models ever, brought games and programming into the same box.',
      'Magazines printed BASIC program listings for readers to type in by hand. Snake games, descended from Gremlin\'s 1976 arcade game Blockade, were a favourite.',
    ],
    play: 'SERPENT: arrows to turn. Eat the fruit, don\'t bite yourself.',
  },
  {
    id: 'brickfall', year: 1989, title: 'Games in Your Pocket', machine: 'handheld', game: 'brickfall',
    pos: [9, 0, -4.2], rot: -0.35,
    short: 'Four shades of green go everywhere you do.',
    plaque: [
      'Nintendo\'s Game Boy (1989) used a four-shade monochrome LCD, ran for hours on AA batteries and swapped games on cartridges, which made portable play mainstream.',
      'Brick-breaker games trace back to Atari\'s Breakout (1976). One appeared among the Game Boy\'s launch titles as Alleyway.',
    ],
    play: 'BRICKFALL: Left/Right to move, A to launch the ball.',
  },
];

export const NOTE = 'Machines here are original era-style models, not replicas of real products. Every game is an original recreation of its genre, written for this museum.';
export const RECON_NOTE = 'Modern reconstruction: the original no longer runs or survives only in records, so the rules and controls here are our interpretation, not an emulation.';
export const WINGS = [
  { title: 'THE PIONEERS · 1947–1962', side: 'front' },
  { title: 'THE GOLDEN AGE · 1972–1989', side: 'back' },
];
