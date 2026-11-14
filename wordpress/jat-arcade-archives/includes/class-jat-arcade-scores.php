<?php
/**
 * High-score storage: one custom table.
 *
 * @package JAT_Arcade_Archives
 */

defined( 'ABSPATH' ) || exit;

/**
 * Score table access.
 */
class JAT_Arcade_Scores {

	const DB_VERSION = '2';

	/**
	 * Table name with prefix.
	 *
	 * @return string
	 */
	public static function table() {
		global $wpdb;
		return $wpdb->prefix . 'jat_arcade_scores';
	}

	/**
	 * Create or update the table.
	 */
	public static function install() {
		global $wpdb;
		require_once ABSPATH . 'wp-admin/includes/upgrade.php';
		$table   = self::table();
		$charset = $wpdb->get_charset_collate();
		dbDelta(
			"CREATE TABLE {$table} (
				id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
				game varchar(40) NOT NULL,
				initials varchar(3) NOT NULL,
				score bigint(20) unsigned NOT NULL DEFAULT 0,
				user_id bigint(20) unsigned NOT NULL DEFAULT 0,
				visitor char(16) NOT NULL DEFAULT '',
				created_at datetime NOT NULL,
				PRIMARY KEY  (id),
				KEY game_score (game, score),
				KEY created_at (created_at)
			) {$charset};"
		);
		JAT_Arcade_Levels::install_table();
		update_option( 'jat_arcade_db_version', self::DB_VERSION, false );
	}

	/**
	 * Run install again after an update that changed the table.
	 */
	public static function maybe_upgrade() {
		if ( get_option( 'jat_arcade_db_version' ) !== self::DB_VERSION ) {
			self::install();
		}
	}

	/**
	 * Top scores for one game.
	 *
	 * @param string $game   Exhibit id.
	 * @param string $period 'all' or 'daily' (since midnight, site time).
	 * @param int    $limit  Rows.
	 * @return array<int,array{initials:string,score:int,date:string}>
	 */
	public static function top( $game, $period = 'all', $limit = 10 ) {
		global $wpdb;
		$table = self::table();
		$limit = max( 1, min( 100, (int) $limit ) );
		$since = '1970-01-01 00:00:00';
		if ( 'daily' === $period ) {
			$midnight = new DateTimeImmutable( 'today', wp_timezone() );
			$since    = $midnight->setTimezone( new DateTimeZone( 'UTC' ) )->format( 'Y-m-d H:i:s' );
		}
		$key  = 'top:' . md5( $game . '|' . $since . '|' . $limit ) . ':' . wp_cache_get_last_changed( 'jat_arcade_scores' );
		$rows = wp_cache_get( $key, 'jat_arcade_scores' );
		if ( false === $rows ) {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- custom table (name from $wpdb->prefix), cached above.
			$rows = $wpdb->get_results( $wpdb->prepare( "SELECT initials, score, created_at FROM {$table} WHERE game = %s AND created_at >= %s ORDER BY score DESC, id ASC LIMIT %d", $game, $since, $limit ), ARRAY_A );
			wp_cache_set( $key, $rows, 'jat_arcade_scores', HOUR_IN_SECONDS );
		}
		$out = array();
		foreach ( (array) $rows as $r ) {
			$out[] = array(
				'initials' => (string) $r['initials'],
				'score'    => (int) $r['score'],
				'date'     => gmdate( 'c', strtotime( $r['created_at'] . ' UTC' ) ),
			);
		}
		return $out;
	}

	/**
	 * Store a score.
	 *
	 * @param string $game     Exhibit id (already validated).
	 * @param string $initials Up to three characters A-Z, 0-9 or space (already validated).
	 * @param int    $score    Score (already validated).
	 * @param string $visitor  Hashed visitor fingerprint for rate limiting.
	 * @return bool
	 */
	public static function add( $game, $initials, $score, $visitor ) {
		global $wpdb;
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
		$ok = $wpdb->insert(
			self::table(),
			array(
				'game'       => $game,
				'initials'   => $initials,
				'score'      => $score,
				'user_id'    => get_current_user_id(),
				'visitor'    => $visitor,
				'created_at' => current_time( 'mysql', true ),
			),
			array( '%s', '%s', '%d', '%d', '%s', '%s' )
		);
		wp_cache_set_last_changed( 'jat_arcade_scores' );
		return false !== $ok;
	}

	/**
	 * Delete scores: all of them, or one game's.
	 *
	 * @param string $game Exhibit id, or '' for every game.
	 * @return int Rows deleted.
	 */
	public static function clear( $game = '' ) {
		global $wpdb;
		$table = self::table();
		wp_cache_set_last_changed( 'jat_arcade_scores' );
		if ( '' === $game ) {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
			return (int) $wpdb->query( "DELETE FROM {$table}" );
		}
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery
		return (int) $wpdb->delete( $table, array( 'game' => $game ), array( '%s' ) );
	}

	/**
	 * Number of stored scores per game.
	 *
	 * @return array<string,int>
	 */
	public static function counts() {
		global $wpdb;
		$table = self::table();
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		$rows = $wpdb->get_results( "SELECT game, COUNT(*) AS n FROM {$table} GROUP BY game", ARRAY_A );
		$out  = array();
		foreach ( (array) $rows as $r ) {
			$out[ $r['game'] ] = (int) $r['n'];
		}
		return $out;
	}
}
