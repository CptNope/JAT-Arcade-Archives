=== JAT Arcade Archives ===
Contributors: cptnope
Tags: games, arcade, museum, retro, 3d
Requires at least: 6.3
Tested up to: 6.8
Requires PHP: 7.4
Stable tag: 0.1.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

A walk-through 3D museum of video game history where every machine is playable, with shared high-score boards.

== Description ==

JAT Arcade Archives puts a playable museum of computer and video game history on your site. Visitors walk through rooms of era-style machines, from a 1947 cathode-ray tube game to the home computers of the early 1980s, read the plaque on each one, and sit down to play.

* 34 playable machines in six wings, each an original recreation of its genre (no ROMs, no copyrighted characters).
* High-score boards on every machine with arcade-style initials, shared by everyone who plays on your site.
* A museum passport with a stamp for every machine, achievements and printable wing certificates.
* A machine of the day and a narrated guided tour.
* Works on phones, tablets and desktops, with keyboard, touch and gamepad controls. Devices without 3D graphics get a 2D arcade with every game.
* Everything is bundled with the plugin: no external scripts, fonts or tracking.

Add the museum with the **JAT Arcade Archives** block, or a shortcode:

* `[jat_arcade]` – the 3D museum
* `[jat_arcade exhibit="spacewar" height="600px"]` – start at one machine
* `[jat_arcade mode="2d"]` – the lighter 2D arcade
* `[jat_arcade_scores game="spacewar"]` – a high-score table (leave out `game` for every machine)

Choose who can save high scores, the board size and limits under **Settings › JAT Arcade**.

= Privacy =

The plugin stores the initials and score a visitor chooses to save, the time, and the user ID if they are logged in. To limit spam it keeps a short one-way hash of the visitor's address with each score; the address itself is never stored. Passport progress stays in the visitor's own browser.

== Installation ==

1. Upload the plugin and activate it.
2. Add the JAT Arcade Archives block (or the `[jat_arcade]` shortcode) to a page.
3. Optional: adjust high-score settings under Settings › JAT Arcade.

== Frequently Asked Questions ==

= Can visitors cheat on the high-score boards? =

Scores are sent by the visitor's browser, so a determined visitor could send a made-up score. Each submission needs a fresh security token from your site, is rate limited, and is capped at a maximum you choose. You can clear any board from the settings screen.

= Does it work without WebGL? =

Yes. If 3D graphics aren't available, the museum switches to a 2D arcade with every game.

== Changelog ==

= 0.1.0 =
* First release: 34 machines, block and shortcodes, shared high scores, passport, machine of the day and guided tour.

== Third-party code ==

* three.js (MIT License) – https://threejs.org
* Press Start 2P and Space Grotesk fonts (SIL Open Font License 1.1)
