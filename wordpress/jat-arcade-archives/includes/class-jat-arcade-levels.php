<?php
/**
 * Visitor Gallery: Maker Lab levels shared by visitors, with a moderation queue.
 *
 *   GET  /wp-json/jat-arcade/v1/levels?sort=new|popular        approved levels (public)
 *   POST /wp-json/jat-arcade/v1/levels   { title, initials, code }   X-WP-Nonce required
 *   POST /wp-json/jat-arcade/v1/levels/<id>/play                X-WP-Nonce required
 *
 * @package JAT_Arcade_Archives
 */

defined( 'ABSPATH' ) || exit;

/**
 * Level storage and routes.
 */
class JAT_Arcade_Levels {

	const COLS = 16;
	const ROWS = 10;

	/**
	 * Table name with prefix.
	 *
	 * @return string
	 */
	public static function table() {
		global $wpdb;
		return $wpdb->prefix . 'jat_arcade_levels';
	}

	/**
	 * Create or update the table (called from JAT_Arcade_Scores::install()).
	 */
	public static function install_table() {
		global $wpdb;
		require_once ABSPATH . 'wp-admin/includes/upgrade.php';
		$table   = self::table();
		$charset = $wpdb->get_charset_collate();
		dbDelta(
			"CREATE TABLE {$table} (
				id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
				title varchar(40) NOT NULL,
				initials varchar(3) NOT NULL,
				code varchar(400) NOT NULL,
				status varchar(10) NOT NULL DEFAULT 'pending',
				plays bigint(20) unsigned NOT NULL DEFAULT 0,
				user_id bigint(20) unsigned NOT NULL DEFAULT 0,
				visitor char(16) NOT NULL DEFAULT '',
				created_at datetime NOT NULL,
				PRIMARY KEY  (id),
				KEY status_created (status, created_at),
				KEY status_plays (status, plays)
			) {$charset};"
		);
	}

	/**
	 * A level code is pairs of a tile digit (0-8) and a base-36 run length, covering exactly
	 * 16 x 10 tiles, with one start (7) and one flag (8).
	 *
	 * @param mixed $code Raw code.
	 * @return bool
	 */
	public static function valid_code( $code ) {
		if ( ! is_string( $code ) || strlen( $code ) > 400 || ! preg_match( '/^(?:[0-8][0-9a-z])+$/', $code ) ) {
			return false;
		}
		$total  = 0;
		$starts = 0;
		$flags  = 0;
		$len    = strlen( $code );
		for ( $i = 0; $i < $len; $i += 2 ) {
			$n      = (int) base_convert( $code[ $i + 1 ], 36, 10 );
			$total += $n;
			if ( '7' === $code[ $i ] ) {
				$starts += $n;
			}
			if ( '8' === $code[ $i ] ) {
				$flags += $n;
			}
		}
		return self::COLS * self::ROWS === $total && 1 === $starts && 1 === $flags;
	}

	/**
	 * Register the routes.
	 */
	public static function register_routes() {
		register_rest_route(
			JAT_Arcade_Rest::NS,
			'/levels',
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( __CLASS__, 'get_levels' ),
					'permission_callback' => '__return_true', // Approved levels are public, like a gallery wall.
					'args'                => array(
						'sort' => array(
							'type'    => 'string',
							'enum'    => array( 'new', 'popular' ),
							'default' => 'new',
						),
					),
				),
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( __CLASS__, 'post_level' ),
					'permission_callback' => array( __CLASS__, 'can_submit' ),
					'args'                => array(
						'title'    => array(
							'type'              => 'string',
							'required'          => true,
							'sanitize_callback' => array( __CLASS__, 'clean_title' ),
						),
						'initials' => array(
							'type'              => 'string',
							'required'          => true,
							'sanitize_callback' => array( 'JAT_Arcade_Rest', 'clean_initials' ),
						),
						'code'     => array(
							'type'              => 'string',
							'required'          => true,
							'validate_callback' => array( __CLASS__, 'valid_code' ),
						),
					),
				),
			)
		);
		register_rest_route(
			JAT_Arcade_Rest::NS,
			'/levels/(?P<id>\d+)/play',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'count_play' ),
				'permission_callback' => array( __CLASS__, 'nonce_ok' ),
				'args'                => array(
					'id' => array(
						'type'              => 'integer',
						'required'          => true,
						'sanitize_callback' => 'absint',
					),
				),
			)
		);
	}

	/**
	 * Letters, digits, spaces and simple punctuation, 40 characters at most.
	 *
	 * @param mixed $value Raw title.
	 * @return string
	 */
	public static function clean_title( $value ) {
		$v = sanitize_text_field( (string) $value );
		$v = preg_replace( '/[^\p{L}\p{N} \'!?.,&-]/u', '', $v );
		$v = trim( mb_substr( (string) $v, 0, 40 ) );
		return '' === $v ? 'Untitled' : $v;
	}

	/**
	 * Every write must carry a valid wp_rest nonce.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return true|WP_Error
	 */
	public static function nonce_ok( $request ) {
		$nonce = (string) $request->get_header( 'X-WP-Nonce' );
		if ( '' === $nonce || ! wp_verify_nonce( $nonce, 'wp_rest' ) ) {
			return new WP_Error( 'jat_arcade_bad_nonce', __( 'Your session expired. Reload the page and try again.', 'jat-arcade-archives' ), array( 'status' => 403 ) );
		}
		return true;
	}

	/**
	 * Permission check for publishing a level: nonce, then the site owner's setting.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return true|WP_Error
	 */
	public static function can_submit( $request ) {
		$ok = self::nonce_ok( $request );
		if ( true !== $ok ) {
			return $ok;
		}
		$who = jat_arcade_settings()['levels'];
		if ( 'nobody' === $who ) {
			return new WP_Error( 'jat_arcade_closed', __( 'The gallery is not taking new levels on this site.', 'jat-arcade-archives' ), array( 'status' => 403 ) );
		}
		if ( 'members' === $who && ! current_user_can( 'read' ) ) {
			return new WP_Error( 'jat_arcade_login', __( 'Log in to publish levels on this site.', 'jat-arcade-archives' ), array( 'status' => 401 ) );
		}
		return true;
	}

	/**
	 * GET handler: approved levels.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response
	 */
	public static function get_levels( $request ) {
		$res = rest_ensure_response( self::approved( $request['sort'], 60 ) );
		$res->header( 'Cache-Control', 'no-store' );
		return $res;
	}

	/**
	 * Approved levels for the gallery.
	 *
	 * @param string $sort  'new' or 'popular'.
	 * @param int    $limit Rows.
	 * @return array
	 */
	public static function approved( $sort = 'new', $limit = 60 ) {
		global $wpdb;
		$table = self::table();
		$order = 'popular' === $sort ? 'plays DESC, id DESC' : 'id DESC';
		$key   = 'levels:' . $sort . ':' . $limit . ':' . wp_cache_get_last_changed( 'jat_arcade_levels' );
		$rows  = wp_cache_get( $key, 'jat_arcade_levels' );
		if ( false === $rows ) {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- custom table, order is one of two fixed strings, cached above.
			$rows = $wpdb->get_results( $wpdb->prepare( "SELECT id, title, initials, code, plays, created_at FROM {$table} WHERE status = 'approved' ORDER BY {$order} LIMIT %d", $limit ), ARRAY_A );
			wp_cache_set( $key, $rows, 'jat_arcade_levels', HOUR_IN_SECONDS );
		}
		return array_map(
			static function ( $r ) {
				return array(
					'id'       => (int) $r['id'],
					'title'    => (string) $r['title'],
					'initials' => (string) $r['initials'],
					'code'     => (string) $r['code'],
					'plays'    => (int) $r['plays'],
					'date'     => gmdate( 'c', strtotime( $r['created_at'] . ' UTC' ) ),
				);
			},
			(array) $rows
		);
	}

	/**
	 * POST handler: publish a level (into the moderation queue unless moderation is off).
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function post_level( $request ) {
		global $wpdb;
		$s       = jat_arcade_settings();
		$visitor = substr( wp_hash( JAT_Arcade_Rest::client_ip() . '|' . get_current_user_id(), 'nonce' ), 0, 16 );
		$key     = 'jat_arcade_lv_' . $visitor;
		$count   = (int) get_transient( $key );
		if ( $count >= 5 ) {
			return new WP_Error( 'jat_arcade_slow', __( 'You have published several levels already. Try again in an hour.', 'jat-arcade-archives' ), array( 'status' => 429 ) );
		}
		set_transient( $key, $count + 1, HOUR_IN_SECONDS );

		$status = $s['moderate'] && ! current_user_can( 'moderate_comments' ) ? 'pending' : 'approved';
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
		$ok = $wpdb->insert(
			self::table(),
			array(
				'title'      => $request['title'],
				'initials'   => $request['initials'],
				'code'       => $request['code'],
				'status'     => $status,
				'user_id'    => get_current_user_id(),
				'visitor'    => $visitor,
				'created_at' => current_time( 'mysql', true ),
			),
			array( '%s', '%s', '%s', '%s', '%d', '%s', '%s' )
		);
		if ( false === $ok ) {
			return new WP_Error( 'jat_arcade_db', __( 'The level could not be saved.', 'jat-arcade-archives' ), array( 'status' => 500 ) );
		}
		wp_cache_set_last_changed( 'jat_arcade_levels' );
		return rest_ensure_response( array( 'status' => $status ) );
	}

	/**
	 * POST handler: count a play (once per visitor per level per day).
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response
	 */
	public static function count_play( $request ) {
		global $wpdb;
		$id      = (int) $request['id'];
		$visitor = substr( wp_hash( JAT_Arcade_Rest::client_ip() . '|' . get_current_user_id(), 'nonce' ), 0, 16 );
		$key     = 'jat_arcade_pl_' . md5( $visitor . '|' . $id );
		if ( ! get_transient( $key ) ) {
			set_transient( $key, 1, DAY_IN_SECONDS );
			$table = self::table();
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- custom table.
			$wpdb->query( $wpdb->prepare( "UPDATE {$table} SET plays = plays + 1 WHERE id = %d AND status = 'approved'", $id ) );
			wp_cache_set_last_changed( 'jat_arcade_levels' );
		}
		return rest_ensure_response( array( 'ok' => true ) );
	}

	/**
	 * Levels for the admin screen.
	 *
	 * @param string $status 'pending' or 'approved'.
	 * @return array
	 */
	public static function by_status( $status ) {
		global $wpdb;
		$table = self::table();
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- custom table, admin-only listing.
		return (array) $wpdb->get_results( $wpdb->prepare( "SELECT id, title, initials, code, plays, created_at FROM {$table} WHERE status = %s ORDER BY id DESC LIMIT 200", $status ), ARRAY_A );
	}

	/**
	 * Approve or delete one level.
	 *
	 * @param int    $id     Level id.
	 * @param string $action 'approve' or 'delete'.
	 */
	public static function moderate( $id, $action ) {
		global $wpdb;
		if ( 'approve' === $action ) {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery
			$wpdb->update( self::table(), array( 'status' => 'approved' ), array( 'id' => $id ), array( '%s' ), array( '%d' ) );
		} elseif ( 'delete' === $action ) {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery
			$wpdb->delete( self::table(), array( 'id' => $id ), array( '%d' ) );
		}
		wp_cache_set_last_changed( 'jat_arcade_levels' );
	}
}
