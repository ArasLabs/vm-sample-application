define([
	'dojo/_base/declare',
	'dojo/_base/connect',
	'Modules/aras.innovator.VariantManagementSample/Scripts/ui/treeGridAdapter',
	'Modules/aras.innovator.VariantManagementSample/Scripts/ui/cfgTreeGridContainer',
	'Controls/Common/RenderUtils'
],
function(declare, connect, TreeGridAdapter, CFGTreeGridContainer, RenderUtils) {
	return declare('Aras.Client.Controls.CFG.GroupTreeGridAdapter', [TreeGridAdapter], {
		checkMode: 'group',
		_checkModeData: null,

		constructor: function(initialArguments) {
			this.checkMode = initialArguments.checkMode || this.checkMode;
			this._checkModeData = initialArguments.modeData || {};
		},

		getHeader: function() {
			return '<?xml version="1.0" encoding="utf-8"?>'  +
			'<table' +
			' sel_bgColor="steelbue"' +
			' sel_TextColor="white"' +
			' header_BgColor="buttonface"' +
			' treelines="1"' +
			' editable="true"' +
			' draw_grid="true"' +
			' multiselect="true"' +
			' column_draggable="true"' +
			' enterAsTab="false"' +
			' bgInvert="true"' +
			' xmlns:msxsl="urn:schemas-microsoft-com:xslt"' +
			' xmlns:aras="http://www.aras.com">' +
			' <thead>' +
			'  <th>modelItem</th>' +
			//'  <th>checked</th>' +
			' </thead>' +
			' <columns>' +
			'  <column width="100%" edit="NOEDIT" order="1" colname="modelItem"/>' +
			//'  <column width="40px" align="center" order="2" colname="checked"/>' +
			' </columns>' +
			'</table>';
		},

		_createTree: function() {
			var gridContainer = new CFGTreeGridContainer({
				TreeClass: 'arasCFGTree',
				connectId: this.connectId,
				isFirstLoad: true
			});
			var columnsModule = gridContainer.columns_Experimental; // jscs: ignore requireCamelCaseOrUpperCaseIdentifiers

			this.gridContainer = gridContainer;
			this.gridWidget = gridContainer.grid_Experimental; // jscs: ignore requireCamelCaseOrUpperCaseIdentifiers

			gridContainer.rowHeight = 24;
			gridContainer.setMultiselect(false);
			this.gridWidget.scroller.defaultRowHeight = 24;

			// attach gridContainer event handlers
			this._eventHandlers.push(connect.connect(gridContainer, 'gridMenuInit', this, function(rowId) {
				return this._onGridMenuInit(rowId);
			}.bind(this)));

			this._eventHandlers.push(connect.connect(gridContainer, 'gridRowSelect', this, function(rowId, isMultiselect) {
				var storeItem = this.dataStore.getElementById(rowId);

				this.onItemSelect(storeItem);
			}));

			this._eventHandlers.push(connect.connect(this.gridWidget, 'onApplyCellEdit', this, function(storeValue, rowIndex, columnName) {
				var storeItem = this.gridWidget.getItem(rowIndex);

				this.setItemCheckState(storeItem, storeValue);
			}.bind(this)));

			// attach gridWidget event handlers
			this._eventHandlers.push(connect.connect(gridContainer, 'gridXmlLoaded', this, function(rowId) {
				var rowItems = (this.dataStore && this.dataStore.treeModelCollection) || [];
				rowItems.sort(function(firstItem, secondItem) {
					return firstItem.itemSorter(firstItem, secondItem);
				});

				if (rowItems.length) {
					rowItems = this.gridContainer.decorateRowItemsBeforeAdd(rowItems, '', '');

					for (var i = 0; i < rowItems.length; i++) {
						this.gridContainer.items_Experimental.add(rowItems[i], ''); // jscs: ignore requireCamelCaseOrUpperCaseIdentifiers
					}
				}

				this.gridContainer.isFirstLoad = false;
			}.bind(this)));

			this._eventHandlers.push(connect.connect(this.gridWidget, 'onRowClick', this, function(clickEvent) {
				var targetNode = clickEvent.target || clickEvent.srcElement;
				var classNames = targetNode.className;
				var isActionButton = /ActionButton/.test(classNames);

				if (isActionButton) {
					var actionName = targetNode.getAttribute('action');
					var actionArguments = targetNode.getAttribute('actionArguments') || '';
					var storeItem = this.gridWidget.getItem(clickEvent.rowIndex);

					this.onExecuteAction(actionName, actionArguments, storeItem);
				}
			}.bind(this)));

			// initializing grid structure
			gridContainer.initXML(this.getHeader());
			columnsModule.set(0, 'formatter', this.renderCellHTML.bind(this));

			this.gridWidget.render();
		},

		onExecuteAction: function(actionName, actionArguments, storeItem) {
			/*
			switch(actionName) {
				case 'setGroup':
					this._setGroup(storeItem, actionArguments);
					this.gridContainer.updateRenderedRows();
					break;
				case 'dropGroup':
					this._dropGroup(storeItem);
					this.gridContainer.updateRenderedRows();
					break;
				default:
					break;
			}
			*/
		},

		setItemCheckState: function(storeItem, checkState) {
			if (checkState) {
				this._checkItem(storeItem);
			} else {
				this._uncheckItem(storeItem);
			}
		},

		_getItemGroup: function(storeItem) {
			if (storeItem) {
				var gridStore = this.gridWidget.store;
				var groupName = gridStore.getValue(storeItem, 'group');
				var parentId = storeItem.parent[0];

				while (!groupName && parentId) {
					storeItem = gridStore._itemsByIdentity[parentId];
					parentId = storeItem.parent[0];
					groupName = gridStore.getValue(storeItem, 'group');
				}

				return groupName;
			}
		},

		_setGroup: function(storeItem, groupName) {
			if (storeItem) {
				var gridStore = this.gridWidget.store;
				var parentId = storeItem.parent[0];
				var nonGroupedChildItems = this._getNotInGroupChildren(storeItem, groupName);
				var changedItems = [storeItem].concat(nonGroupedChildItems);
				var parentItem;
				var i;

				gridStore.setValue(storeItem, 'group', groupName);

				// set group for all descendant items
				for (i = 0; i < nonGroupedChildItems.length; i++) {
					gridStore.setValue(nonGroupedChildItems[i], 'group', groupName);
				}

				// check parent items, if they are not checked
				if (parentId) {
					var itemsByIdentity = gridStore._itemsByIdentity;
					var parentGroupType;

					while (parentId) {
						parentItem = itemsByIdentity[parentId];
						parentGroupType = gridStore.getValue(parentItem, 'group');

						if (parentGroupType) {
							break;
						} else {
							gridStore.setValue(parentItem, 'group', groupName);
							changedItems.push(parentItem);

							parentId = parentItem.parent[0];
						}
					}
				}

				this.onItemGroupChanged(changedItems, groupName);
			}
		},

		_dropGroup: function(storeItem) {
			if (storeItem) {
				var gridStore = this.gridWidget.store;
				var parentId = storeItem.parent[0];
				var itemGroupName = gridStore.getValue(storeItem, 'group');
				var groupedChildItems = this._getItemsByFieldValue(storeItem.children, 'group', itemGroupName);
				var changedItems = [storeItem].concat(groupedChildItems);
				var parentItem;
				var i;

				gridStore.setValue(storeItem, 'group', '');

				// set group for all descendant items
				for (i = 0; i < groupedChildItems.length; i++) {
					gridStore.setValue(groupedChildItems[i], 'group', '');
				}

				// check parent items, if they are not checked
				if (parentId) {
					var itemsByIdentity = gridStore._itemsByIdentity;
					var parentGroupType;

					while (parentId) {
						parentItem = itemsByIdentity[parentId];
						groupedChildItems = this._getItemsByFieldValue(parentItem.children, 'group', itemGroupName);

						if (groupedChildItems.length) {
							break;
						} else {
							gridStore.setValue(parentItem, 'group', '');
							changedItems.push(parentItem);

							parentId = parentItem.parent[0];
						}
					}
				}

				this.onItemGroupChanged(changedItems, '');
			}
		},

		onItemGroupChanged: function(affectedItems, groupName) {
		},

		_checkItem: function(storeItem) {
			if (storeItem) {
				var gridStore = this.gridWidget.store;
				var parentId = storeItem.parent.length && storeItem.parent[0];
				var unselectedChildItems = this._getChildrenByState(storeItem, false);
				var parentItem;
				var i;

				gridStore.setValue(storeItem, 'checked', true);

				// check all descendant items
				for (i = 0; i < unselectedChildItems.length; i++) {
					gridStore.setValue(unselectedChildItems[i], 'checked', true);
				}

				// check parent items, if they are not checked
				if (parentId) {
					var itemsByIdentity = gridStore._itemsByIdentity;
					var isParentSelected;

					while (parentId) {
						parentItem = itemsByIdentity[parentId];
						isParentSelected = gridStore.getValue(parentItem, 'checked');

						if (isParentSelected) {
							break;
						} else {
							gridStore.setValue(parentItem, 'checked', true);
							parentId = parentItem.parent.length && parentItem.parent[0];
						}
					}
				}

				if (this.checkMode === 'radio') {
					var topLevelItems = gridStore._arrayOfTopLevelItems;
					var currentItem;
					var itemId;

					parentItem = this._getTopParentItem(storeItem);
					parentId = parentItem.uniqueId[0];

					for (i = 0; i < topLevelItems.length; i++) {
						currentItem = topLevelItems[i];
						itemId = currentItem.uniqueId[0];

						if (itemId !== parentId) {
							this._uncheckItem(currentItem);
						}
					}
				}
			}
		},

		_getTopParentItem: function(storeItem) {
			var topParentItem = storeItem;
			var gridStore = this.gridWidget.store;
			var parentId = storeItem.parent.length && storeItem.parent[0];

			while (parentId) {
				topParentItem = gridStore._itemsByIdentity[parentId];
				parentId = topParentItem.parent.length && topParentItem.parent[0];
			}

			return topParentItem;
		},

		_uncheckItem: function(storeItem) {
			if (storeItem) {
				var gridStore = this.gridWidget.store;
				var selectedChildItems = this._getChildrenByState(storeItem, true);
				var parentId = storeItem.uniqueId[0] && storeItem.parent[0];
				var i;

				gridStore.setValue(storeItem, 'checked', false);

				// uncheck all descendant items
				for (i = 0; i < selectedChildItems.length; i++) {
					gridStore.setValue(selectedChildItems[i], 'checked', false);
				}

				// uncheck parent items, if they have no other selected childs
				if (parentId) {
					var itemsByIdentity = gridStore._itemsByIdentity;
					var parentItem;

					while (parentId) {
						parentItem = itemsByIdentity[parentId];
						selectedChildItems = this._getChildrenByState(parentItem, true);

						if (selectedChildItems.length) {
							break;
						} else {
							gridStore.setValue(parentItem, 'checked', false);
							parentId = parentItem.parent.length && parentItem.parent[0];
						}
					}
				}
			}
		},

		_getNotInGroupChildren: function(storeItem, groupName, foundChildren) {
			foundChildren = foundChildren || [];

			if (storeItem) {
				var childItems = storeItem.children || [];
				var gridStore = this.gridWidget.store;
				var currentChild;
				var i;

				for (i = 0; i < childItems.length; i++) {
					currentChild = childItems[i];

					if (gridStore.getValue(currentChild, 'group') !== groupName) {
						foundChildren.push(currentChild);
					}

					if (currentChild.children.length) {
						this._getNotInGroupChildren(currentChild, groupName, foundChildren);
					}
				}
			}

			return foundChildren;
		},

		_getItemsByFieldValue: function(targetItems, fieldName, fieldValue, foundItems) {
			var gridStore = this.gridWidget.store;

			foundItems = foundItems || [];
			targetItems = targetItems ? (Array.isArray(targetItems) ? targetItems : [targetItems]) : gridStore._arrayOfTopLevelItems;

			if (targetItems.length) {
				var currentItem;
				var i;

				for (i = 0; i < targetItems.length; i++) {
					currentItem = targetItems[i];

					if (gridStore.getValue(currentItem, fieldName) == fieldValue) {
						foundItems.push(currentItem);
					}

					if (currentItem.children.length) {
						this._getItemsByFieldValue(currentItem.children, fieldName, fieldValue, foundItems);
					}
				}
			}

			return foundItems;
		},

		_getChildrenByState: function(storeItem, checkState, foundChildren) {
			foundChildren = foundChildren || [];

			if (storeItem) {
				var childItems = storeItem.children || [];
				var gridStore = this.gridWidget.store;
				var currentChild;
				var i;

				for (i = 0; i < childItems.length; i++) {
					currentChild = childItems[i];

					if (gridStore.getValue(currentChild, 'checked') === checkState) {
						foundChildren.push(currentChild);
					}

					if (currentChild.children.length) {
						this._getChildrenByState(currentChild, checkState, foundChildren);
					}
				}
			}

			return foundChildren;
		},

		getCheckedItems: function() {
			var foundItems = [];
			var gridStore = this.gridWidget.store;
			var topLevelItems = gridStore._arrayOfTopLevelItems;
			var currentItem;
			var isItemChecked;
			var i;

			for (i = 0; i < topLevelItems.length; i++) {
				currentItem = topLevelItems[i];
				isChecked = gridStore.getValue(currentItem, 'checked');

				if (isChecked) {
					foundItems.push(currentItem);

					this._getChildrenByState(currentItem, true, foundItems);
				}
			}
		},

		renderCellHTML: function(storeValue, rowIndex, level, layoutCell) {
			return RenderUtils.HTML.wrapInTag(storeValue, 'span') + this._renderGroupButtons(storeValue);
		},

		getCheckGroupsCount: function() {
			if (this.checkMode == 'group') {
				var groupsData = this._checkModeData.groups || {};

				return Object.keys(groupsData).length;
			}

			return 0;
		},

		_renderGroupButtons: function(modelItem) {
			var buttonsHTML = '';

			if (modelItem) {
				var itemGroupNames = modelItem.getItemGroups();
				var groupDescriptors = this._checkModeData.groups;
				var buttonIndex = 0;
				var groupDescriptor;
				var currentGroupName;

				for (currentGroupName in groupDescriptors) {
					groupDescriptor = groupDescriptors[currentGroupName];
					isGroupActive = itemGroupNames.indexOf(currentGroupName) > -1;

					buttonsHTML += RenderUtils.HTML.wrapInTag(groupDescriptor.symbol || '', 'div', {
						style: (groupDescriptor.style || '') + ('right:' + (buttonIndex * 25) + 'px;'),
						class: 'ActionButton' + (isGroupActive ? ' Checked' : ' Unchecked') + (groupDescriptor.cssClass ? ' ' + groupDescriptor.cssClass : ''),
						action: isGroupActive ? 'removeGroup' : 'setGroup',
						actionArguments: currentGroupName,
						title: groupDescriptor.label + ' Group'
					});

					buttonIndex++;
				}
			}

			return buttonsHTML;
		}
	});
});
