<?php
/**
 * Plugin Name:       JAT Arcade Archives
 * Plugin URI:        https://github.com/CptNope/JAT-Arcade-Archives
 * Description:       A walk-through 3D museum of computer and video game history where every machine is playable. Embed it with a block or the [jat_arcade] shortcode, with shared high-score boards.
 * Version:           0.1.0
 * Requires at least: 6.3
 * Requires PHP:      7.4
 * Author:            Jeremy Anderson
 * Author URI:        https://jeremyanderson.tech
 * License:           GPLv2 or later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       jat-arcade-archives
 *
 * @package JAT_Arcade_Archives
 */

defined( 'ABSPATH' ) || exit;

define( 'JAT_ARCADE_VERSION', '0.1.0' );
define( 'JAT_ARCADE_FILE', __FILE__ );
define( 'JAT_ARCADE_DIR', plugin_dir_path( __FILE__ ) );
define( 'JAT_ARCADE_URL', plugin_dir_url( __FILE__ ) );

require_once JAT_ARCADE_DIR . 'includes/class-jat-arcade-scores.php';
require_once JAT_ARCADE_DIR . 'includes/class-jat-arcade-rest.php';
require_once JAT_ARCADE_DIR . 'includes/class-jat-arcade-embed.php';
require_once JAT_ARCADE_DIR . 'includes/class-jat-arcade-admin.php';

register_activation_hook( __FILE__, array( 'JAT_Arcade_Scores', 'install' ) );

add_action( 'plugins_loaded', array( 'JAT_Arcade_Scores', 'maybe_upgrade' ) );
add_action( 'rest_api_init', array( 'JAT_Arcade_Rest', 'register_routes' ) );
JAT_Arcade_Embed::init();
JAT_Arcade_Admin::init();

/**
 * Plugin settings with defaults.
 *
 * @return array{submit:string,board_size:int,rate_limit:int,height:string,max_score:int}
 */
function jat_arcade_settings() {
	$defaults = array(
		'submit'     => 'everyone', // everyone | members | nobody.
		'board_size' => 10,
		'rate_limit' => 12,         // score submissions per visitor per 10 minutes.
		'height'     => '80vh',
		'max_score'  => 10000000,
	);
	$saved    = get_option( 'jat_arcade_settings', array() );
	return wp_parse_args( is_array( $saved ) ? $saved : array(), $defaults );
}

/**
 * Exhibits known to the bundled museum (id, title, year), generated at build time.
 *
 * @return array<string,array{title:string,year:int}>
 */
function jat_arcade_exhibits() {
	static $list = null;
	if ( null !== $list ) {
		return $list;
	}
	$list = array();
	$file = JAT_ARCADE_DIR . 'museum/exhibits.json';
	if ( is_readable( $file ) ) {
		$data = json_decode( (string) file_get_contents( $file ), true ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- local plugin file.
		if ( is_array( $data ) ) {
			foreach ( $data as $ex ) {
				if ( isset( $ex['id'], $ex['title'], $ex['year'] ) ) {
					$list[ sanitize_key( $ex['id'] ) ] = array(
						'title' => (string) $ex['title'],
						'year'  => (int) $ex['year'],
					);
				}
			}
		}
	}
	return $list;
}
