/* JAT Arcade Archives block (no build step: plain wp.* globals). */
(function (wp) {
	var el = wp.element.createElement;
	var __ = wp.i18n.__;
	var InspectorControls = wp.blockEditor.InspectorControls;
	var useBlockProps = wp.blockEditor.useBlockProps;
	var PanelBody = wp.components.PanelBody;
	var SelectControl = wp.components.SelectControl;
	var TextControl = wp.components.TextControl;
	var Placeholder = wp.components.Placeholder;
	var exhibits = (window.jatArcadeBlock && window.jatArcadeBlock.exhibits) || [];

	wp.blocks.registerBlockType('jat-arcade/museum', {
		edit: function (props) {
			var a = props.attributes;
			var set = props.setAttributes;
			var start = exhibits.filter(function (e) { return e.value === a.exhibit; })[0];
			return el('div', useBlockProps(),
				el(InspectorControls, null,
					el(PanelBody, { title: __('Museum', 'jat-arcade-archives') },
						el(SelectControl, {
							label: __('Mode', 'jat-arcade-archives'), value: a.mode,
							options: [{ value: '3d', label: __('3D museum', 'jat-arcade-archives') }, { value: '2d', label: __('2D arcade (lighter)', 'jat-arcade-archives') }],
							onChange: function (v) { set({ mode: v }); }
						}),
						el(SelectControl, {
							label: __('Start at', 'jat-arcade-archives'), value: a.exhibit,
							options: [{ value: '', label: __('The entrance', 'jat-arcade-archives') }].concat(exhibits),
							onChange: function (v) { set({ exhibit: v }); }
						}),
						el(TextControl, {
							label: __('Height', 'jat-arcade-archives'), value: a.height,
							help: __('For example 80vh or 640px. Leave empty for the default.', 'jat-arcade-archives'),
							onChange: function (v) { set({ height: v }); }
						})
					)
				),
				el(Placeholder, {
					icon: 'games',
					label: __('JAT Arcade Archives', 'jat-arcade-archives'),
					instructions: (a.mode === '2d' ? __('2D arcade', 'jat-arcade-archives') : __('3D museum', 'jat-arcade-archives')) +
						' · ' + (start ? start.label : __('starts at the entrance', 'jat-arcade-archives')) +
						'. ' + __('The playable museum appears on the published page.', 'jat-arcade-archives')
				})
			);
		},
		save: function () { return null; }
	});
})(window.wp);
