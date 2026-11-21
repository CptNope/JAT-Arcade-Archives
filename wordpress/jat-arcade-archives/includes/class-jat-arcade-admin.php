<?php
/**
 * Settings › JAT Arcade: options, score management and embed help.
 *
 * Every request that changes data goes through either options.php (the Settings API checks its own
 * nonce and the manage_options capability) or admin-post.php, where the handler below checks a nonce
 * and manage_options before reading any input.
 *
 * @package JAT_Arcade_Archives
 */

defined( 'ABSPATH' ) || exit;

/**
 * Admin screens.
 */
class JAT_Arcade_Admin {

	const PAGE = 'jat-arcade';

	/**
	 * Hooks.
	 */
	public static function init() {
		add_action( 'admin_menu', array( __CLASS__, 'menu' ) );
		add_action( 'admin_init', array( __CLASS__, 'settings' ) );
		add_action( 'admin_post_jat_arcade_clear_scores', array( __CLASS__, 'clear_scores' ) );
		add_action( 'admin_post_jat_arcade_moderate_level', array( __CLASS__, 'moderate_level' ) );
		add_filter( 'plugin_action_links_' . plugin_basename( JAT_ARCADE_FILE ), array( __CLASS__, 'action_links' ) );
	}

	/**
	 * Settings link on the Plugins screen.
	 *
	 * @param string[] $links Links.
	 * @return string[]
	 */
	public static function action_links( $links ) {
		array_unshift( $links, '<a href="' . esc_url( admin_url( 'options-general.php?page=' . self::PAGE ) ) . '">' . esc_html__( 'Settings', 'jat-arcade-archives' ) . '</a>' );
		return $links;
	}

	/**
	 * Menu entry.
	 */
	public static function menu() {
		add_options_page(
			__( 'JAT Arcade Archives', 'jat-arcade-archives' ),
			__( 'JAT Arcade', 'jat-arcade-archives' ),
			'manage_options',
			self::PAGE,
			array( __CLASS__, 'render' )
		);
	}

	/**
	 * Settings API registration.
	 */
	public static function settings() {
		register_setting(
			'jat_arcade',
			'jat_arcade_settings',
			array(
				'type'              => 'array',
				'sanitize_callback' => array( __CLASS__, 'sanitize' ),
				'default'           => array(),
			)
		);
	}

	/**
	 * Sanitize the options array.
	 *
	 * @param mixed $in Raw input from options.php.
	 * @return array
	 */
	public static function sanitize( $in ) {
		$in  = is_array( $in ) ? $in : array();
		$out = jat_arcade_settings();
		if ( isset( $in['submit'] ) && in_array( $in['submit'], array( 'everyone', 'members', 'nobody' ), true ) ) {
			$out['submit'] = $in['submit'];
		}
		if ( isset( $in['board_size'] ) ) {
			$out['board_size'] = max( 3, min( 50, absint( $in['board_size'] ) ) );
		}
		if ( isset( $in['rate_limit'] ) ) {
			$out['rate_limit'] = max( 1, min( 200, absint( $in['rate_limit'] ) ) );
		}
		if ( isset( $in['max_score'] ) ) {
			$out['max_score'] = max( 1, min( 2000000000, absint( $in['max_score'] ) ) );
		}
		if ( isset( $in['levels'] ) && in_array( $in['levels'], array( 'everyone', 'members', 'nobody' ), true ) ) {
			$out['levels'] = $in['levels'];
		}
		if ( isset( $in['moderate'] ) ) {
			$out['moderate'] = '1' === (string) $in['moderate'];
		}
		if ( isset( $in['height'] ) ) {
			$h             = sanitize_text_field( $in['height'] );
			$out['height'] = preg_match( '/^\d{2,4}(px|vh|dvh|svh|rem|em)$/', $h ) ? $h : '80vh';
		}
		return $out;
	}

