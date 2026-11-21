<?php
/**
 * REST API: read and submit high scores.
 *
 *   GET  /wp-json/jat-arcade/v1/scores?game=spacewar&period=all|daily
 *   POST /wp-json/jat-arcade/v1/scores   { game, score, initials }   (X-WP-Nonce header required)
 *
 * @package JAT_Arcade_Archives
 */

defined( 'ABSPATH' ) || exit;

/**
 * Score routes.
 */
class JAT_Arcade_Rest {

	const NS = 'jat-arcade/v1';

	/**
	 * Register the routes.
	 */
	public static function register_routes() {
		$game = array(
			'type'              => 'string',
			'required'          => true,
			'sanitize_callback' => 'sanitize_key',
			'validate_callback' => array( __CLASS__, 'valid_game' ),
		);
		register_rest_route(
			self::NS,
			'/scores',
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( __CLASS__, 'get_scores' ),
					'permission_callback' => '__return_true', // High-score boards are public, like the boards on the machines.
					'args'                => array(
						'game'   => $game,
						'period' => array(
							'type'    => 'string',
							'enum'    => array( 'all', 'daily' ),
							'default' => 'all',
						),
					),
				),
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( __CLASS__, 'post_score' ),
					'permission_callback' => array( __CLASS__, 'can_submit' ),
					'args'                => array(
						'game'     => $game,
						'score'    => array(
							'type'     => 'integer',
							'required' => true,
							'minimum'  => 1,
						),
						'initials' => array(
							'type'              => 'string',
							'required'          => true,
							'sanitize_callback' => array( __CLASS__, 'clean_initials' ),
							'validate_callback' => array( __CLASS__, 'valid_initials' ),
						),
					),
				),
			)
		);
	}

	/**
	 * Is this a machine in the museum?
	 *
	 * @param mixed $value Raw value.
	 * @return bool
	 */
	public static function valid_game( $value ) {
		return is_string( $value ) && isset( jat_arcade_exhibits()[ sanitize_key( $value ) ] );
	}

	/**
	 * Upper-case, letters/digits/space, three characters at most.
	 *
	 * @param mixed $value Raw value.
	 * @return string
	 */
	public static function clean_initials( $value ) {
		$v = strtoupper( (string) $value );
		$v = preg_replace( '/[^A-Z0-9 ]/', '', $v );
		$v = trim( substr( (string) $v, 0, 3 ) );
		return '' === $v ? 'AAA' : $v;
	}

	/**
	 * Initials must be a short string.
	 *
	 * @param mixed $value Raw value.
	 * @return bool
	 */
	public static function valid_initials( $value ) {
		return is_string( $value ) && strlen( $value ) <= 12;
	}

	/**
	 * Permission check for submitting a score.
	 *
	 * Every submission must carry a valid wp_rest nonce (the embed page prints one), whether or not the
	 * visitor is logged in, and the site owner decides who may submit in Settings › JAT Arcade.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return true|WP_Error
	 */
	public static function can_submit( $request ) {
		$nonce = (string) $request->get_header( 'X-WP-Nonce' );
		if ( '' === $nonce || ! wp_verify_nonce( $nonce, 'wp_rest' ) ) {
			return new WP_Error( 'jat_arcade_bad_nonce', __( 'Your session expired. Reload the page to submit scores.', 'jat-arcade-archives' ), array( 'status' => 403 ) );
		}
		$who = jat_arcade_settings()['submit'];
		if ( 'nobody' === $who ) {
			return new WP_Error( 'jat_arcade_closed', __( 'High-score submissions are turned off on this site.', 'jat-arcade-archives' ), array( 'status' => 403 ) );
		}
		if ( 'members' === $who && ! current_user_can( 'read' ) ) {
			return new WP_Error( 'jat_arcade_login', __( 'Log in to save high scores on this site.', 'jat-arcade-archives' ), array( 'status' => 401 ) );
		}
		return true;
	}

	/**
	 * GET handler.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response
	 */
	public static function get_scores( $request ) {
		$s    = jat_arcade_settings();
		$rows = JAT_Arcade_Scores::top( $request['game'], $request['period'], $s['board_size'] );
		$res  = rest_ensure_response( $rows );
		$res->header( 'Cache-Control', 'no-store' );
		return $res;
	}

	/**
	 * POST handler.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function post_score( $request ) {
		$s     = jat_arcade_settings();
		$score = (int) $request['score'];
		if ( $score > (int) $s['max_score'] ) {
			return new WP_Error( 'jat_arcade_score', __( 'That score is higher than this site allows.', 'jat-arcade-archives' ), array( 'status' => 400 ) );
		}

		// Rate limit per visitor (hashed address + user id; the address itself is never stored).
		$visitor = substr( wp_hash( self::client_ip() . '|' . get_current_user_id(), 'nonce' ), 0, 16 );
		$key     = 'jat_arcade_rl_' . $visitor;
		$count   = (int) get_transient( $key );
		if ( $count >= (int) $s['rate_limit'] ) {
			return new WP_Error( 'jat_arcade_slow', __( 'Too many scores at once. Try again in a few minutes.', 'jat-arcade-archives' ), array( 'status' => 429 ) );
		}
		set_transient( $key, $count + 1, 10 * MINUTE_IN_SECONDS );

		if ( ! JAT_Arcade_Scores::add( $request['game'], $request['initials'], $score, $visitor ) ) {
			return new WP_Error( 'jat_arcade_db', __( 'The score could not be saved.', 'jat-arcade-archives' ), array( 'status' => 500 ) );
		}
		return rest_ensure_response( array( 'saved' => true ) );
	}

	/**
	 * Visitor address, used only (hashed) for rate limiting.
	 *
	 * @return string
	 */
	public static function client_ip() {
		return isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : '';
	}
}
