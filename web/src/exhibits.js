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
  // ---- The Mainframe Era: second room, through the doorway (north row, then south row) ----
  {
    id: 'nimrod', year: 1951, title: 'Nimrod', machine: 'nimrod', game: 'nimrod',
    pos: [18, 0, -5.0], rot: 0, recon: true,
    short: 'A computer built to show off, by playing an ancient game.',
    plaque: [
      'Ferranti built Nimrod for the 1951 Festival of Britain. John Bennett designed it and engineer Raymond Stuart-Williams built it. It played Nim: players take turns removing lights from rows of lamps, and whoever takes the last one wins.',
      'Bennett meant it to show off the mathematical abilities of computers, but most visitors just wanted to play. Alan Turing was among those who tried it. At the Berlin Industrial Show later that year, West Germany\'s economics minister Ludwig Erhard tried to beat it and failed.',
    ],
    play: 'NIMROD: Up/Down pick a row, Left/Right choose how many lamps, A takes them. Take the last lamp to win. Best of three.',
  },
  {
    id: 'bouncingball', year: 1952, title: 'Bouncing Ball', machine: 'whirlwind', game: 'bouncingball',
    pos: [22.5, 0, -5.0], rot: 0, recon: true,
    short: 'A real-time demo becomes a game when someone adds a hole.',
    plaque: [
      'MIT\'s Whirlwind I was one of the first computers fast enough to draw moving pictures in real time. A demonstration program showed a ball bouncing across its display.',
      'By the summer of 1952 someone had added a hole in the floor, and the demo became a challenge: tune the bounce so the ball drops through.',
    ],
    play: 'BOUNCING BALL: Up/Down change the bounce, Left/Right the speed. A drops the ball. Get it through the hole.',
  },
  {
    id: 'starpatrol', year: 1971, title: 'Space on a Mainframe', machine: 'terminal2', game: 'starpatrol',
    pos: [27, 0, -5.0], rot: 0,
    short: 'Strategy in space, one turn at a time, on a time-shared computer.',
    plaque: [
      'In 1971 high-school student Mike Mayfield wrote Star Trek, a turn-based strategy game in BASIC, on a university\'s Sigma 7 mainframe. It ran on a teleprinter with no screen, so players read a grid of printed characters and typed commands to move, fire and dock.',
      'Its BASIC listing spread from computer to computer and was rewritten many times, later on video terminals like this one. Mainframes were shared by many users, so games favoured thinking over speed.',
    ],
    play: 'STAR PATROL: arrows move one square, A fires phasers at every raider in the sector. Dock beside a base (B) to refuel. Leave by the map edge to warp.',
  },
  {
    id: 'beast', year: 1972, title: 'Hunting in the Dark', machine: 'teletype', game: 'beast',
    pos: [27, 0, 5.0], rot: Math.PI,
    short: 'A cave of twenty rooms, printed one line at a time.',
    plaque: [
      'Gregory Yob wrote Hunt the Wumpus in BASIC in 1972. Players moved through twenty caves arranged like the corners of a dodecahedron, warned only by clues: a draft near a pit, a terrible smell near the beast.',
      'Many people played games like this on teleprinters, which printed every turn on paper. You had to picture the map in your head.',
    ],
    play: 'HUNT THE BEAST: Left/Right choose MOVE or SHOOT and a tunnel, then A. Use the clues to work out where the beast is.',
  },
  {
    id: 'dungeon', year: 1975, title: 'Dungeons on PLATO', machine: 'plato', game: 'dungeon',
    pos: [22.5, 0, 5.0], rot: Math.PI,
    short: 'Glowing orange screens and some of the first computer role-playing games.',
    plaque: [
      'PLATO, an educational computer network run from the University of Illinois, linked hundreds of terminals with orange plasma displays. Students used it to write some of the earliest computer role-playing games, such as pedit5 and dnd in 1975.',
      'These games borrowed from the tabletop game Dungeons & Dragons: explore a dungeon, fight monsters, collect treasure, go deeper.',
    ],
    play: 'PLASMA DUNGEON: arrows move. Walk into monsters to fight. $ is gold, ! heals, > goes deeper.',
  },
  {
    id: 'cavern', year: 1976, title: 'The First Adventure', machine: 'terminal', game: 'cavern',
    pos: [18, 0, 5.0], rot: Math.PI,
    short: 'A cave, a lamp and a parser: the adventure game is born.',
    plaque: [
      'Will Crowther created Colossal Cave Adventure in 1976, combining his love of caving with ideas from Dungeons & Dragons. Don Woods expanded it in 1977. Players typed two-word commands such as GET LAMP to explore and solve puzzles.',
      'It started the adventure genre, which moved to home computers at the end of the 1970s.',
    ],
    play: 'CAVERN QUEST: Left/Right pick a command, A does it. Find the treasure and bring it back to the shed.',
  },
  // ---- Experiments & Prototypes: third room, west doorway (south row, then north row) ----
  {
    id: 'turochamp', year: 1948, title: 'The Paper Machine', machine: 'paperdesk', game: 'turochamp',
    pos: [-18, 0, 5.0], rot: Math.PI, recon: true,
    short: 'A chess program written before there was a computer to run it.',
    plaque: [
      'In 1948 Alan Turing and David Champernowne wrote Turochamp, a set of rules for playing chess. No computer could run it, so in 1952 Turing played a recorded game against his colleague Alick Glennie by working through the rules himself with pencil and paper. Each move took up to half an hour. The program lost.',
      'This version uses Turing\'s piece values (pawn 1, knight 3, bishop 3½, rook 5, queen 10) and his idea of counting how freely each piece can move. It skips castling and en passant.',
    ],
    play: 'PAPER MACHINE: arrows move the blue cursor. A picks up a piece, then A again on a dotted square to move it. You play the white pieces.',
  },
  {
    id: 'draughts', year: 1952, title: 'Strachey\'s Draughts', machine: 'ferranti', game: 'draughts',
    pos: [-22.5, 0, 5.0], rot: Math.PI, recon: true,
    short: 'A teacher turns a computer\'s memory display into a game board.',
    plaque: [
      'Christopher Strachey, a schoolteacher, wrote a draughts (checkers) program for the Ferranti Mark 1 at the University of Manchester. By July 1952 it could play a complete game at a reasonable speed.',
      'Strachey reused the computer\'s monitor tubes, which normally showed the contents of memory, to draw the board and pieces. After hearing him describe it, Arthur Samuel wrote his own checkers program for the IBM 701.',
    ],
    play: 'DRAUGHTS: arrows move the cursor, A picks a piece, A again on a marked square to move. You are the bright rings. Captures are compulsory.',
  },
  {
    id: 'pool', year: 1954, title: 'Pool on MIDSAC', machine: 'midsac', game: 'pool',
    pos: [-27, 0, 5.0], rot: Math.PI, recon: true,
    short: 'Balls rolling across a screen in real time.',
    plaque: [
      'In 1954 the University of Michigan built a pool game for MIDSAC, one of the computers that followed EDSAC. Its graphics updated continuously on the screen, which was rare for the time.',
      'Very little about the original survives, so this table is a modern reconstruction.',
    ],
    play: 'POCKET POOL: Left/Right aim (hold A to aim finely), Up/Down set power, tap A to shoot. Pot every ball before you run out of shots.',
  },
  {
    id: 'sumer', year: 1964, title: 'The Sumerian Game', machine: 'ibmterm', game: 'sumer',
    pos: [-27, 0, -5.0], rot: 0, recon: true,
    short: 'A schoolteacher writes one of the first story-driven games.',
    plaque: [
      'Mabel Addis, a fourth-grade teacher, designed and wrote The Sumerian Game, and IBM\'s William McKay programmed it for an IBM 7090 mainframe. Players ruled the city of Lagash around 3500 BC, deciding how to share grain between food, planting and storage. Sixth-graders played it on a teleprinter.',
      'Addis is credited as the first female video game designer and the first video game writer. A later version, King of Sumeria, led to the famous BASIC game Hamurabi.',
    ],
    play: 'SUMERIAN STEWARD: Left/Right choose an amount, A confirms. Feed your people and plant your fields for ten seasons.',
  },
  {
    id: 'chase', year: 1968, title: 'The Brown Box', machine: 'protobox', game: 'chase',
    pos: [-22.5, 0, -5.0], rot: 0, recon: true,
    short: 'The prototype that became the first home console.',
    plaque: [
      'Starting in 1967, Ralph Baer and his colleagues at Sanders Associates built a series of prototypes for playing games on an ordinary television. The seventh, finished in 1968, was nicknamed the Brown Box after the wood-grain vinyl stuck to its case. Switches on the front selected among its games.',
      'One early idea was a chase game: each player moved a spot with separate horizontal and vertical knobs, like tag. Magnavox licensed the Brown Box and sold it as the Odyssey in 1972.',
    ],
    play: 'CHASE: arrows move your solid spot. Odd rounds you hunt the hollow spot; even rounds you run from it. Six rounds.',
  },
  {
    id: 'empire', year: 1977, title: 'Empire', machine: 'terminal3', game: 'empire',
    pos: [-18, 0, -5.0], rot: 0,
    short: 'A war game that spread from computer to computer.',
    plaque: [
      'Walter Bright wrote Empire in 1977 in FORTRAN for the PDP-10 at Caltech, based on a board war game he had designed as a child. Cities build armies, armies explore a hidden map, and capturing a city succeeds only half the time.',
      'The source code was copied off Caltech\'s computer and passed from system to system. The game was so absorbing that some students reportedly failed classes playing it.',
    ],
    play: 'CONQUEST: arrows move the blinking army one square, A makes it wait. Capture every enemy city (X).',
  },
  // ---- The Arcade Boom: fourth room, north doorway (clockwise from the door) ----
  {
    id: 'nightroad', year: 1976, title: 'Driving at Night', machine: 'arcadeDrive', game: 'nightroad',
    pos: [-12.3, 0, -11], rot: Math.PI / 2,
    short: 'The road ahead, seen from the driver\'s seat.',
    plaque: [
      'Atari\'s Night Driver (1976) is often called the first first-person driving game. The road itself was never drawn: only the white reflector posts on each side, rushing toward you in the dark.',
      'The car wasn\'t drawn either. It was a printed plastic insert laid under the screen. Players had a steering wheel, a gas pedal and a gear shift, and a limited time to drive as far as they could.',
    ],
    play: 'NIGHT ROAD: Left/Right steer, A or Up accelerates, Down brakes. Stay between the posts and beat the clock.',
  },
  {
    id: 'moonlander', year: 1979, title: 'Touchdown', machine: 'arcadeMoon', game: 'moonlander',
    pos: [-12.3, 0, -16.5], rot: Math.PI / 2,
    short: 'Atari\'s first game drawn with lines instead of pixels.',
    plaque: [
      'Lunar Lander (1979) was Atari\'s first vector game: its monitor drew sharp, glowing lines rather than rows of pixels. The idea dated back to a 1969 text game called Lunar.',
      'It sold modestly, and Atari soon stopped making it to build Asteroids, which used the same vector hardware. The first few hundred Asteroids machines shipped in Lunar Lander cabinets.',
    ],
    play: 'MOON LANDER: Left/Right tilt, Up or A fires the engine. Land slowly and upright on a flat pad. Narrow pads score more.',
  },
  {
    id: 'rockfield', year: 1979, title: 'Rocks in Space', machine: 'arcadeRocks', game: 'rockfield',
    pos: [-10, 0, -21], rot: 0,
    short: 'Atari\'s best-selling arcade game, drawn in glowing vectors.',
    plaque: [
      'Asteroids (1979), by Ed Logg and Dominic Walsh, put players in a tiny ship surrounded by drifting rocks that split apart when shot. The screen wrapped at every edge.',
      'It displaced Space Invaders in popularity in the United States and became Atari\'s best-selling arcade game of all time, with over 70,000 units sold.',
    ],
    play: 'ROCK FIELD: Left/Right rotate, Up thrusts, A fires, Down jumps to hyperspace.',
  },
  {
    id: 'cityshield', year: 1980, title: 'Defend the Cities', machine: 'arcadeCity', game: 'cityshield',
    pos: [-4, 0, -21], rot: 0,
    short: 'A trackball, three missile bases and six cities to protect.',
    plaque: [
      'In Missile Command (1980), players used a trackball to move a crosshair and fired from three missile batteries, creating explosions in the sky to stop incoming missiles before they hit six cities.',
      'Its designer, Dave Theurer, reportedly had nightmares about the cities being destroyed while he was making it.',
    ],
    play: 'CITY SHIELD: arrows move the crosshair, A fires from the nearest base. Catch missiles in the blasts.',
  },
  {
    id: 'gardenpest', year: 1981, title: 'Bugs in the Garden', machine: 'arcadePest', game: 'gardenpest',
    pos: [-0.7, 0, -16.5], rot: -Math.PI / 2,
    short: 'Pastel colours, a trackball and a game made for everyone.',
    plaque: [
      'Centipede (1981) was designed by Dona Bailey and Ed Logg. Bailey was one of the few women programming arcade games, and she pushed for the trackball and a palette of pastel colours.',
      'It became one of Atari\'s most successful coin-op games and one of the first widely played by women and girls.',
    ],
    play: 'GARDEN PEST: arrows move, hold A to fire. Hit the crawler\'s segments; each one becomes a mushroom.',
  },
  {
    id: 'hopacross', year: 1981, title: 'Across the Road', machine: 'arcadeHop', game: 'hopacross',
    pos: [-0.7, 0, -11], rot: -Math.PI / 2,
    short: 'A game about crossing the road, for players of any age.',
    plaque: [
      'Konami\'s Frogger (1981), published in North America by Sega/Gremlin, asked players to guide frogs home across a busy road and then a river, hopping onto floating logs and turtles.',
      'At a time when most arcade hits were about space, it was about crossing a road, and it became one of the top-grossing arcade games in North America in 1981.',
    ],
    play: 'HOP ACROSS: each arrow press is one hop. Cross the road, ride the logs and turtles, and fill all five nests.',
  },
  // ---- Home Computers & Consoles: fifth room, second north doorway (clockwise from the door) ----
  {
    id: 'castlequest', year: 1980, title: 'Quest in a Cartridge', machine: 'homeConsole', game: 'castlequest',
    pos: [2.3, 0, -11], rot: Math.PI / 2,
    short: 'The first action-adventure on a home console, and a hidden signature.',
    plaque: [
      'Warren Robinett\'s Adventure (1980) for the Atari 2600 turned the text game Colossal Cave Adventure into pictures. The hero was a single square, searching castles and mazes for a chalice while dragons hunted it, even in rooms you weren\'t in.',
      'Atari didn\'t credit its programmers, so Robinett hid a secret room containing the words "Created by Warren Robinett". It became the most famous early video game Easter egg.',
    ],
    play: 'CASTLE QUEST: arrows move; walk into an item to carry it, A drops it. The key unlocks the gold vault, the sword slays dragons, and the cup goes home to the castle.',
  },
  {
    id: 'mazemonster', year: 1981, title: 'Something in the Maze', machine: 'pocketMicro', game: 'mazemonster',
    pos: [2.3, 0, -16.5], rot: Math.PI / 2,
    short: 'First-person 3D on a tiny home computer, and a dinosaur.',
    plaque: [
      'Malcolm Evans wrote 3D Monster Maze (1981) for the ZX81, a tiny British home computer. Drawn with chunky character blocks, it was one of the first 3D games for a home computer.',
      'Players had to escape a maze while a Tyrannosaurus rex hunted them, with on-screen warnings as it closed in. It is often called one of the first survival horror games.',
    ],
    play: 'MAZE MONSTER: Up walks forward, Down steps back, Left/Right turn. Find the checked exit before the monster finds you.',
  },
  {
    id: 'junglerun', year: 1982, title: 'Into the Jungle', machine: 'homeConsole', game: 'junglerun',
    pos: [6, 0, -21], rot: 0,
    short: 'Hundreds of screens in a few bytes, and a running, jumping hero.',
    plaque: [
      'David Crane\'s Pitfall! (1982) for Activision sent an explorer through a jungle of quicksand, rolling logs, swinging vines and crocodiles, hunting treasure against a 20-minute clock.',
      'Instead of storing every screen, the game generated them from a number counter, fitting 255 jungle screens into fewer than 50 bytes of the cartridge. It sold over four million copies.',
    ],
    play: 'JUNGLE RUN: Left/Right run, A or Up jumps. Jump onto a vine to swing over wide swamps; A lets go. Grab treasure before time runs out.',
  },
  {
    id: 'chopper', year: 1982, title: 'Rescue, not Destruction', machine: 'microBeige', game: 'chopper',
    pos: [12, 0, -21], rot: 0,
    short: 'A shooting game where the point is to save people.',
    plaque: [
      'Dan Gorlin wrote Choplifter (1982) on an Apple II his grandfather lent him, and Broderbund published it. Players flew a helicopter behind enemy lines to rescue hostages and bring them home.',
      'It sold 9,000 copies in its first month and was one of the few games to start on a home computer and later be made into an arcade machine.',
    ],
    play: 'CHOPPER RESCUE: arrows fly. A fires (in the air). Shoot open the barracks, land near the hostages so they can climb aboard, then land at your base to drop them off.',
  },
  {
    id: 'golddigger', year: 1983, title: 'Dig, Trap, Escape', machine: 'microSilver', game: 'golddigger',
    pos: [16.8, 0, -16.5], rot: -Math.PI / 2,
    short: 'A puzzle-platformer that let players build their own levels.',
    plaque: [
      'Doug Smith\'s Lode Runner (1983), published by Broderbund, asked players to grab every pile of gold while guards chased them, digging holes in brick floors to trap the guards.',
      'It was one of the first games to include a level editor, so players could design and share their own stages. It sold hundreds of thousands of copies in the United States and millions in Japan.',
    ],
    play: 'GOLD DIGGER: arrows run and climb. A digs a hole in front of you. Trap the guards, collect all the gold, then climb the new ladder to the top.',
  },
  {
    id: 'rockgem', year: 1984, title: 'Rocks That Fall', machine: 'microBlack', game: 'rockgem',
    pos: [16.8, 0, -11], rot: -Math.PI / 2,
    short: 'A digging game ruled by gravity.',
    plaque: [
      'Boulder Dash (1984), created by Peter Liepa with Chris Gray and published by First Star Software for Atari 8-bit computers, had players tunnel through caves collecting diamonds.',
      'Boulders and diamonds fell when the earth beneath them was dug away, and rolled off each other, so every move could start a chain reaction.',
    ],
    play: 'ROCK & GEM: arrows dig. Collect enough gems to open the exit. Don\'t stand under falling boulders. You can push a boulder sideways into an empty space.',
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
  // ---- The 8-Bit Console Era: the south wing ---------------------------------------------------
  {
    id: 'dirtjump', year: 1984, title: 'Build Your Own Track', machine: 'console8Grey', game: 'dirtjump',
    pos: [5.6, 0, 11], rot: Math.PI / 2,
    short: 'Motocross, engine heat, and one of the first console level editors.',
    plaque: [
      'Nintendo\'s Excitebike came out for the Famicom in Japan on November 30, 1984, and was a launch title for the NES in North America in 1985. Riders balanced speed against engine heat: push too hard and the bike overheats, while cooling zones on the track bring the temperature down.',
      'Its Design mode let players build their own tracks from 19 kinds of obstacles, one of the earliest level editors on a home console. In Japan, tracks could be saved to the Famicom\'s cassette data recorder.',
    ],
    play: 'DIRT JUMP: hold A for throttle, hold Right as well for turbo (watch the heat). Up/Down change lanes; Left/Right lean in the air so you land level.',
  },
  {
    id: 'blockhopper', year: 1985, title: 'The Comeback', machine: 'console8', game: 'blockhopper',
    pos: [5.6, 0, 16.5], rot: Math.PI / 2,
    short: 'After the crash, a platform game brings home consoles back.',
    plaque: [
      'After the video game crash of 1983, many American retailers wanted nothing more to do with home consoles. Nintendo\'s NES went on sale in a test market in New York City in October 1985, with Super Mario Bros. among its first games.',
      'Super Mario Bros. (Japan, September 1985) was the best-selling video game for nearly three decades, with more than 40 million copies sold. It is credited with helping revive the industry and with popularizing the side-scrolling platform game.',
    ],
    play: 'BLOCK HOPPER: Left/Right to run, A to jump (hold it for a higher jump). Stomp beetles, bump the gem blocks and reach the flag.',
  },
  {
    id: 'starlancer', year: 1985, title: 'Pick Your Power', machine: 'console8Black', game: 'starlancer',
    pos: [9.8, 0, 21], rot: Math.PI,
    short: 'A shooter where you choose your own upgrades, and the birth of a famous cheat code.',
    plaque: [
      'Konami\'s arcade shooter Gradius (1985) let players choose their own upgrades. Every capsule moved a light along a power meter, and the player decided when to cash it in: speed, missiles, a double shot, a laser, an "option" drone or a shield.',
      'Porting it to the Famicom in 1986, programmer Kazuhisa Hashimoto found it too hard to test, so he added a secret button sequence that gave full power-ups. He forgot to remove it, players discovered it, and it became known as the Konami Code.',
    ],
    play: 'STAR LANCER: arrows to fly; your ship fires by itself. Shoot the red craft for capsules, then press A to take the lit power-up.',
  },
  {
    id: 'swordkey', year: 1986, title: 'A World to Explore', machine: 'console8White', game: 'swordkey',
    pos: [15.8, 0, 21], rot: Math.PI,
    short: 'An open world, no map, and the first cartridge that saved your game.',
    plaque: [
      'The Legend of Zelda launched alongside the Famicom Disk System in Japan on February 21, 1986. Shigeru Miyamoto drew on his childhood explorations of the countryside near Kyoto: the world was open, and players had to find their own way.',
      'The disk system could save progress. For the 1987 release in North America, Nintendo put a battery in the gold cartridge instead, making it the first NES game that saved your progress without passwords.',
    ],
    play: 'SWORD & KEY: arrows to walk, A to swing your sword. Find the three key shards, then enter the cave in the middle of the map.',
  },
  {
    id: 'herosroad', year: 1986, title: 'The Role-Playing Game Comes Home', machine: 'console8', game: 'herosroad',
    pos: [20, 0, 16.5], rot: -Math.PI / 2,
    short: 'Menus, levels and a long road: the console RPG takes shape.',
    plaque: [
      'Dragon Quest (Famicom, May 27, 1986) set out to be a role-playing game anyone could enjoy. Designer Yuji Horii distilled ideas from computer RPGs such as Wizardry and Ultima into simple menus and a clear story.',
      'Manga artist Akira Toriyama designed its monsters and Koichi Sugiyama composed the music. It became the model for the Japanese console RPG, and reached North America in 1989 as Dragon Warrior.',
    ],
    play: 'HERO\'S ROAD: arrows to walk. In battle, Up/Down choose FIGHT, HEAL or RUN and A confirms. Rest at the town; the wyrm waits in the castle.',
  },
  {
    id: 'jeweldrop', year: 1989, title: 'Falling Into Place', machine: 'pocketBrick', game: 'jeweldrop',
    pos: [20, 0, 11], rot: -Math.PI / 2,
    short: 'Falling-block puzzles become the perfect pocket game.',
    plaque: [
      'Alexey Pajitnov wrote Tetris in 1984 on an Elektronika 60 computer at the Soviet Academy of Sciences in Moscow. When Nintendo\'s Game Boy reached North America on July 31, 1989, Tetris came in the box, and falling-block puzzles went everywhere.',
      'Columns, created in 1989 by Hewlett-Packard engineer Jay Geertsen, dropped columns of three jewels and cleared any three in a row, diagonals included. Sega bought the rights in 1990.',
    ],
    play: 'JEWEL DROP: Left/Right move, A cycles the jewels, Down drops faster, Up drops at once. Match three or more in any direction.',
  },
];

