// jscs:disable requireCamelCaseOrUpperCaseIdentifiers
define([
	'dojo/_base/declare',
	'dojo/_base/connect',
	'dojo/aspect',
	'Aras/Client/Controls/Public/TreeGridContainer',
	'dojox/html/metrics'
],
function(declare, connect, aspect, TreeGridContainer, metrics) {
	metrics.getScrollbar = function() {
		return {w: 17, h: 17};
	};

	return declare('Aras.Client.Controls.CFG.TreeGridContainer', TreeGridContainer, {
		idGenerator: null,

		constructor: function(initialArguments) {
			this.idGenerator = {
				previousId: 0,
				getId: function() {
					return ++this.previousId;
				},
				drop: function() {
					this.previousId = 0;
				},
				setStartIndex: function(startIndex) {
					if (typeof startIndex === 'number') {
						this.previousId = startIndex;
					}
				}
			};

			this.overrideScrollerMethods();
		},

		overrideScrollerMethods: function() {
			var gridControl = this.grid_Experimental;
			var gridScroller = gridControl.scroller;

			if (gridScroller) {
				gridScroller.updateRowCount = this.updateRowCountModified;
			} else {
				aspect.after(this.grid_Experimental, 'createScroller', function() {
					this.overrideScrollerMethods();
				}.bind(this));
			}
		},

		updateRowCountModified: function(inRowCount) {
			// modified version of dojox/grid/_Scroller: updateRowCount method
			// required to fix problem with grid width during vertical scroller appearing/disappearing
			this.invalidateNodes();
			this.rowCount = inRowCount;

			// update page count, adjust document height
			this.pageCount = this._getPageCount(this.rowCount, this.rowsPerPage);
			this.height = this.rowCount * this.defaultRowHeight || 1;

			// refresh pageHeights array data
			this.pageHeights.length = this.pageCount;
			this.pageHeights[this.pageCount - 1] = this.calcLastPageHeight();

			for (var i = 0; i < this.pageCount - 1; i++) {
				this.pageHeights[i] = this.defaultPageHeight;
			}

			this.resize();
		},

		addXMLRows_Experimental: function() {
			this.inherited(arguments);

			if (!this._store) {
				this._store = this.grid_Experimental.store;
			}
		},

		decorateRowItemsBeforeAdd: function(rowItems, parentId, parentTreePath, additionalParameters) {
			var resultItems = [];

			additionalParameters = additionalParameters || {};
			rowItems = rowItems ? (Array.isArray(rowItems) ? rowItems : [rowItems]) : [];

			if (rowItems.length) {
				var expandosOpenStates = this.grid_Experimental.openedExpandos;
				var currentItem;
				var treePath;
				var decoratedItem;
				var childItems;
				var isRowExpanded;
				var i;

				parentTreePath = parentTreePath ? parentTreePath + '/' : '';

				for (i = 0; i < rowItems.length; i++) {
					currentItem = rowItems[i];

					treePath = parentTreePath + i;
					isRowExpanded = currentItem.expanded === 'true' || additionalParameters.expandItems;

					decoratedItem = this._getRowItemFromJson_Experimental(currentItem, parentId, treePath);
					childItems = currentItem.children || [];

					if (childItems.length) {
						if (isRowExpanded) {
							expandosOpenStates[decoratedItem.uniqueId] = true;
						} else {
							delete expandosOpenStates[decoratedItem.uniqueId];
						}

						decoratedItem.children = this.decorateRowItemsBeforeAdd(childItems, decoratedItem.uniqueId, treePath, additionalParameters);
					}

					resultItems.push(decoratedItem);
				}
			}

			return resultItems;
		},

		updateRenderedRows: function(startRowIndex) {
			// updated version of dojox/grid/LazyTreeGrid._updateRenderedRows method
			var gridControl = this.grid_Experimental;

			startRowIndex = startRowIndex === undefined ? 0 : startRowIndex;

			if (gridControl._updateRenderedRows) {
				gridControl._updateRenderedRows(startRowIndex);
			} else {
				var renderedPages = gridControl.scroller.stack;
				var rowsPerPage = gridControl.rowsPerPage;
				var pageIndex;
				var i;

				for (i = 0; i < renderedPages.length; i++) {
					pageIndex = renderedPages[i];

					if (pageIndex * rowsPerPage >= startRowIndex) {
						gridControl.updateRows(pageIndex * rowsPerPage, rowsPerPage);
					} else if ((pageIndex + 1) * rowsPerPage >= startRowIndex) {
						gridControl.updateRows(startRowIndex, (pageIndex + 1) * rowsPerPage - startRowIndex + 1);
					}
				}
			}
		},

		enumerateItems: function(targetItems, forceEnumeration) {
			targetItems = targetItems ? (Array.isArray(targetItems) ? targetItems : [targetItems]) : [];

			if (targetItems.length) {
				var currentItem;
				var i;

				for (i = 0; i < targetItems.length; i++) {
					currentItem = targetItems[i];
					currentItem.id = (forceEnumeration || !currentItem.id) ? this.idGenerator.getId() : currentItem.id;
					currentItem.uniqueId = currentItem.id;

					if (currentItem.children) {
						this.enumerateItems(currentItem.children, forceEnumeration);
					}
				}
			}
		}
	});
});
