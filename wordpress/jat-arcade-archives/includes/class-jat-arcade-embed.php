<?php
/**
 * Front end: the museum page, the [jat_arcade] and [jat_arcade_scores] shortcodes, and the block.
 *
 * The museum runs in an iframe so its full-screen layout, keyboard handling and styles never clash
 * with the theme. The iframe loads a page this plugin serves (/?jat_arcade_museum=1) that prints the
 * bundled museum with a fresh REST nonce for the score boards.
 *
 * @package JAT_Arcade_Archives
 */

defined( 'ABSPATH' ) || exit;

/**
 * Embedding.
 */
class JAT_Arcade_Embed {

	const QUERY_VAR = 'jat_arcade_museum';

	/**
	 * Hooks.
	 */
	public static function init() {
		add_filter( 'query_vars', array( __CLASS__, 'query_vars' ) );
		add_action( 'template_redirect', array( __CLASS__, 'serve_museum' ) );
		add_action( 'init', array( __CLASS__, 'register' ) );
	}

	/**
	 * Public query vars used by the museum page. They only choose what to display.
	 *
	 * @param string[] $vars Vars.
	 * @return string[]
	 */
	public static function query_vars( $vars ) {
		$vars[] = self::QUERY_VAR;
		$vars[] = 'jat_arcade_mode';
		return $vars;
	}

	/**
	 * Shortcodes and the block.
	 */
	public static function register() {
		add_shortcode( 'jat_arcade', array( __CLASS__, 'shortcode' ) );
		add_shortcode( 'jat_arcade_scores', array( __CLASS__, 'scores_shortcode' ) );

		wp_register_script(
			'jat-arcade-block',
			JAT_ARCADE_URL . 'block/index.js',
			array( 'wp-blocks', 'wp-element', 'wp-block-editor', 'wp-components', 'wp-i18n', 'wp-server-side-render' ),
			JAT_ARCADE_VERSION,
			true
		);
		wp_localize_script(
			'jat-arcade-block',
			'jatArcadeBlock',
			array( 'exhibits' => self::exhibit_options() )
		);
		register_block_type(
			JAT_ARCADE_DIR . 'block',
			array( 'render_callback' => array( __CLASS__, 'render_block' ) )
		);
		wp_register_style( 'jat-arcade-front', JAT_ARCADE_URL . 'assets/front.css', array(), JAT_ARCADE_VERSION );
	}

	/**
	 * Exhibit choices for the block editor.
	 *
	 * @return array<int,array{value:string,label:string}>
	 */
	private static function exhibit_options() {
		$out = array();
		foreach ( jat_arcade_exhibits() as $id => $ex ) {
			$out[] = array(
				'value' => $id,
				'label' => $ex['year'] . ' · ' . $ex['title'],
			);
		}
		usort(
			$out,
			static function ( $a, $b ) {
				return strcmp( $a['label'], $b['label'] );
			}
		);
		return $out;
	}

	/**
	 * URL of the museum page.
	 *
	 * @param string $mode    '3d' or '2d'.
	 * @param string $exhibit Optional exhibit to start at.
	 * @return string
	 */
	public static function museum_url( $mode = '3d', $exhibit = '' ) {
		$args = array( self::QUERY_VAR => '1' );
		if ( '2d' === $mode ) {
			$args['jat_arcade_mode'] = '2d';
		}
		$url = add_query_arg( $args, home_url( '/' ) );
		if ( '' !== $exhibit && isset( jat_arcade_exhibits()[ $exhibit ] ) ) {
			$url .= '#' . rawurlencode( $exhibit );
		}
		return $url;
	}

	/**
	 * [jat_arcade height="80vh" exhibit="spacewar" mode="3d"]
	 *
	 * @param array|string $atts Attributes.
	 * @return string
	 */
	public static function shortcode( $atts ) {
		$s       = jat_arcade_settings();
		$atts    = shortcode_atts(
			array(
				'height'  => $s['height'],
				'exhibit' => '',
				'mode'    => '3d',
			),
			$atts,
			'jat_arcade'
		);
		$height  = self::clean_height( $atts['height'], $s['height'] );
		$mode    = '2d' === $atts['mode'] ? '2d' : '3d';
		$exhibit = sanitize_key( $atts['exhibit'] );
		wp_enqueue_style( 'jat-arcade-front' );

		return sprintf(
			'<div class="jat-arcade-embed" style="height:%1$s"><iframe src="%2$s" title="%3$s" loading="lazy" allow="fullscreen; gamepad; autoplay" allowfullscreen></iframe><a class="jat-arcade-full" href="%2$s" target="_blank" rel="noopener">%4$s</a></div>',
			esc_attr( $height ),
			esc_url( self::museum_url( $mode, $exhibit ) ),
			esc_attr__( 'JAT Arcade Archives: a playable museum of video game history', 'jat-arcade-archives' ),
			esc_html__( 'Open full screen ↗', 'jat-arcade-archives' )
		);
	}

