<?php
/**
 * Remove the plugin's table and options when it is deleted from the Plugins screen.
 *
 * @package JAT_Arcade_Archives
 */

defined( 'WP_UNINSTALL_PLUGIN' ) || exit;

global $wpdb;
// phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.DirectDatabaseQuery.SchemaChange
$wpdb->query( "DROP TABLE IF EXISTS {$wpdb->prefix}jat_arcade_scores" );
delete_option( 'jat_arcade_settings' );
delete_option( 'jat_arcade_db_version' );
