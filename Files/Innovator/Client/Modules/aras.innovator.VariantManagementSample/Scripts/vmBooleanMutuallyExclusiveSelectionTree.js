(function(window) {
	'use strict';

	const _super = window.VmSelectionTree.prototype;

	function VmBooleanMutuallyExclusiveSelectionTree(containerElement) {
		_super.constructor.call(this, containerElement);

		this._rowIdsByUniqueElementId = new Map();

		this._selectedRowIds = new Set();
	}

	VmBooleanMutuallyExclusiveSelectionTree.prototype = Object.assign(Object.create(_super), {
		constructor: VmBooleanMutuallyExclusiveSelectionTree,

		_rowIdsByUniqueElementId: null,

		_selectedRowIds: null,

		clear: function() {
			_super.clear.call(this);

			this._rowIdsByUniqueElementId.clear();

			this._selectedRowIds.clear();
		},

		_init: function() {
			return _super._init.call(this)
				.then(function() {
					this._treeGrid.on('applyEdit', this._onChangeSelectionHandler.bind(this));
				}.bind(this));
		},

		getSelectedRowIds: function() {
			return Array.from(this._selectedRowIds);
		},

		getRowData: function(rowId) {
			const rowObject = this._treeGrid.getCellValue(rowId);
			const gridRowData = rowObject.dynamicTreeGridRowData;

			return {
				row: gridRowData.rowInfo,
				parentId: gridRowData.parentId
			};
		},

		_addRowsRecursively: function(rows, parentId) {
			const addedRowIds = _super._addRowsRecursively.call(this, rows, parentId);

			addedRowIds.forEach(function(rowId, index) {
				const uniqueElementId = rows[index].uniqueElementId;
				let elementRowIds = this._rowIdsByUniqueElementId.get(uniqueElementId);

				if (!elementRowIds) {
					elementRowIds = new Set();
					this._rowIdsByUniqueElementId.set(uniqueElementId, elementRowIds);
				}

				elementRowIds.add(rowId);
			}.bind(this));

			return addedRowIds;
		},

		_onChangeSelectionHandler: function(event) {
			const detail = event.detail;
			const headId = detail.headId;
			const rowId = detail.rowId;
			const isChecked = detail.value.isChecked;

			const checkedPropertyName = 'isChecked';

			const setCellObjectValue = function(rowId, headId, property, value) {
				const cellObjectValue = this._treeGrid.getCellValue(rowId, headId);
				cellObjectValue[property] = value;
				this._treeGrid.setCellValue(rowId, headId, cellObjectValue);
			}.bind(this);

			const setCellSelectionState = function(rowId, headId, isChecked) {
				setCellObjectValue(rowId, headId, checkedPropertyName, isChecked);

				if (isChecked) {
					this._selectedRowIds.add(rowId);
				} else {
					this._selectedRowIds.delete(rowId);
				}
			}.bind(this);

			const handleSiblingsAndParentRowBooleanValue = function(rowId, headId, isChecked) {
				const parentId = this._treeGrid.getParentId(rowId);

				if (isChecked) {
					this._treeGrid.getChildRowIds(parentId).forEach(function(id) {
						setCellSelectionState(id, headId, false);
					});
				}

				setCellSelectionState(parentId, headId, isChecked);
				setCellSelectionState(rowId, headId, isChecked);
			}.bind(this);

			const uniqueElementId = this._treeGrid.rows.get(rowId).dynamicTreeGridRowData.rowInfo.uniqueElementId;
			const elementRowIds = this._rowIdsByUniqueElementId.get(uniqueElementId);

			elementRowIds.forEach(function(rowId) {
				handleSiblingsAndParentRowBooleanValue(rowId, headId, isChecked);
			});

			this._treeGrid.treeGrid.dom.dispatchEvent(new CustomEvent('vmBooleanTreeSelectionChange'));
		}
	});

	Object.defineProperty(VmBooleanMutuallyExclusiveSelectionTree, 'createInstance', {
		value: function(containerElement) {
			const selectionTree = new VmBooleanMutuallyExclusiveSelectionTree(containerElement);

			return selectionTree
				._init()
				.then(function() {
					return selectionTree;
				});
		}
	});

	window.VmBooleanMutuallyExclusiveSelectionTree = VmBooleanMutuallyExclusiveSelectionTree;
}(window));
