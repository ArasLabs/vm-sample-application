(function(window) {
	'use strict';

	const GRID_COLUMN_NAMES = {
		label: 'label'
	};

	function VmSelectionTree(containerElement) {
		this._containerElement = containerElement;
	}

	VmSelectionTree.prototype = {
		constructor: VmSelectionTree,

		_containerElement: null,

		_treeGrid: null,

		populate: function(rows) {
			this.clear();

			this._buildTree(rows);
		},

		clear: function() {
			this._treeGrid.removeAllRows();
		},

		getAllRowIds: function() {
			return this._treeGrid.getAllRowIds();
		},

		getChildRowIds: function(parentId) {
			return this._treeGrid.getChildRowIds(parentId);
		},

		expandBranches: function(rowIds) {
			return this._treeGrid.treeGrid.expandBranches(rowIds);
		},

		expandAll: function() {
			this._treeGrid.expandAll();
		},

		collapseAll: function() {
			this._treeGrid.collapseAll();
		},

		on: function(type, eventListener) {
			this._treeGrid.on(type, eventListener);
		},

		_addRowsRecursively: function(rows, parentId) {
			const rowIds = this._treeGrid.addRows(rows, parentId);

			rowIds.forEach(function(rowId, index) {
				const rowObject = rows[index];

				const cellMetadata = this.defineMetadata(rowId, GRID_COLUMN_NAMES.label, rowObject);

				this._treeGrid.setCellMetadata(rowId, GRID_COLUMN_NAMES.label, cellMetadata);

				const childRows = rowObject.children;

				if (childRows && childRows.length) {
					this._addRowsRecursively(childRows, rowId);
				}
			}.bind(this));

			return rowIds;
		},

		defineMetadata: function(rowId, headId, rowObject) {
			return rowObject.metadata;
		},

		_init: function() {
			const options = {
				draggableColumns: false,
				disableXLazyRendering: true
			};

			this._treeGrid = new window.DynamicTreeGrid(this._containerElement, options);

			this._treeGrid.obtainRowId = function(rowObj) {
				return rowObj.id;
			};

			this._treeGrid.treeGrid.getEditorType = function() {
				return 'nonEditable';
			};

			const columns = [
				{
					name: GRID_COLUMN_NAMES.label
				}
			];

			this._treeGrid.loadData(null, columns);

			return this._treeGrid.render();
		},

		_buildTree: function(rows) {
			this._addRowsRecursively(rows);
		}
	};

	Object.defineProperty(VmSelectionTree, 'createInstance', {
		value: function(containerElement) {
			const selectionTree = new VmSelectionTree(containerElement);

			return selectionTree
				._init()
				.then(function() {
					return selectionTree;
				});
		}
	});

	window.VmSelectionTree = VmSelectionTree;
}(window));