export const NOTE = 'Machines here are original era-style models, not replicas of real products. Every game is an original recreation of its genre, written for this museum.';
export const RECON_NOTE = 'Modern reconstruction: the original no longer runs or survives only in records, so the rules and controls here are our interpretation, not an emulation.';
export const WINGS = [
  { id: 'pioneers', title: 'The Pioneers', years: '1947–1962' },
  { id: 'experiments', title: 'Experiments & Prototypes', years: '1948–1977' },
  { id: 'mainframe', title: 'The Mainframe Era', years: '1951–1976' },
  { id: 'arcade', title: 'The Arcade Boom', years: '1976–1981' },
  { id: 'home', title: 'Home Computers & Consoles', years: '1980–1984' },
  { id: 'console', title: 'The 8-Bit Console Era', years: '1983–1989' },
  { id: 'golden', title: 'The Golden Age', years: '1972–1989' },
];

// Each exhibit's wing follows from where it stands (which room, or the main hall's two rows).
for (const ex of EXHIBITS) ex.wing ??= ex.pos[2] > 7 ? 'console' : ex.pos[2] < -7 ? (ex.pos[0] > 1.5 ? 'home' : 'arcade') : ex.pos[0] > 14.5 ? 'mainframe' : ex.pos[0] < -14.5 ? 'experiments' : ex.pos[2] > 0 ? 'pioneers' : 'golden';
