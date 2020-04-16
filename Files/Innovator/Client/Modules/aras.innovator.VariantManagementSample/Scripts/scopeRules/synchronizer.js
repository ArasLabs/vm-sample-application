/* global define */
define([
	'dojo/_base/declare',
	'dojo/_base/connect',
	'Modules/aras.innovator.VariantManagementSample/Scripts/scopeRules/modelEnums'
],
function(declare, connect, Enums) {

	return declare(null, {
		dataLoader: null,
		selectedTreeItem: null,
		aras: null,
		scopeItem: null,
		topWindow: null,
		_eventHandlers: null,
		isEditMode: null,
		_controls: null,
		_allowedTypes: null,

		constructor: function(intialArguments) {
			intialArguments = intialArguments || {};

			this._eventHandlers = {};
			this._controls = {};
			this.aras = intialArguments.aras;
			this.scopeItem = intialArguments.scopeItem;
			this.isEditMode = intialArguments.isEditMode;

			this.registerTreeControl(intialArguments.treeControl);
			this.registerMenuControl(intialArguments.menuControl);

			this.dataLoader = intialArguments.dataLoader;
			this.topWindow = this.aras.getMostTopWindowWithAras(window);
		},

		setEditMode: function(newEditMode) {
			this.isEditMode = Boolean(newEditMode);
		},

		setAllowedTypes: function(inputData) {
			if (inputData) {
				if (Array.isArray(inputData)) {
					var valueHash = {};
					var i;

					for (i = 0; i < inputData.length; i++) {
						valueHash[inputData[i]] = true;
					}

					inputData = valueHash;
				}

				this._allowedTypes = inputData;
			} else {
				this._allowedTypes = null;
			}
		},

		registerTreeControl:  function(treeControl) {
			var controlName = 'tree';
			var currentControl = this.getControlByName(controlName);

			if (treeControl && treeControl !== currentControl) {
				var eventListeners = this.getControlEventListeners(controlName);

				this.removeControlEventListeners(controlName);
				this._controls[controlName] = treeControl;

				eventListeners.push(connect.connect(treeControl.gridContainer, 'gridMenuClick', this, this.onMenuItemClick.bind(this)));
				eventListeners.push(connect.connect(treeControl, 'onExecuteAction', this.onExecuteAction.bind(this)));
			}
		},

		unregisterControl: function(controlName) {
			this.removeControlEventListeners(controlName);
			delete this._controls[controlName];
		},

		onMenuItemClick: function(menuItemId, rowId, columnIndex) {
			var treeControl = this.getControlByName('tree');
			var dataStore = treeControl.dataStore;
			var modelItem = dataStore.getElementById(rowId);
			var gridMenu = treeControl.gridContainer.getMenu();
			var menuItem = gridMenu.getItemById(menuItemId);
			var actionArguments = menuItem.params;
			var commandName = menuItemId.split(':')[0];

			switch (commandName) {
				case 'addelement':
					this.onAddRelationship(modelItem, actionArguments.relationshipType, actionArguments.addAction);
					break;
				case 'unlockelement':
					this.onUnlockElement(modelItem);
					break;
				case 'lockelement':
					this.onLockElement(modelItem);
					break;
				case 'unpickelement':
					var selectedItem = modelItem;
					var parentItem = modelItem.parent;
					var isNewItem = modelItem.isNew();

					treeControl.suspendInvalidation();
					this.onUnpickElement(modelItem);

					if (isNewItem) {
						var itemIndex = dataStore.getChildIndex(modelItem);

						selectedItem = itemIndex > 0 ? dataStore.getChildByIndex(parentItem, itemIndex - 1) : parentItem;
						parentItem.removeChild(modelItem);
					}

					treeControl.refreshData();

					treeControl.resumeInvalidation();
					treeControl.selectRow(selectedItem.uniqueId);
					break;
				case 'viewelement':
					var showResult = this.aras.uiShowItem(modelItem.dataType, modelItem.itemId);

					if (showResult === false) {
						this.aras.AlertError(this.aras.getResource('../Modules/aras.innovator.TDF', 'action.noitemfound'));
					}
					break;
			}
		},

		registerMenuControl:  function(menuControl) {
			var controlName = 'menu';
			var currentControl = this.getControlByName(controlName);

			if (menuControl && menuControl !== currentControl) {
				this.removeControlEventListeners(controlName);
				this._controls[controlName] = menuControl;
			}
		},

		reloadControlsData: function(scopeItemNode) {
			this.scopeItem = scopeItemNode;

			this.dataLoader.dropRequestScopeCache();
			this.dataLoader.dropAggregationScopeCache();
			this.dataLoader.setScopeItem(scopeItemNode);
		},

		getControlEventListeners: function(controlName) {
			var listenersList = this._eventHandlers[controlName];

			if (!listenersList) {
				listenersList = [];
				this._eventHandlers[controlName] = listenersList;
			}

			return listenersList;
		},

		removeControlEventListeners: function(controlName) {
			var eventListeners = this.getControlEventListeners(controlName);
			var currentListener;
			var i;

			for (i = 0; i < eventListeners.length; i++) {
				currentListener = eventListeners[i];
				currentListener.remove();
			}

			eventListeners.length = 0;
		},

		isControlRegistered: function(controlType) {
			return Boolean(this._controls[controlType]);
		},

		getControlByName: function(controlName) {
			return this._controls[controlName];
		},

		onUnpickElement: function(targetElement) {
			var itemNode = targetElement.relationshipNode;

			if (itemNode) {
				if (itemNode.getAttribute('action') === 'add') {
					itemNode.parentNode.removeChild(itemNode);
				} else {
					this.setNodeAttribute(itemNode, 'action', 'delete');
					this.setNodeAttribute(targetElement.node, 'action', 'edit');
					this.setScopeDirtyState();
				}
			}
		},

		onExecuteAction: function(actionName, storeItem) {
		},

		isAllowedModelType: function(modelItemType) {
			switch (modelItemType) {
				case Enums.ModelItemTypes.Rule:
					return false;
				default:
					return true;
			}
		},

		onLockElement: function(targetElement) {
			var itemNode = targetElement.node;

			if (itemNode) {
				var treeControl = this.getControlByName('tree');
				var itemData = targetElement.itemData;
				var relationshipsNode = itemNode.selectSingleNode('Relationships');

				itemData.node = this.aras.lockItemEx(itemNode);
				itemData.lockState = Enums.LockStates.LockedByMe;

				if (relationshipsNode) {
					itemData.node.appendChild(relationshipsNode);
				}

				if (treeControl) {
					treeControl.updateRow(targetElement);
					treeControl.selectRow(targetElement);
				}
			}
		},

		onUnlockElement: function(targetElement) {
			var itemNode = targetElement.node;

			if (itemNode) {
				var treeControl = this.getControlByName('tree');
				var itemData = targetElement.itemData;
				var relationshipsNode = itemNode.selectSingleNode('Relationships');

				itemData.node = this.aras.unlockItemEx(itemNode);
				itemData.lockState = Enums.LockStates.Unlocked;

				if (relationshipsNode) {
					itemData.node.appendChild(relationshipsNode);
				}

				if (treeControl) {
					treeControl.updateRow(targetElement);
					treeControl.selectRow(targetElement.uniqueId);
				}
			}
		},

		isRecursiveElement: function(sourceElement, itemId) {
			if (sourceElement && itemId) {
				var relatedItemId = relatedItemNode.getAttribute('id');
				var dataStore = this.getControlByName('datastore');

				while (sourceElement) {
					if (sourceElement.itemId === relatedItemId) {
						return true;
					}

					sourceElement = dataStore.getElementById(sourceElement.parentId);
				}
			}

			return false;
		},

		onAddRelationship: function(targetElement, relationshipType, actionType) {
			return new Promise(function(resolve) {
				var sourceElement = targetElement.isGroup ? targetElement.parent : targetElement;
				var relationshipModelType = Enums.getRelatedItemModelType(relationshipType);
				var relatedItemType = Enums.getItemTypeFromModelType(relationshipModelType);
				var dataStore = targetElement.ownerStore;
				var treeControl = this.getControlByName('tree');
				var newStoreElement;
				var newRelationshipItem;
				var relatedItem;

				actionType = actionType || 'create';

				switch (actionType) {
					case 'create':
						newRelationshipItem = this.aras.newIOMItem(relationshipType, 'add');
						relatedItem = this.aras.newIOMItem(relatedItemType, 'add');

						// create new IOMitem
						newRelationshipItem.setProperty('source_id', sourceElement.node.getAttribute('id'));
						newRelationshipItem.setPropertyItem('related_id', relatedItem);

						this._appendRelationshipNode(sourceElement.node, newRelationshipItem.node);

						// create new storeItem
						newStoreElement = this.dataLoader.createModelElementFromNode(dataStore, relatedItem.node, {allowedTypes: this._allowedTypes});
						sourceElement.addChild(newStoreElement);

						if (treeControl) {
							treeControl.setExpandoState(newStoreElement.parent.uniqueId, true);
							treeControl.refreshData();
							treeControl.selectItem(newStoreElement);
						}

						this.setScopeDirtyState();
						resolve(newStoreElement);
						break;
					case 'pick':
						this.showSearchDialog(relatedItemType, function(selectedItemIds) {
							if (selectedItemIds.length) {
								var groupElement = sourceElement.groups[relationshipType] || sourceElement;
								var siblingElements = groupElement.getChildren(false, relatedItemType);
								var existingSiblingIds = {};
								var itemId;
								var itemNode;
								var isRecursiveStructure;
								var i;

								for (i = 0; i < siblingElements.length; i++) {
									existingSiblingIds[siblingElements[i].itemId] = true;
								}

								for (i = 0; i < selectedItemIds.length; i++) {
									itemId = selectedItemIds[i];

									if (!existingSiblingIds[itemId]) {
										itemNode = this.aras.getItemById(relatedItemType, itemId);

										if (itemNode) {
											isRecursiveStructure = dataStore.isRecursiveElement(sourceElement, itemId);

											if (!isRecursiveStructure) {
												relatedItem = this.convertNodeToIomItem(itemNode);

												newRelationshipItem = this.aras.newIOMItem(relationshipType, 'add');
												newRelationshipItem.setPropertyItem('related_id', relatedItem);

												this._appendRelationshipNode(sourceElement.node, newRelationshipItem.node);
												newStoreElement = this.dataLoader.createModelElementFromNode(dataStore, relatedItem.node, {allowedTypes: this._allowedTypes});
												sourceElement.addChild(newStoreElement);
											} else {
												this.aras.AlertError('Recursive structure');
											}
										}
									} else {
										this.aras.AlertError(this.aras.getResource('', 'configurator.source_contains_relateditem_with_id', sourceElement.dataType, relatedItemType, itemId));
									}
								}

								if (newStoreElement) {
									if (treeControl) {
										treeControl.setExpandoState(newStoreElement.parent.uniqueId, true);
										treeControl.refreshData();
									}

									this.setScopeDirtyState();
								}
							}

							resolve(newStoreElement);
						}.bind(this), {dblclickclose: false, multiselect: true});
						break;
				}
			}.bind(this));
		},

		showSearchDialog: function(itemTypeName, searchCallback, optionalParameters) {
			optionalParameters = optionalParameters || {};

			if (itemTypeName) {
				var dialogParams = {
					aras: this.aras,
					type: 'SearchDialog',
					multiselect: optionalParameters.multiselect || false,
					itemtypeName: itemTypeName
				};
				var onCloseHandler = function(searchResult) {
					if (searchResult && typeof searchCallback === 'function') {
						searchCallback(dialogParams.multiselect ? Array.isArray(searchResult) ? searchResult : [searchResult.itemID] : searchResult.item);
					}
				};

				if (optionalParameters.dblclickclose === false) {
					var doubleClickhandler = function(result, actionType) {
						if (actionType === 'doubleclick') {
							onCloseHandler(result);
							return false;
						}

						return true;
					};

					dialogParams.handler = doubleClickhandler;
				}

				return this.topWindow.ArasModules.Dialog.show('iframe', dialogParams).promise.then(onCloseHandler);
			}
		},

		_appendRelationshipNode: function(sourceNode, newNode) {
			var relationshipsNode = sourceNode.selectSingleNode('Relationships');

			if (!relationshipsNode) {
				relationshipsNode = sourceNode.ownerDocument.createElement('Relationships');
				sourceNode.appendChild(relationshipsNode);
			}

			this.setNodeAttribute(sourceNode, 'action', 'edit');
			relationshipsNode.appendChild(newNode);
		},

		setScopeDirtyState: function() {
			if (!this.aras.isDirtyEx(this.scopeItem)) {
				var treeControl = this.getControlByName('tree');

				this.setNodeAttribute(this.scopeItem, 'isDirty', '1');
				this.setNodeAttribute(this.scopeItem, 'action', 'update');

				if (treeControl) {
					var dataStore = treeControl.dataStore;
					var rootTreeElement = dataStore.getRootElement();

					treeControl.updateRow(rootTreeElement);
				}

				if (updateItemsGrid) {
					updateItemsGrid(this.scopeItem);
				}
			}
		},

		setNodeAttribute: function(targetNode, attributeName, attributeValue, optionalParameters) {
			if (targetNode && attributeName) {
				var casedAttributeName = attributeName.charAt(0).toUpperCase() + attributeName.substring(1);
				var specialSetter = this['_set' + casedAttributeName + 'Attribute'];

				if (specialSetter) {
					specialSetter.apply(this, arguments);
				} else {
					var currentValue = targetNode.getAttribute(attributeName);

					if (currentValue === undefined || (attributeValue !== currentValue)) {
						targetNode.setAttribute(attributeName, attributeValue);
					}
				}
			}
		},

		_setActionAttribute: function(targetNode, attributeName, attributeValue, optionalParameters) {
			if (attributeValue) {
				var currentAction = targetNode.getAttribute(attributeName);
				var isNewItem = currentAction === 'add';
				var isDeleted = currentAction === 'delete';
				var changeAllowed = true;

				optionalParameters = optionalParameters || {};

				if (!optionalParameters.forceUpdate) {
					switch (attributeValue) {
						case 'add':
							changeAllowed = !currentAction;
							break;
						case 'delete':
							changeAllowed = !isNewItem;
							break;
						case 'merge':
							changeAllowed = !isDeleted;
							break;
						case 'update':
							changeAllowed = !isNewItem && !isDeleted && currentAction !== 'edit';
							break;
						case 'edit':
							changeAllowed = !isNewItem && !isDeleted && currentAction !== 'update';
							break;
						default:
							changeAllowed = !isNewItem && !isDeleted;
							break;
					}
				}

				if (changeAllowed) {
					targetNode.setAttribute(attributeName, attributeValue);
				}
			}
		},

		convertNodeToIomItem: function(itemNode) {
			if (itemNode) {
				var iomItem = this.aras.newIOMItem();

				iomItem.dom = itemNode.ownerDocument;
				iomItem.node = itemNode;

				return iomItem;
			}
		},

		validateItemsState: function(breakOnFirstError) {
			var validationErrors = [];

			var treeControl = this.getControlByName('tree');
			if (treeControl) {
				var dataStore = treeControl.dataStore;
				var modelItemsHash = dataStore.itemsHash;

				for (var key in modelItemsHash) {
					var modelItem = modelItemsHash[key];
					var itemErrors = this.aras.clientItemValidation(modelItem.dataType, modelItem.node, breakOnFirstError);
					if (itemErrors.length) {
						validationErrors = validationErrors.concat(itemErrors);
						if (breakOnFirstError) {
							break;
						}
					}
				}
			}

			return validationErrors;
		}
	});
});
