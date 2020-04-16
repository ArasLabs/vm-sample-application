define([
	'dojo/_base/declare',
	'dojo/_base/connect',
	'Modules/aras.innovator.VariantManagementSample/Scripts/ui/cfgTreeGridContainer'
],
function(declare, connect, CFGTreeGridContainer) {
	return declare('Aras.Client.Controls.CFG.TreeGridAdapter', [], {
		isEditable: null,
		_eventHandlers: null,
		dataStore: null,
		_suspendedEventsCount: null,
		_invalidationSuspendLevel: null,
		gridContainer: null,
		gridWidget: null,
		menuHelper: null,
		connectId: 'cfgTreeGridContainer',

		constructor: function(initialArguments) {
			this.connectId = initialArguments.connectId || this.connectId;

			this._eventHandlers = [];
			this.dataStore = initialArguments.dataStore;
			this.menuHelper = initialArguments.menuHelper;
			this.isEditable = initialArguments.isEditable;
			this._suspendedEventsCount = 0;
			this._invalidationSuspendLevel = 0;
		},

		attachDataModelListeners: function() {
		},

		getHeader: function() {
			return '<?xml version="1.0" encoding="utf-8"?>'  +
			'<table' +
			' font="Microsoft Sans Serif-8"' +
			' sel_bgColor="steelbue"' +
			' sel_TextColor="white"' +
			' header_BgColor="buttonface"' +
			' treelines="1"' +
			' editable="true"' +
			' draw_grid="true"' +
			' multiselect="true"' +
			' column_draggable="true"' +
			' enableHtml="false"' +
			' enterAsTab="false"' +
			' bgInvert="true"' +
			' xmlns:msxsl="urn:schemas-microsoft-com:xslt"' +
			' xmlns:aras="http://www.aras.com"' +
			' xmlns:usr="urn:the-xml-files:xslt">' +
			' <thead>' +
			'  <th align="c">item_number</th>' +
			' </thead>' +
			' <columns>' +
			'  <column width="100%" edit="NOEDIT" align="l" order="10" colname="item_number"/>' +
			' </columns>' +
			'</table>';
		},

		refreshData: function(dataStore, fullReset) {
			if (!this._invalidationSuspendLevel) {
				var rowItems;

				this._rememberExpanded();

				if (dataStore) {
					this.dataStore = dataStore;
				}

				rowItems = (this.dataStore && this.dataStore.treeModelCollection) || [];

				if (rowItems.length) {
					rowItems = this.gridContainer.decorateRowItemsBeforeAdd(rowItems, '', '', this.gridContainer.isFirstLoad ? {expandItems: true} : null);
				}

				this.cleanupStore();
				this._restoreExpanded();

				for (var i = 0; i < rowItems.length; i++) {
					this.gridContainer.items_Experimental.add(rowItems[i]); // jscs: ignore requireCamelCaseOrUpperCaseIdentifiers
				}

				if (fullReset) {
					this.gridWidget._by_idx = []; // jscs: ignore requireCamelCaseOrUpperCaseIdentifiers
					this.gridWidget._size = 0;
					this.gridWidget._fetchedChildrenCount = 0;
					this.gridWidget.refresh();
					this.gridWidget.resize();
				} else {
					this.gridWidget.beginUpdate();
					this.gridWidget.update();
					this.gridWidget._fetchedChildrenCount = 0;
					this.gridWidget.refresh();
					this.gridWidget.endUpdate();
				}
			} else {
				this._suspendedEventsCount++;
			}
		},

		cleanupStore: function() {
			var gridStore = this.gridWidget.store;

			gridStore._arrayOfAllItems = [];
			gridStore._arrayOfTopLevelItems = [];
			gridStore._itemsByIdentity = {};
			gridStore._loadInProgress = false;
			gridStore._queuedFetches = [];
		},

		selectItem: function(itemId) {
			if (itemId) {
				var dataStoreItem = typeof itemId == 'object' ? itemId : this.dataStore.getElementById(itemId);

				if (dataStoreItem) {
					var gridStore = this.gridWidget.store;
					var gridStoreItem = gridStore._getItemByIdentity(dataStoreItem.uniqueId);

					this.gridContainer.setSelectedRow(dataStoreItem.uniqueId, false, true);
					this.onItemSelect(dataStoreItem);
				}
			} else {
				this.onItemSelect(this.dataStore.getRootElement());
			}
		},

		onItemSelect: function(selectedItem) {
		},

		_createTree: function() {
			var gridContainer = new CFGTreeGridContainer({
				TreeClass: 'arasCFGTree',
				connectId: this.connectId,
				canEdit_Experimental: function(rowId) { // jscs: ignore requireCamelCaseOrUpperCaseIdentifiers
					return false;
				}.bind(this),
				isFirstLoad: true
			});
			var columnsModule = gridContainer.columns_Experimental; // jscs: ignore requireCamelCaseOrUpperCaseIdentifiers

			this.gridContainer = gridContainer;
			this.gridWidget = gridContainer.grid_Experimental; // jscs: ignore requireCamelCaseOrUpperCaseIdentifiers
			this.gridWidget.beginUpdate();

			gridContainer.rowHeight = 24;
			gridContainer.setMultiselect(false);
			this.gridWidget.doheaderclick = function() { };
			this.gridWidget.scroller.defaultRowHeight = 24;

			// attach gridContainer event handlers
			this._eventHandlers.push(connect.connect(gridContainer, 'gridMenuInit', this, function(rowId) {
				return this._onGridMenuInit(rowId);
			}.bind(this)));

			this._eventHandlers.push(connect.connect(gridContainer, 'gridRowSelect', this, function(rowId, isMultiselect) {
				var storeItem = this.dataStore.getElementById(rowId);

				this.onItemSelect(storeItem);
			}));

			// attach gridWidget event handlers
			this._eventHandlers.push(connect.connect(gridContainer, 'gridXmlLoaded', this, function(rowId) {
				var rowItems = (this.dataStore && this.dataStore.treeModelCollection) || [];
				setTimeout(function() {
					if (rowItems.length) {
						rowItems = this.gridContainer.decorateRowItemsBeforeAdd(rowItems, '', '', this.gridContainer.isFirstLoad ? {expandItems: true} : null);

						for (var i = 0; i < rowItems.length; i++) {
							this.gridContainer.items_Experimental.add(rowItems[i], ''); // jscs: ignore requireCamelCaseOrUpperCaseIdentifiers
						}

						this.gridWidget._size = rowItems.length;
						this.gridWidget.render();
						this.gridWidget.resize();
					}

					this.gridContainer.isFirstLoad = false;
				}.bind(this), 0);
			}.bind(this)));

			this._eventHandlers.push(connect.connect(this.gridWidget, 'onRowClick', this, function(clickEvent) {
				var targetNode = clickEvent.target || clickEvent.srcElement;
				var classNames = targetNode.className;
				var isActionButton = /ActionButton/.test(classNames);

				if (isActionButton) {
					var actionName = targetNode.getAttribute('action');
					var rowIndex = clickEvent.rowIndex;
					var rowId = this.gridContainer.getRowId(rowIndex);
					var storeItem = this.dataStore.getElementById(rowId);

					this.onExecuteAction(actionName, storeItem);
				}
			}.bind(this)));

			this._eventHandlers.push(connect.connect(this.gridWidget, 'onStyleRow', this, function(row) {
				var itemId = this.gridContainer.getRowId(row.index);
				var storeItem = this.dataStore.getElementById(itemId);

				if (storeItem) {
					var customClasses = storeItem.getTreeClasses();

					row.customClasses += customClasses ? ' ' + customClasses : '';
				}
			}));

			// initializing grid structure
			gridContainer.initXML(this.getHeader());
			columnsModule.set(0, 'formatter', this.renderRowHTML.bind(this));
			this.gridWidget.endUpdate();
		},

		updateRow: function(storeItem) {
			if (storeItem) {
				var rowIndex = typeof storeItem === 'object' ? this.gridContainer.getRowIndex(storeItem.uniqueId) : storeItem;

				this.gridWidget.updateRow(rowIndex);
			}
		},

		onExecuteAction: function(actionName, storeItem) {
		},

		renderRowHTML: function(storeValue, rowId, level, layoutCell) {
			var dataModelElement = storeValue;

			return dataModelElement.getTreeLabel();
		},

		expandRows: function(targetIds) {
			targetIds = targetIds ? (Array.isArray(targetIds) ? targetIds : [targetIds]) : [];

			if (targetIds.length) {
				var gridView = this.gridWidget.views.views[0];
				var expandoWidget;
				var rowId;
				var i;

				for (i = 0; i < targetIds.length; i++) {
					rowId = targetIds[i];
					rowId = typeof rowId === 'object' ? rowId.uniqueId : rowId;
					expandoWidget = gridView._expandos[rowId];

					if (expandoWidget && !this.gridWidget.openedExpandos[rowId]) {
						expandoWidget.setOpen(true);
						this.gridWidget.openedExpandos[rowId] = true;
					}
				}
			}
		},

		setExpandoState: function(itemId, newState) {
			var expandoHash = this.gridWidget.openedExpandos;

			if (newState) {
				expandoHash[itemId] = true;
			} else {
				delete expandoHash[itemId];
			}
		},

		suspendInvalidation: function() {
			this._invalidationSuspendLevel++;
		},

		resumeInvalidation: function() {
			if (this._invalidationSuspendLevel) {
				this._invalidationSuspendLevel--;
			}

			if (!this._invalidationSuspendLevel && this._suspendedEventsCount) {
				this.refreshData();
				this._suspendedEventsCount = 0;
			}
		},

		_rememberExpanded: function() {
			var expandedRowIds = this.gridContainer.getOpenedItems();
			var storeItem;
			var itemIdPath;
			var rowId;

			this.expandedRowPaths = [];

			for (i = 0; i < expandedRowIds.length; i++) {
				rowId = expandedRowIds[i];
				storeItem = this.dataStore.getElementById(rowId);

				if (storeItem) {
					itemIdPath = storeItem.getItemIdPath().join(',');
					this.expandedRowPaths[itemIdPath] = true;
				}
			}
		},

		_restoreExpanded: function() {
			var storeItemsHash = this.dataStore.itemsHash;
			var storeItem;
			var itemIdPath;
			var itemId;

			this.gridWidget.openedExpandos = {};

			for (itemId in storeItemsHash) {
				storeItem = storeItemsHash[itemId];
				itemIdPath = storeItem.getItemIdPath().join(',');

				if (this.expandedRowPaths[itemIdPath]) {
					this.gridWidget.openedExpandos[storeItem.uniqueId] = true;
				}
			}
		},

		destroy: function() {
			if (this.gridContainer) {
				this.inherited(arguments);
			}
		},

		setEditable: function(doEditable) {
			this.isEditable = doEditable === undefined ? true : Boolean(doEditable);
		},

		selectRow: function(storeItem, scrollTo) {
			if (storeItem) {
				var rowId = typeof storeItem === 'object' ? storeItem.uniqueId : storeItem;

				this.gridContainer.setSelectedRow(rowId, false, scrollTo);
			}
		},

		getRowNode: function(rowId) {
			var gridView = this.gridWidget.views.views[0];

			rowId = typeof rowId === 'object' ? rowId.uniqueId : rowId;

			return gridView.getRowNode(this.gridContainer.getRowIndex(rowId));
		},

		_onGridMenuInit: function(rowId, columnIndex) {
			if (this.menuHelper) {
				var gridMenu = this.gridContainer.getMenu();
				var storeItem = this.dataStore.getElementById(rowId);
				var menuItems = this.menuHelper.getMenuItemDescriptors(storeItem, this.isEditable);

				if (menuItems.length) {
					var itemDescriptors;
					var menuItemDescriptor;
					var menuItemWidget;
					var i;
					var j;

					gridMenu.removeAll();
					gridMenu.addRange(menuItems);

					for (i = 0; i < menuItems.length; i++) {
						itemDescriptors = this._searchMenuItemDescriptors(menuItems[i]);

						for (j = 0; j < itemDescriptors.length; j++) {
							menuItemDescriptor = itemDescriptors[j];

							if (menuItemDescriptor.additionalParameters) {
								menuItemWidget = gridMenu.getItemById(menuItemDescriptor.id);
								menuItemWidget.params = menuItemDescriptor.additionalParameters;
							}
						}
					}

					return true;
				}
			}

			return false;
		},

		_searchMenuItemDescriptors: function(menuItemDescriptor, itemDescriptors) {
			itemDescriptors = itemDescriptors || [];

			if (menuItemDescriptor) {
				itemDescriptors.push(menuItemDescriptor);

				if (menuItemDescriptor.subMenu) {
					var subMenuItems = menuItemDescriptor.subMenu;
					var i;

					for (i = 0; i < subMenuItems.length; i++) {
						this._searchMenuItemDescriptors(subMenuItems[i], itemDescriptors);
					}
				}
			}

			return itemDescriptors;
		}
	});
});
