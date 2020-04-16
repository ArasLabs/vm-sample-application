(function(window) {
	'use strict';

	function VmValidationResultGrid(parameters) {
		this._aras = parameters.aras;

		this._grid = this._createGridControl(parameters.gridContainerElement);
	}

	VmValidationResultGrid.prototype = {
		constructor: VmValidationResultGrid,

		_aras: null,

		_grid: null,

		_vmSampleModuleSolutionBasedRelativePath: '../Modules/aras.innovator.VariantManagementSample',

		populate: function(rows) {
			this._grid.rows = rows;
		},

		_createGridControl: function(gridContainerElement) {
			const columns = [
				{name: 'type', resource: 'type_column_label', width: 126},
				{name: 'result', resource: 'result_column_label', width: 75},
				{name: 'message', resource: 'message_column_label', width: 560}
			];
			const head = new Map();

			columns.forEach(function(column) {
				head.set(column.name, {
					label: this._aras.getResource(
						this._vmSampleModuleSolutionBasedRelativePath,
						'variability_item.validation_page.validation_result_grid.' + column.resource
					),
					width: column.width
				});
			}.bind(this));

			const grid = new window.Grid(gridContainerElement);
			grid.rows = new Map();
			grid.head = head;

			return grid;
		}
	};

	window.VmValidationResultGrid = VmValidationResultGrid;
}(window));