	/**
	 * Handle admin-post.php?action=jat_arcade_clear_scores: delete one game's scores or all of them.
	 */
	public static function clear_scores() {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'You are not allowed to manage scores.', 'jat-arcade-archives' ), '', array( 'response' => 403 ) );
		}
		check_admin_referer( 'jat_arcade_clear_scores' );

		$game = isset( $_POST['game'] ) ? sanitize_key( wp_unslash( $_POST['game'] ) ) : '';
		if ( '' !== $game && ! isset( jat_arcade_exhibits()[ $game ] ) ) {
			$game = 'invalid';
		}
		$n = 'invalid' === $game ? 0 : JAT_Arcade_Scores::clear( $game );
		// The result is shown once on the settings screen, so there are no query arguments to read back.
		set_transient( 'jat_arcade_cleared_' . get_current_user_id(), $n, MINUTE_IN_SECONDS );
		wp_safe_redirect( admin_url( 'options-general.php?page=' . self::PAGE ) );
		exit;
	}

	/**
	 * Handle admin-post.php?action=jat_arcade_moderate_level: approve or delete one gallery level.
	 */
	public static function moderate_level() {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'You are not allowed to moderate levels.', 'jat-arcade-archives' ), '', array( 'response' => 403 ) );
		}
		check_admin_referer( 'jat_arcade_moderate_level' );

		$id     = isset( $_POST['level'] ) ? absint( wp_unslash( $_POST['level'] ) ) : 0;
		$action = isset( $_POST['do'] ) ? sanitize_key( wp_unslash( $_POST['do'] ) ) : '';
		if ( $id && in_array( $action, array( 'approve', 'delete' ), true ) ) {
			JAT_Arcade_Levels::moderate( $id, $action );
		}
		wp_safe_redirect( admin_url( 'options-general.php?page=' . self::PAGE . '#jat-gallery' ) );
		exit;
	}

	/**
	 * A small POST form for one moderation action (nonce-protected).
	 *
	 * @param int    $id     Level id.
	 * @param string $action 'approve' or 'delete'.
	 * @param string $label  Button text.
	 */
	private static function level_form( $id, $action, $label ) {
		?>
		<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" style="display:inline">
			<input type="hidden" name="action" value="jat_arcade_moderate_level">
			<input type="hidden" name="level" value="<?php echo esc_attr( $id ); ?>">
			<input type="hidden" name="do" value="<?php echo esc_attr( $action ); ?>">
			<?php wp_nonce_field( 'jat_arcade_moderate_level' ); ?>
			<button type="submit" class="button<?php echo 'delete' === $action ? ' button-link-delete' : ' button-primary'; ?>"><?php echo esc_html( $label ); ?></button>
		</form>
		<?php
	}

	/**
	 * The settings screen.
	 */
	public static function render() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		$s      = jat_arcade_settings();
		$counts = JAT_Arcade_Scores::counts();
		$all    = jat_arcade_exhibits();
		?>
		<div class="wrap">
			<h1><?php esc_html_e( 'JAT Arcade Archives', 'jat-arcade-archives' ); ?></h1>
			<?php
			$cleared = get_transient( 'jat_arcade_cleared_' . get_current_user_id() );
			if ( false !== $cleared ) :
				delete_transient( 'jat_arcade_cleared_' . get_current_user_id() );
				$cleared = (int) $cleared;
				?>
				<div class="notice notice-success is-dismissible"><p>
					<?php
					/* translators: %s: number of scores deleted */
					echo esc_html( sprintf( _n( '%s score deleted.', '%s scores deleted.', $cleared, 'jat-arcade-archives' ), number_format_i18n( $cleared ) ) );
					?>
				</p></div>
			<?php endif; ?>

			<h2><?php esc_html_e( 'Add the museum to a page', 'jat-arcade-archives' ); ?></h2>
			<p><?php esc_html_e( 'Use the "JAT Arcade Archives" block, or paste a shortcode:', 'jat-arcade-archives' ); ?></p>
			<ul style="list-style:disc;padding-left:20px">
				<li><code>[jat_arcade]</code> — <?php esc_html_e( 'the full 3D museum', 'jat-arcade-archives' ); ?></li>
				<li><code>[jat_arcade exhibit="spacewar" height="600px"]</code> — <?php esc_html_e( 'start at one machine', 'jat-arcade-archives' ); ?></li>
				<li><code>[jat_arcade mode="2d"]</code> — <?php esc_html_e( 'the lightweight 2D arcade', 'jat-arcade-archives' ); ?></li>
				<li><code>[jat_arcade_scores game="spacewar"]</code> — <?php esc_html_e( 'a high-score table (leave out game for every machine)', 'jat-arcade-archives' ); ?></li>
			</ul>
			<p><a class="button" href="<?php echo esc_url( JAT_Arcade_Embed::museum_url() ); ?>" target="_blank" rel="noopener"><?php esc_html_e( 'Open the museum', 'jat-arcade-archives' ); ?></a></p>

			<form method="post" action="options.php">
				<?php settings_fields( 'jat_arcade' ); ?>
				<h2><?php esc_html_e( 'High scores', 'jat-arcade-archives' ); ?></h2>
				<table class="form-table" role="presentation">
					<tr>
						<th scope="row"><label for="jat-submit"><?php esc_html_e( 'Who can save scores', 'jat-arcade-archives' ); ?></label></th>
						<td><select id="jat-submit" name="jat_arcade_settings[submit]">
							<option value="everyone" <?php selected( $s['submit'], 'everyone' ); ?>><?php esc_html_e( 'Every visitor', 'jat-arcade-archives' ); ?></option>
							<option value="members" <?php selected( $s['submit'], 'members' ); ?>><?php esc_html_e( 'Logged-in users only', 'jat-arcade-archives' ); ?></option>
							<option value="nobody" <?php selected( $s['submit'], 'nobody' ); ?>><?php esc_html_e( 'Nobody (scores stay in each visitor\'s browser)', 'jat-arcade-archives' ); ?></option>
						</select></td>
					</tr>
					<tr>
						<th scope="row"><label for="jat-board"><?php esc_html_e( 'Scores per board', 'jat-arcade-archives' ); ?></label></th>
						<td><input id="jat-board" type="number" min="3" max="50" name="jat_arcade_settings[board_size]" value="<?php echo esc_attr( $s['board_size'] ); ?>" class="small-text"></td>
					</tr>
					<tr>
						<th scope="row"><label for="jat-rate"><?php esc_html_e( 'Submissions per visitor per 10 minutes', 'jat-arcade-archives' ); ?></label></th>
						<td><input id="jat-rate" type="number" min="1" max="200" name="jat_arcade_settings[rate_limit]" value="<?php echo esc_attr( $s['rate_limit'] ); ?>" class="small-text"></td>
					</tr>
					<tr>
						<th scope="row"><label for="jat-max"><?php esc_html_e( 'Highest score accepted', 'jat-arcade-archives' ); ?></label></th>
						<td><input id="jat-max" type="number" min="1" name="jat_arcade_settings[max_score]" value="<?php echo esc_attr( $s['max_score'] ); ?>" class="regular-text">
						<p class="description"><?php esc_html_e( 'Scores are sent by the visitor\'s browser, so treat the boards as a bit of fun rather than proof.', 'jat-arcade-archives' ); ?></p></td>
					</tr>
				</table>
				<h2><?php esc_html_e( 'Visitor Gallery', 'jat-arcade-archives' ); ?></h2>
				<table class="form-table" role="presentation">
					<tr>
						<th scope="row"><label for="jat-levels"><?php esc_html_e( 'Who can publish Maker Lab levels', 'jat-arcade-archives' ); ?></label></th>
						<td><select id="jat-levels" name="jat_arcade_settings[levels]">
							<option value="everyone" <?php selected( $s['levels'], 'everyone' ); ?>><?php esc_html_e( 'Every visitor', 'jat-arcade-archives' ); ?></option>
							<option value="members" <?php selected( $s['levels'], 'members' ); ?>><?php esc_html_e( 'Logged-in users only', 'jat-arcade-archives' ); ?></option>
							<option value="nobody" <?php selected( $s['levels'], 'nobody' ); ?>><?php esc_html_e( 'Nobody', 'jat-arcade-archives' ); ?></option>
						</select></td>
					</tr>
					<tr>
						<th scope="row"><?php esc_html_e( 'Approval', 'jat-arcade-archives' ); ?></th>
						<td><input type="hidden" name="jat_arcade_settings[moderate]" value="0">
						<label><input type="checkbox" name="jat_arcade_settings[moderate]" value="1" <?php checked( $s['moderate'] ); ?>> <?php esc_html_e( 'New levels wait for my approval before they appear', 'jat-arcade-archives' ); ?></label></td>
					</tr>
				</table>
				<h2><?php esc_html_e( 'Embed', 'jat-arcade-archives' ); ?></h2>
				<table class="form-table" role="presentation">
					<tr>
						<th scope="row"><label for="jat-height"><?php esc_html_e( 'Default height', 'jat-arcade-archives' ); ?></label></th>
						<td><input id="jat-height" type="text" name="jat_arcade_settings[height]" value="<?php echo esc_attr( $s['height'] ); ?>" class="small-text">
						<p class="description"><?php esc_html_e( 'For example 80vh or 640px.', 'jat-arcade-archives' ); ?></p></td>
					</tr>
				</table>
				<?php submit_button(); ?>
			</form>

			<h2 id="jat-gallery"><?php esc_html_e( 'Gallery levels', 'jat-arcade-archives' ); ?></h2>
			<?php
			foreach ( array(
				'pending'  => __( 'Waiting for approval', 'jat-arcade-archives' ),
				'approved' => __( 'In the gallery', 'jat-arcade-archives' ),
			) as $status => $heading ) :
				$levels = JAT_Arcade_Levels::by_status( $status );
				?>
				<h3><?php echo esc_html( $heading . ' (' . count( $levels ) . ')' ); ?></h3>
				<?php if ( $levels ) : ?>
					<table class="widefat striped" style="max-width:820px">
						<thead><tr><th><?php esc_html_e( 'Title', 'jat-arcade-archives' ); ?></th><th><?php esc_html_e( 'By', 'jat-arcade-archives' ); ?></th><th><?php esc_html_e( 'Plays', 'jat-arcade-archives' ); ?></th><th><?php esc_html_e( 'Try it', 'jat-arcade-archives' ); ?></th><th></th></tr></thead>
						<tbody>
						<?php foreach ( $levels as $lv ) : ?>
							<tr>
								<td><?php echo esc_html( $lv['title'] ); ?></td>
								<td><?php echo esc_html( $lv['initials'] ); ?></td>
								<td><?php echo esc_html( number_format_i18n( (int) $lv['plays'] ) ); ?></td>
								<td><a href="<?php echo esc_url( JAT_Arcade_Embed::museum_url( '2d' ) . '#maker=' . rawurlencode( $lv['code'] ) ); ?>" target="_blank" rel="noopener"><?php esc_html_e( 'Play', 'jat-arcade-archives' ); ?></a></td>
								<td>
									<?php
									if ( 'pending' === $status ) {
										self::level_form( (int) $lv['id'], 'approve', __( 'Approve', 'jat-arcade-archives' ) );
									}
									self::level_form( (int) $lv['id'], 'delete', __( 'Delete', 'jat-arcade-archives' ) );
									?>
								</td>
							</tr>
						<?php endforeach; ?>
						</tbody>
					</table>
				<?php else : ?>
					<p><?php esc_html_e( 'None.', 'jat-arcade-archives' ); ?></p>
				<?php endif; ?>
			<?php endforeach; ?>

			<h2><?php esc_html_e( 'Stored scores', 'jat-arcade-archives' ); ?></h2>
			<?php if ( ! $counts ) : ?>
				<p><?php esc_html_e( 'No scores yet.', 'jat-arcade-archives' ); ?></p>
			<?php else : ?>
				<table class="widefat striped" style="max-width:640px">
					<thead><tr><th><?php esc_html_e( 'Machine', 'jat-arcade-archives' ); ?></th><th><?php esc_html_e( 'Scores', 'jat-arcade-archives' ); ?></th><th></th></tr></thead>
					<tbody>
					<?php foreach ( $counts as $game => $n ) : ?>
						<tr>
							<td><?php echo esc_html( isset( $all[ $game ] ) ? $all[ $game ]['year'] . ' · ' . $all[ $game ]['title'] : $game ); ?></td>
							<td><?php echo esc_html( number_format_i18n( $n ) ); ?></td>
							<td><?php self::clear_form( $game, __( 'Clear', 'jat-arcade-archives' ) ); ?></td>
						</tr>
					<?php endforeach; ?>
					</tbody>
				</table>
				<p><?php self::clear_form( '', __( 'Clear every board', 'jat-arcade-archives' ) ); ?></p>
			<?php endif; ?>
		</div>
		<?php
	}

	/**
	 * A small POST form that clears scores (nonce-protected).
	 *
	 * @param string $game  Exhibit id or '' for all.
	 * @param string $label Button text.
	 */
	private static function clear_form( $game, $label ) {
		?>
		<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" style="display:inline" onsubmit="return confirm('<?php echo esc_js( __( 'Delete these scores? This cannot be undone.', 'jat-arcade-archives' ) ); ?>');">
			<input type="hidden" name="action" value="jat_arcade_clear_scores">
			<input type="hidden" name="game" value="<?php echo esc_attr( $game ); ?>">
			<?php wp_nonce_field( 'jat_arcade_clear_scores' ); ?>
			<button type="submit" class="button<?php echo '' === $game ? ' button-link-delete' : ''; ?>"><?php echo esc_html( $label ); ?></button>
		</form>
		<?php
	}
}
