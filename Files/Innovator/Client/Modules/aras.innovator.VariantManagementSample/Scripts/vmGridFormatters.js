/**
 * Defines the formatter for displaying a text and a boolean data representation along in a grid cell
 *
 * @param {string} headId - a head ID of a grid cell
 * @param {string} rowId - a row ID of a grid cell
 * @param {Object} value - a value object to be displayed in a grid cell
 * @param {string} value.text - a text to be displayed in a grid cell
 * @param {boolean} value.isChecked - a boolean input state to be set in a grid cell
 * @param {Grid} grid - a parent Grid of a grid cell
 * @param {?Object} metadata - additional data for the formatter
 * @param {string} [metadata.type='checkbox'] - a form of boolean data representation either 'checkbox' or 'radio'
 * @param {string} [metadata.textBooleanCssClassName] - a CSS class name to be added to the top formatter DOM element
 * @param {string} [metadata.getBooleanCssClassName] - a function providing a CSS class name to be added to a boolean input
 * @param {function(headId, rowId, grid)} [metadata.isDisabled] - a function providing a boolean input state
 * @returns {Object} - a cell formatter template
 */
window.Grid.formatters.vm_textBoolean = function(headId, rowId, value, grid, metadata) {
	const defaultBooleanPositioningCssClassName = 'vm-aras-grid-row-cell-text-boolean_boolean-alignment_left';

	const applyEdit = function(e) {
		const isDisabled =
			!grid.view.defaultSettings.editable ||
			!grid.checkEditAvailability(headId, rowId, grid);

		if (!isDisabled) {
			grid.dom.dispatchEvent(
				new CustomEvent('applyEdit', {
					detail: {
						headId: headId,
						rowId: rowId,
						dataId: rowId,
						propName: headId,
						value: {
							isChecked: e.target.checked,
							text: value.text
						}
					}
				})
			);
		} else {
			e.preventDefault();
		}
	};

	let booleanType = metadata && metadata.type;

	if (booleanType !== 'checkbox' && booleanType !== 'radio') {
		booleanType = 'checkbox';
	}

	let getTextBooleanCssClassName = function(headId, rowId, value, grid, metadata) {
		return defaultBooleanPositioningCssClassName;
	};

	getTextBooleanCssClassName = metadata && metadata.getTextBooleanCssClassName || getTextBooleanCssClassName;

	const textBooleanCssClassName = getTextBooleanCssClassName(headId, rowId, value, grid, metadata);

	return {
		children: [
			{
				tag: 'label',
				className: 'vm-aras-grid-row-cell vm-aras-grid-row-cell-text-boolean ' + textBooleanCssClassName,
				children: [
					{
						tag: 'span',
						className: 'vm-aras-grid-row-cell-text-boolean__text',
						children: [value.text]
					},
					{
						tag: 'span',
						className: 'vm-aras-grid-row-cell-text-boolean__boolean-container',
						children: [
							{
								tag: 'input',
								className: 'vm-aras-grid-row-cell-text-boolean__' + booleanType,
								attrs: {
									type: 'checkbox',
									onClick: applyEdit,
									checked: !!value.isChecked,
									disabled: metadata && metadata.isDisabled ? metadata.isDisabled(headId, rowId, grid) : false
								}
							},
							{
								tag: 'span',
								className: metadata && metadata.getBooleanCssClassName && metadata.getBooleanCssClassName(headId, rowId, value, grid, metadata)
							}
						]
					}
				]
			}
		]
	};
};

/**
 * Defines the formatter for displaying an icon in a grid cell
 *
 * @param {string} headId - a head ID of a grid cell
 * @param {string} rowId - a row ID of a grid cell
 * @param {Object} value - URL of an image being used for displaying an icon
 * @param {Grid} grid - a parent Grid of a grid cell
 * @param {?Object} metadata - additional data for the formatter
 * @param {string} [metadata.onMouseOverHandler] - handler, that will be fired when icon is hovered
 * @param {string} [metadata.onMouseOutHandler] - handler, that will be fired when icon is no longer hovered
 * @returns {Object} - a cell formatter template
 */
window.Grid.formatters.vm_icon = function(headId, rowId, value, grid, metadata) {
	if (!value) {
		return {};
	}

	const events = {};

	if (metadata) {
		events.onmouseover = metadata.onMouseOverHandler;
		events.onmouseout = metadata.onMouseOutHandler;
	}

	return {
		className: 'vm-aras-grid-row-cell_padding_0',
		children: [
			{
				tag: 'div',
				className: 'vm-aras-grid-row-cell vm-aras-grid-row-cell-icon',
				children: [
					{
						tag: 'img',
						className: 'vm-aras-grid-row-cell-icon__icon',
						attrs: {
							src: value
						},
						events: events
					}
				]
			}
		]
	};
};

