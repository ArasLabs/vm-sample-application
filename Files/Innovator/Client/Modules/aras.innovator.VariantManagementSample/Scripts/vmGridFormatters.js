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
		className: 'vm-aras-grid-row-cell',
		children: [
			{
				tag: 'label',
				className: 'vm-aras-grid-row-cell-text-boolean ' + textBooleanCssClassName,
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

	iconTextTemplate.className = 'vm-aras-grid-row-cell';

	return iconTextTemplate;
};

window.Grid.formatters.vm_iconTextBoolean = function(headId, rowId, value, grid, metadata) {
	const iconNodeTemplate = window.Grid.formatters.vm_iconText(headId, rowId, '', grid, metadata).children[0];
	const textBooleanTemplate = window.Grid.formatters.vm_textBoolean(headId, rowId, value, grid, metadata);

	textBooleanTemplate.children.unshift(iconNodeTemplate);

	return textBooleanTemplate;
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
 * @returns {Object} - a cell formatter template
 */
window.Grid.formatters.multipleBooleanValuesSelection = function(headId, rowId, booleanValueByKeyHash, grid, metadata) {
	const applyEdit = function(e) {
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
	};

	const booleanElementTemplates = [];

	const keys = Object.keys(booleanValueByKeyHash);
	keys.forEach(function(key, keyIndex) {
		const booleanValue = booleanValueByKeyHash[key];

		// Checked values representation in grid cell should have gray background color
		const valueCellBackgroundClassName = booleanValue ? ' vm-aras-grid-row-cell-multiple-boolean-values-selection__value_background-color_gray' : '';

		// Border between generated cells inside grid cell consists of two borders - right border from the previous cell and left from the next cell
		// Left border should not be present in the first generated cell inside grid cell
		const valueCellLeftBorderClassName = keyIndex !== 0 ? ' vm-aras-grid-row-cell-multiple-boolean-values-selection__value_border-left' : '';

		// Right border should not be present in the last generated cell inside grid cell
		const valueCellRightBorderClassName = keyIndex !== keys.length - 1 ? ' vm-aras-grid-row-cell-multiple-boolean-values-selection__value_border-right' : '';

		// Generated cells inside grid cell, when it was clicked should receive border
		const valueCellFocusedClassName = metadata.focusedBoolean.headId === headId &&
			metadata.focusedBoolean.rowId === rowId &&
			metadata.focusedBoolean.key === key ? ' vm-aras-grid-row-cell-multiple-boolean-values-selection__value_focused' : '';

		booleanElementTemplates.push(
			{
				tag: 'label',
				className: 'vm-aras-grid-row-cell-multiple-boolean-values-selection__value' +
					valueCellBackgroundClassName +
					valueCellLeftBorderClassName +
					valueCellRightBorderClassName +
					valueCellFocusedClassName,
				children: [
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
				]
			}
		);
	});

	return {
		className: 'vm-aras-grid-row-cell-multiple-boolean-values-selection-wrapper',
		children: [
			{
				tag: 'span',
				className: 'vm-aras-grid-row-cell-multiple-boolean-values-selection',
				children: booleanElementTemplates
			}
		]
	};
};