	/**
	 * Block render: same output as the shortcode.
	 *
	 * @param array $attrs Block attributes.
	 * @return string
	 */
	public static function render_block( $attrs ) {
		return self::shortcode(
			array(
				'height'  => isset( $attrs['height'] ) ? $attrs['height'] : '',
				'exhibit' => isset( $attrs['exhibit'] ) ? $attrs['exhibit'] : '',
				'mode'    => isset( $attrs['mode'] ) ? $attrs['mode'] : '3d',
			)
		);
	}

	/**
	 * A CSS length, or the default.
	 *
	 * @param string $h        Height.
	 * @param string $fallback Default.
	 * @return string
	 */
	private static function clean_height( $h, $fallback ) {
		$h = trim( (string) $h );
		return preg_match( '/^\d{2,4}(px|vh|dvh|svh|rem|em)$/', $h ) ? $h : $fallback;
	}

	/**
	 * [jat_arcade_scores game="spacewar" period="all" limit="10"]
	 *
	 * @param array|string $atts Attributes.
	 * @return string
	 */
	public static function scores_shortcode( $atts ) {
		$atts  = shortcode_atts(
			array(
				'game'   => '',
				'period' => 'all',
				'limit'  => 10,
			),
			$atts,
			'jat_arcade_scores'
		);
		$game  = sanitize_key( $atts['game'] );
		$all   = jat_arcade_exhibits();
		$games = '' === $game ? array_keys( $all ) : array( $game );
		$games = array_values(
			array_filter(
				$games,
				static function ( $g ) use ( $all ) {
					return isset( $all[ $g ] );
				}
			)
		);
		if ( ! $games ) {
			return '';
		}
		$period = 'daily' === $atts['period'] ? 'daily' : 'all';
		wp_enqueue_style( 'jat-arcade-front' );

		$html = '<div class="jat-arcade-scores">';
		foreach ( $games as $g ) {
			$rows = JAT_Arcade_Scores::top( $g, $period, (int) $atts['limit'] );
			if ( ! $rows && count( $games ) > 1 ) {
				continue;
			}
			$html .= '<table><caption>' . esc_html( $all[ $g ]['year'] . ' · ' . $all[ $g ]['title'] ) . '</caption><tbody>';
			if ( ! $rows ) {
				$html .= '<tr><td colspan="3">' . esc_html__( 'No scores yet.', 'jat-arcade-archives' ) . '</td></tr>';
			}
			foreach ( $rows as $i => $r ) {
				$html .= sprintf( '<tr><td>%d</td><td>%s</td><td>%s</td></tr>', $i + 1, esc_html( $r['initials'] ), esc_html( number_format_i18n( $r['score'] ) ) );
			}
			$html .= '</tbody></table>';
		}
		return $html . '</div>';
	}

	/**
	 * Print the museum page when /?jat_arcade_museum=1 is requested.
	 *
	 * This is a read-only page view (no data is changed), so it needs no nonce; it prints a fresh
	 * wp_rest nonce that the score boards send back with every submission.
	 */
	public static function serve_museum() {
		if ( '1' !== get_query_var( self::QUERY_VAR ) ) {
			return;
		}
		$file = JAT_ARCADE_DIR . 'museum/index.html';
		if ( ! is_readable( $file ) ) {
			wp_die( esc_html__( 'The museum files are missing. Reinstall the JAT Arcade Archives plugin.', 'jat-arcade-archives' ), '', array( 'response' => 500 ) );
		}
		$s      = jat_arcade_settings();
		$config = array(
			'scoresUrl' => 'nobody' === $s['submit'] && ! JAT_Arcade_Scores::counts() ? '' : rest_url( JAT_Arcade_Rest::NS . '/scores' ),
			'nonce'     => wp_create_nonce( 'wp_rest' ),
			'mode'      => '2d' === get_query_var( 'jat_arcade_mode' ) ? '2d' : '3d',
			'canSubmit' => 'everyone' === $s['submit'] || ( 'members' === $s['submit'] && is_user_logged_in() ),
			'site'      => get_bloginfo( 'name' ),
		);
		$head   = '<base href="' . esc_url( JAT_ARCADE_URL . 'museum/' ) . '">'
			. '<script>window.JAT_ARCADE_CONFIG=' . wp_json_encode( $config, JSON_HEX_TAG | JSON_HEX_AMP | JSON_UNESCAPED_SLASHES ) . ';</script>';

		$html = (string) file_get_contents( $file ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- local plugin file.
		$html = preg_replace( '/<head>/i', '<head>' . $head, $html, 1 );

		nocache_headers(); // the nonce must not be cached for other visitors.
		header( 'Content-Type: text/html; charset=utf-8' );
		header( 'X-Robots-Tag: noindex' );
		echo $html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- bundled static page; injected values are escaped above.
		exit;
	}
}
