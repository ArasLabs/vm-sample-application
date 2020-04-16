define([
	'dojo/_base/declare',
	'Modules/aras.innovator.VariantManagementSample/Scripts/tableRuleEditor/dataModel/dataLoader',
	'Modules/aras.innovator.VariantManagementSample/Scripts/tableRuleEditor/dataModel/modelItemFactory',
	'Modules/aras.innovator.core.Core/Scripts/Classes/Eventable',
	'Modules/aras.innovator.VariantManagementSample/Scripts/tableRuleEditor/dataModel/comparableModelItem'
],
function(declare, DataLoader, ModelItemFactory, Eventable, Comparable) {
	return declare([Eventable, Comparable], {
		aras: null,
		_dataLoader: null,
		_data: null,
		_selection: null,
		_selectionChanging: false,
		_itemTypeIconCache: {},
		_parsingData: false,
		itemFactory: null,
		_allowedTypes: null,

		constructor: function(initialArguments) {
			this.aras = initialArguments.aras;
			this._dataLoader = initialArguments.dataLoader || (new DataLoader({aras: this.aras}));
			this._data = {
				modelItemsHash: {},
				groupedItemsCache: {}
			};
			this._selection = [];
			this.itemFactory = new ModelItemFactory({dataModel: this});
		},

		createModelItemFromData: function(itemData, additionalParameters) {
			return this.itemFactory.createModelItemFromData(itemData, additionalParameters);
		},

		createModelItemFromItemNode: function(itemNode, additionalParameters) {
			return this.itemFactory.createModelItemFromItemNode(itemNode, additionalParameters);
		},

		createNewModelItem: function(itemType, additionalParameters) {
			return this.itemFactory.createNewModelItem(itemType, additionalParameters);
		},

		_rememberGroupedItems: function() {
			this._data.groupedItemsCache = this.getGroupedItemsCache();
		},

		getGroupedItemsCache: function() {
			var modelItemsHash = this._data.modelItemsHash;
			var groupedItemsHash = {};
			var modelItem;
			var itemGroups;
			var itemIdPath;
			var itemId;

			for (itemId in modelItemsHash) {
				modelItem = modelItemsHash[itemId];

				if (modelItem.getItemGroups) {
					itemGroups = modelItem.getItemGroups();

					if (itemGroups.length) {
						itemIdPath = modelItem.getItemIdPath().join(',');
						groupedItemsHash[itemIdPath] = itemGroups;
					}
				}
			}

			return groupedItemsHash;
		},

		restoreGroupedItems: function(groupedItemsHash) {
			var modelItemsHash = this._data.modelItemsHash;
			var modelItem;
			var itemGroup;
			var itemIdPath;
			var itemId;

			groupedItemsHash = groupedItemsHash || this._data.groupedItemsCache;

			for (itemId in modelItemsHash) {
				modelItem = modelItemsHash[itemId];

				if (modelItem.getItemGroups) {
					itemIdPath = modelItem.getItemIdPath().join(',');
					itemGroups = groupedItemsHash[itemIdPath];

					if (itemGroups) {
						modelItem.setItemGroup(itemGroups, {skipRecursive: true, suppressEvent: true});
					} else {
						modelItem.removeAllItemGroups({skipRecursive: true, suppressEvent: true});
					}
				}
			}
		},

		_onItemChangeHandler: function(targetItem, changesInfo) {
			this.raiseEvent('onChangeItem', targetItem, changesInfo);
		},

		registerItem: function(targetItem) {
			if (targetItem) {
				this._data.modelItemsHash[targetItem.uniqueId] = targetItem;

				targetItem.addEventListener(this, this, 'onItemGroupChanged', this._onItemGroupChanged);
				targetItem.addEventListener(this, this, 'onItemChanged', this._onItemChangeHandler);

				if (targetItem.isNew() && !this._parsingData) {
					this.raiseEvent('onNewItem', targetItem);
				}
			}
		},

		unregisterItem: function(targetItem) {
			if (targetItem) {
				targetItem.removeEventListeners(this);

				delete this._data.modelItemsHash[targetItem.uniqueId];
			}
		},

		cleanupData: function() {
			var itemsHash = this._data.modelItemsHash;
			var modelItem;
			var itemId;

			for (itemId in itemsHash) {
				modelItem = itemsHash[itemId];
				modelItem.unregisterItem();
			}
		},

		deleteItem: function(modelItem, optionalParameters) {
			var targetItem = (typeof modelItem === 'string') ? this.getItemById(modelItem) : modelItem;

			optionalParameters = optionalParameters || {};

			if (targetItem && targetItem.isRegistered()) {
				if (targetItem.isNew()) {
					var parentItem = targetItem.parent;

					if (parentItem) {
						parentItem.removeChild(targetItem);
					} else {
						targetItem.unregisterItem();
					}
				} else {
					if (optionalParameters.relationshipOnly) {
						targetItem.setItemAttribute('action', 'delete', {itemNode: targetItem.getRelationshipNode()});
					} else {
						targetItem.setItemAttribute('action', 'delete');
						targetItem.setItemAttributeSilent('action', 'delete', {itemNode: targetItem.getRelationshipNode()});
					}
				}

				this.raiseEvent('onDeleteItem', targetItem, optionalParameters);
			}
		},

		deleteItemWithRelationships: function(modelItem) {
			if (modelItem) {
				var childModelItems = modelItem.getChildren();
				var i;

				for (i = 0; i < childModelItems.length; i++) {
					this.deleteItem(childModelItems[i], {relationshipOnly: true});
				}

				this.deleteItem(modelItem);
			}
		},

		_onItemGroupChanged: function(modelItem, groupName) {
			this.raiseEvent('onItemGroupChanged');
		},

		getItemById: function(uniqueId) {
			var foundItems = this.getItemsByParameters({id: uniqueId});

			return foundItems.length && foundItems[0];
		},

		getItemsByItemId: function(itemId) {
			return this.getItemsByParameters({itemId: itemId});
		},

		getItemsByGroup: function(groupName) {
			return this.getItemsByParameters({group: groupName});
		},

		setSelection: function(targetItems, optionalParameters) {
			if (!this._selectionChanging) {
				var isSelectionChanged = true;
				var i;

				optionalParameters = optionalParameters || {};

				this._selectionChanging = true;
				targetItems = targetItems ? (Array.isArray(targetItems) ? targetItems : [targetItems]) : [];

				if (targetItems.length === this._selection.length && !optionalParameters.forceSelection) {
					isSelectionChanged = false;

					for (i = 0; i < targetItems.length; i++) {
						if (targetItems[i].id !== this._selection[i].id) {
							isSelectionChanged = true;
							break;
						}
					}
				}

				if (isSelectionChanged) {
					this._selection = targetItems.slice();
					this.raiseEvent('onSelectionChanged', targetItems);
				}

				this._selectionChanging = false;
			}
		},

		getSelection: function() {
			return this._selection.slice();
		},

		getAllItems: function() {
			var itemsHash = this._data.modelItemsHash;
			var foundItems = [];
			var itemId;

			for (itemId in itemsHash) {
				foundItems.push(itemsHash[itemId]);
			}

			return foundItems;
		},

		getItemsByParameters: function(inputFilterParameters) {
			var itemsHash = this._data.modelItemsHash;
			var foundItems = [];
			var filterParameter;
			var isCheckPassed;
			var parameterName;
			var parameterNameArgument;
			var parameterNamePairs;
			var parameterValue;
			var parameterCheckPassed;
			var modelItem;
			var itemId;

			inputFilterParameters = inputFilterParameters || {};

			for (itemId in itemsHash) {
				modelItem = itemsHash[itemId];
				isCheckPassed = true;

				for (filterParameter in inputFilterParameters) {
					parameterValue = inputFilterParameters[filterParameter];

					if (filterParameter.indexOf(':') > -1) {
						parameterNamePairs = filterParameter.split(':');
						parameterName = parameterNamePairs[0];
						parameterNameArgument = parameterNamePairs.length > 1 && parameterNamePairs[1];
					} else {
						parameterName = filterParameter;
						parameterNameArgument = '';
					}

					switch (parameterName) {
						case 'group':
							parameterCheckPassed = modelItem.getItemGroups && modelItem.isItemFromGroup(parameterValue);
							break;
						case 'itemProperty':
							parameterCheckPassed = this.aras.getItemProperty(modelItem.node, parameterNameArgument) === parameterValue;
							break;
						default:
							parameterCheckPassed = modelItem[parameterName] === parameterValue;
							break;
					}

					if (!parameterCheckPassed) {
						isCheckPassed = false;
						break;
					}
				}

				if (isCheckPassed) {
					foundItems.push(modelItem);
				}
			}

			return foundItems;
		},

		getIconPath: function(modelItem) {
			var itemTypeName = modelItem.itemType;
			var cachedIcon = this._itemTypeIconCache[itemTypeName];

			if (!cachedIcon) {
				switch (itemTypeName) {
					case 'Variable':
						cachedIcon = '../Modules/aras.innovator.VariantManagementSample/images/Feature.svg';
						break;
					case 'NamedConstant':
						cachedIcon = '../Modules/aras.innovator.VariantManagementSample/images/Option.svg';
						break;
					default:
						var itemTypeItem = this.aras.getItemTypeForClient(itemTypeName);
						var iconUrl = itemTypeItem.getProperty('open_icon') || '../images/DefaultItemType.svg';

						if (iconUrl.toLowerCase().indexOf('vault:///?fileid=') != -1) {
							var fileId = iconUrl.substr(iconUrl.length - 32);

							iconUrl = this.aras.IomInnovator.getFileUrl(fileId, this.aras.Enums.UrlType.SecurityToken);
						} else {
							iconUrl = this.aras.getScriptsURL() + iconUrl;
						}

						cachedIcon = iconUrl;
				}

				this._itemTypeIconCache[itemTypeName] = cachedIcon;
			}

			return cachedIcon || '../images/DefaultItemType.svg';
		}
	});
});