/**
 * Defines the formatter for displaying an icon and text data in a grid cell
 *
 * @param {string} headId - a head ID of a grid cell
 * @param {string} rowId - a row ID of a grid cell
 * @param {string} value - a text value to be displayed in a grid cell
 * @param {Grid} grid - a parent Grid of a grid cell
 * @param {?Object} metadata - additional data for the formatter
 * @param {string} [metadata.iconUrl] - URL of an image being used for displaying an icon
 * @param {string} [metadata.iconClass] - a CSS class name to be added to a DOM element with the icon
 * @returns {Object} - a cell formatter template
 */
window.Grid.formatters.vm_iconText = function(headId, rowId, value, grid, metadata) {
	if (metadata && typeof metadata.iconClass !== 'string') {
		metadata.iconClass = 'vm-aras-grid-row-cell-icon-text__icon';
	}

	const iconTextTemplate = window.Grid.formatters.dynamicTreeGrid_iconText(headId, rowId, value, grid, metadata);

	iconTextTemplate.children[1].className = 'vm-aras-grid-row-cell-icon-text__text';

	return {
		children: [
			{
				tag: 'div',
				className: 'vm-aras-grid-row-cell',
				children: iconTextTemplate.children
			}
		]
	};
};

window.Grid.formatters.vm_iconTextBoolean = function(headId, rowId, value, grid, metadata) {
	const iconNodeTemplate = window.Grid.formatters.vm_iconText(headId, rowId, '', grid, metadata);
	const textBooleanTemplate = window.Grid.formatters.vm_textBoolean(headId, rowId, value, grid, metadata);

	// Replace text node from vm_iconText formatter with textBoolean node
	iconNodeTemplate.children[0].children[1] = textBooleanTemplate.children[0];

	return iconNodeTemplate;
};

/**
 * Defines the formatter for displaying multiple boolean values representation in a grid cell
 *
 * @param {string} headId - a head ID of a grid cell
 * @param {string} rowId - a row ID of a grid cell
 * @param {Object} booleanValueByKeyHash - a value object to be displayed in a grid cell
 * @param {Grid} grid - a parent Grid of a grid cell
 * @param {Object} metadata - additional data for the formatter
 * @param {Object} metadata.focusedBoolean - focused boolean value representation in a grid cell
 * @param {string} metadata.focusedBoolean.headId - a head ID of the focused boolean value representation
 * @param {string} metadata.focusedBoolean.rowId - a row ID of the focused boolean value representation
 * @param {string} metadata.focusedBoolean.key - a key in the focused boolean value representation
 * @param {boolean} [metadata.isBooleanValuesSelectionAvailable=true] - flag, representing whether selection of boolean value is available or not
 * @returns {Object} - a cell formatter template
 */
window.Grid.formatters.vm_multipleBooleanValuesSelection = function(headId, rowId, booleanValueByKeyHash, grid, metadata) {
	const applyEdit = function(e) {
		const isDisabled =
			!grid.view.defaultSettings.editable ||
			!grid.checkEditAvailability(headId, rowId, grid);

		if (!isDisabled) {
			const key = e.target.value;

			booleanValueByKeyHash[key] = e.target.checked;

			// Same metadata object should be passed to formatter each time
			// in order to get updated info about focused square
			metadata.focusedBoolean.headId = headId;
			metadata.focusedBoolean.rowId = rowId;
			metadata.focusedBoolean.key = key;

			grid.dom.dispatchEvent(
				new CustomEvent('applyEdit', {
					detail: {
						headId: headId,
						rowId: rowId,
						dataId: rowId,
						propName: headId,
						value: booleanValueByKeyHash
					}
				})
			);
		} else {
			e.preventDefault();
		}
	};

	const isBooleanValuesSelectionAvailable = typeof metadata.isBooleanValuesSelectionAvailable === 'boolean' ? metadata.isBooleanValuesSelectionAvailable : true;

	const booleanElementTemplates = [];

	const keys = Object.keys(booleanValueByKeyHash);
	// In order to fix known bug in IE "flex-basis doesn't account for box-sizing: border-box"
	// https://github.com/philipwalton/flexbugs#7-flex-basis-doesnt-account-for-box-sizingborder-box
	// flex-basis property of vm-aras-grid-row-cell-multiple-boolean-values-selection__value is set to auto.
	// This style is used to properly calculate width of boolean value elements inside grid cell.
	const booleanElementWidthStyle = 'width: calc(100% / ' + keys.length + ');';

	keys.forEach(function(key, keyIndex) {
		const booleanValue = booleanValueByKeyHash[key];

		// Checked values representation in grid cell should have gray background color
		const valueCellBackgroundClassName = isBooleanValuesSelectionAvailable && booleanValue ?
			' vm-aras-grid-row-cell-multiple-boolean-values-selection__value_background-color_gray' : '';

		// Border between generated cells inside grid cell consists of two borders - right border from the previous cell and left from the next cell
		// Left border should not be present in the first generated cell inside grid cell
		const valueCellLeftBorderClassName = keyIndex !== 0 ? ' vm-aras-grid-row-cell-multiple-boolean-values-selection__value_border-left' : '';

		// Right border should not be present in the last generated cell inside grid cell
		const valueCellRightBorderClassName = keyIndex !== keys.length - 1 ? ' vm-aras-grid-row-cell-multiple-boolean-values-selection__value_border-right' : '';

		// Generated cells inside grid cell, when it was clicked should receive border
		const valueCellFocusedClassName = metadata.focusedBoolean.headId === headId &&
			metadata.focusedBoolean.rowId === rowId &&
			metadata.focusedBoolean.key === key ? ' vm-aras-grid-row-cell-multiple-boolean-values-selection__value_focused' : '';

		const booleanElementTemplateChildren = isBooleanValuesSelectionAvailable ?
			[
				{
					tag: 'input',
					className: 'vm-aras-grid-row-cell-multiple-boolean-values-selection__value-checkbox',
					attrs: {
						type: 'checkbox',
						onClick: applyEdit,
						checked: booleanValue,
						value: key
					}
				},
				{
					tag: 'span'
				}
			] : null;

		booleanElementTemplates.push(
			{
				tag: 'label',
				className: 'vm-aras-grid-row-cell-multiple-boolean-values-selection__value' +
					valueCellBackgroundClassName +
					valueCellLeftBorderClassName +
					valueCellRightBorderClassName +
					valueCellFocusedClassName,
				style: booleanElementWidthStyle,
				children: booleanElementTemplateChildren
			}
		);
	});

	const selectionAreaUnavailableClassName = isBooleanValuesSelectionAvailable ? '' : ' vm-aras-grid-row-cell-multiple-boolean-values-selection_unavailable';

	return {
		className: 'vm-aras-grid-row-cell_padding_0',
		children: [
			{
				tag: 'span',
				className: 'vm-aras-grid-row-cell-multiple-boolean-values-selection' + selectionAreaUnavailableClassName,
				children: booleanElementTemplates
			}
		]
	};
};

/**
 * Defines the formatter for displaying subheaders in a grid search row cell
 *
 * @param {string} head - a data object to render header cell
 * @param {string} headId - a head ID of a grid cell
 * @param {*} value - grid cell value, it is not used by this formatter
 * @param {Grid} grid - a parent Grid of a grid cell
 * @param {Object} metadata - additional data for the formatter
 * @param {string[]} metadata.subheaders - Array containing subheader names
 * @param {number} metadata.subheaderHeight - subheaders height in pixels
 * @param {number} [metadata.subheaderIndexToHighlight] - subheader index to highlight
 * @returns {Object} - a cell formatter template
 */
window.Grid.search.vm_subheaders = function(head, headId, value, grid, metadata) {
	const subheaderTemplates = metadata.subheaders.map(function(subheaderText, index) {
		return {
			tag: 'div',
			className: 'vm-aras-grid-row-cell-subheaders__subheader-container ' + metadata.subheaderContainerClassName +
				(metadata.subheaderIndexToHighlight === index ? ' vm-aras-grid-row-cell-subheaders__subheader-container_hovered' : ''),
			children: [
				{
					tag: 'span',
					className: 'vm-aras-grid-row-cell-subheaders__subheader-text ' + metadata.subheaderTextClassName,
					children: [
						subheaderText
					]
				}
			]
		};
	});

	return {
		style: 'height: ' + metadata.subheaderHeight + 'px;',
		children: [
			{
				tag: 'div',
				className: 'vm-aras-grid-row-cell-subheaders',
				children: subheaderTemplates
			}
		]
	};
};
