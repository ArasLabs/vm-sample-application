/* global define */
define([
	'dojo/_base/declare',
	'Modules/aras.innovator.core.Core/Scripts/Classes/Eventable',
	'Modules/aras.innovator.VariantManagementSample/Scripts/scopeRules/modelEnums',
	'Modules/aras.innovator.VariantManagementSample/Scripts/tableRuleEditor/dataModel/comparableModelItem'
],
function(declare, Eventable, Enums, Comparable) {
	return declare([Eventable, Comparable], {
		_uniqueIdCounter: {count: 1},
		_aras: null,
		_itemFactory: null,
		_validationErrors: '',

		internal: null,
		parent: null,
		ownerModel: null,
		uniqueId: null,
		children: null,
		fields: null,

		constructor: function(initialArguments) {
			initialArguments = initialArguments || {};

			this._aras = initialArguments.aras;
			this._itemFactory = initialArguments.factory;

			this.internal = {
				itemData: initialArguments.itemData || {},
				notificationsSuspended: 0,
				notificationInfo: {}
			};
			this.uniqueId = this._getNextUniqueId();
			this.children = [];
			this.fields = [this];

			this.defineProperties();

			if (this.isNew()) {
				this.validateItem();
			}
		},

		defineProperties: function() {
			Object.defineProperty(this, 'itemData', {
				get: function() {
					return this.internal.itemData;
				},
				set: function(newData) {
					if (newData) {
						this.internal.itemData = newData;
					}
				}
			});

			Object.defineProperty(this, 'itemId', {
				get: function() {
					return this.internal.itemData.itemId;
				}
			});

			Object.defineProperty(this, 'itemType', {
				get: function() {
					return this.internal.itemData.itemType;
				}
			});

			Object.defineProperty(this, 'id', {
				get: function() {
					return this.uniqueId;
				}
			});

			Object.defineProperty(this, 'icon', {
				get: function() {
					return this.ownerModel && this.ownerModel.getIconPath(this);
				}
			});

			Object.defineProperty(this, 'node', {
				get: function() {
					return this.internal.itemData.node;
				}
			});
		},

		_getNextUniqueId: function() {
			return this._uniqueIdCounter.count++;
		},

		isRegistered: function() {
			return Boolean(this.ownerModel);
		},

		registerItem: function(dataModel) {
			if (dataModel && this.ownerModel !== dataModel) {
				var currentChild;
				var i;

				this.unregisterItem();

				this.ownerModel = dataModel;
				this.ownerModel.registerItem(this);

				for (i = 0; i < this.children.length; i++) {
					currentChild = this.children[i];
					currentChild.registerItem(dataModel);
				}
			}
		},

		unregisterItem: function() {
			if (this.isRegistered()) {
				var currentChild;
				var i;

				this.ownerModel.unregisterItem(this);

				for (i = 0; i < this.children.length; i++) {
					currentChild = this.children[i];
					currentChild.unregisterItem();
				}
			}
		},

		getRelationshipNode: function() {
			var itemNode = this.internal.itemData.node;

			return itemNode.parentNode && itemNode.parentNode.parentNode;
		},

		getRelationshipType: function(targetItem) {
			var relationshipNode = this.getRelationshipNode();

			return relationshipNode && relationshipNode.getAttribute('type');
		},

		addChild: function(targetItem, optionalParameters) {
			if (targetItem && targetItem.parent !== this) {
				var oldChildCount = this.children.length;

				optionalParameters = optionalParameters || {};

				if (targetItem.parent) {
					targetItem.parent.removeChild(targetItem);
				}

				this.children.push(targetItem);
				targetItem.parent = this;

				if (oldChildCount !== this.children.length) {
					this.sortChildren();
				}

				if (targetItem.isNew() || optionalParameters.appendItemNode) {
					this._appendChildItemNode(targetItem);
				}

				targetItem.registerItem(this.ownerModel);
			}
		},

		_appendChildItemNode: function(childModelItem) {
			if (childModelItem) {
				var childRelationshipNode = childModelItem.getRelationshipNode() || childModelItem.createRelationshipNode();
				var itemRelatinshipsNode = this._getRelationshipsNode();

				if (childRelationshipNode.parentNode !== itemRelatinshipsNode) {
					itemRelatinshipsNode.appendChild(childRelationshipNode);
				}
			}
		},

		_removeChildItemNode: function(childModelItem) {
			if (childModelItem) {
				var childRelationshipNode = childModelItem.getRelationshipNode();
				var itemRelatinshipsNode = this._getRelationshipsNode();

				if (childRelationshipNode && childRelationshipNode.parentNode === itemRelatinshipsNode) {
					itemRelatinshipsNode.removeChild(childRelationshipNode);
				}
			}
		},

		_getRelationshipsNode: function() {
			var itemNode = this.node;
			var relationshipsNode = itemNode.selectSingleNode('Relationships');

			if (!relationshipsNode) {
				relationshipsNode = itemNode.ownerDocument.createElement('Relationships');
				itemNode.appendChild(relationshipsNode);
			}

			return relationshipsNode;
		},

		createRelationshipNode: function() {
			var relationshipNode = this.relationshipNode;

			if (!relationshipNode && this.parent) {
				var sourceItemType = this.parent.getType();
				var relatedItemType = this.getType();
				var relationshipModelType = Enums.getRelationshipTypeFromRelatedType(sourceItemType, relatedItemType);
				var relationshipItem = this._aras.newIOMItem(Enums.getItemTypeFromModelType(relationshipModelType), 'add');
				var itemData = this.internal.itemData;

				relationshipItem.setRelatedItem(this.convertToIOM());
				relationshipNode = relationshipItem.node;

				itemData.node = relationshipItem.getRelatedItem().node;
			}

			return relationshipNode;
		},

		removeChild: function(targetItem) {
			if (targetItem) {
				if (targetItem.parent === this) {
					var childIndex = this.children.indexOf(targetItem);

					this.children.splice(childIndex, 1);

					targetItem.unregisterItem();
					targetItem.removeEventListeners(this);

					if (targetItem.isNew()) {
						this._removeChildItemNode(targetItem);
					}

					targetItem.parent = null;
				}
			}
		},

		clone: function() {
			var clonedItemData = {};
			var itemData = this.internal.itemData;
			var dataParameter;

			for (dataParameter in itemData) {
				clonedItemData[dataParameter] = itemData[dataParameter];
			}

			clonedItemData.node = clonedItemData.node.cloneNode(true);
			clonedItemData.relationshipNode = null;

			return this._itemFactory.createModelItemFromData(clonedItemData);
		},

		getChildren: function(isDeepSearch, itemTypeFilter, foundChildren) {
			var childItems = this.children;
			var currentChild;
			var i;

			foundChildren = foundChildren || [];

			for (i = 0; i < childItems.length; i++) {
				currentChild = childItems[i];

				if (!itemTypeFilter || currentChild.itemType == itemTypeFilter) {
					foundChildren.push(currentChild);
				}

				if (isDeepSearch) {
					currentChild.getChildren(isDeepSearch, itemTypeFilter, foundChildren);
				}
			}

			return foundChildren;
		},

		getChildrenByParameters: function(filterParameters) {
			var childItems = this.children;
			var foundItems = [];
			var currentChildItem;
			var filterParameterName;
			var filterParameterValue;
			var i;

			filterParameters = filterParameters || {};

			for (i = 0; i < childItems.length; i++) {
				currentChildItem = childItems[i];
				isCheckPassed = true;

				for (filterParameterName in filterParameters) {
					filterParameterValue = filterParameters[filterParameterName];

					switch (filterParameterName) {
						case 'relationshipType':
							isCheckPassed = currentChildItem.getRelationshipType() === filterParameterValue;
							break;
						case 'itemId':
							isCheckPassed = currentChildItem.itemId === filterParameterValue;
							break;
						case 'isDeleted':
							isCheckPassed = currentChildItem.isDeleted() === filterParameterValue;
							break;
						default:
							isCheckPassed = currentChildItem[filterParameterName] === filterParameterValue;
							break;
					}

					if (!isCheckPassed) {
						break;
					}
				}

				if (isCheckPassed) {
					foundItems.push(currentChildItem);
				}
			}

			return foundItems;
		},

		getType: function() {
			var itemData = this.internal.itemData;

			return itemData && itemData.itemType;
		},

		sortChildren: function(deepSort) {
			if (this.ownerModel && this.ownerModel.sortingActive) {
				var i;

				this.children.sort(this.ownerModel.itemSorter);

				if (deepSort) {
					for (i = 0; i < this.children.length; i++) {
						this.children[i].sortChildren(deepSort);
					}
				}
			}
		},

		getId: function() {
			return this._id;
		},

		isRoot: function() {
			return !this.parent;
		},

		isNew: function() {
			var itemNode = this.getRelationshipNode() || this.node;

			return Boolean(itemNode && itemNode.getAttribute('action') === 'add');
		},

		isDeleted: function() {
			var itemNode = this.getRelationshipNode() || this.node;

			return Boolean(itemNode && itemNode.getAttribute('action') === 'delete');
		},

		isParentDeleted: function(targetElement) {
			return this.parent ? (this.parent.isDeleted() || this.parent.isParentDeleted()) : false;
		},

		SuspendNotifications: function() {
			this.internal.notificationsSuspended++;
		},

		ResumeNotifications: function() {
			this.internal.notificationsSuspended--;

			if (!this.internal.notificationsSuspended && this.internal.notificationStopped) {
				this.NotifyChanged();

				this.internal.notificationStopped = false;
				this.internal.notificationInfo = {};
			}
		},

		onChanged: function(changeType, parameterName, parameterValue) {
			this.isModified(true);
			this.NotifyChanged(changeType, parameterName, parameterValue);
		},

		isModified: function(value) {
			var itemData = this.internal.itemData;

			if (value === undefined) {
				return Boolean(itemData && itemData.isModified);
			}

			itemData.isModified = Boolean(value);
		},

		NotifyChanged: function(changeType, parameterName, parameterValue) {
			var notificationInfo = this.internal.notificationInfo;

			if (changeType && parameterName) {
				var typedNotificationInfo = notificationInfo[changeType] || (notificationInfo[changeType] = {});

				typedNotificationInfo[parameterName] = parameterValue;
			}

			if (this.internal.notificationsSuspended) {
				this.internal.notificationStopped = true;
			} else {
				this.raiseEvent('onItemChanged', this, notificationInfo);
				this.internal.notificationInfo = {};
			}
		},

		setItemProperty: function(propertyName, propertyValue, optionalParameters) {
			if (propertyName) {
				var currentPropertyValue = this.getItemProperty(propertyName);

				optionalParameters = optionalParameters || {};

				if (currentPropertyValue !== propertyValue || optionalParameters.forceUpdate) {
					this.SuspendNotifications();
					this._aras.setItemProperty(this.node, propertyName, propertyValue);

					if (!optionalParameters.suppressActionChange) {
						this.setItemAttribute('action', 'edit');
					}

					this.validateItem();

					if (!optionalParameters.suppressEvent) {
						this.onChanged('property', propertyName, propertyValue);
					}

					this.ResumeNotifications();
				}
			}
		},

		getItemProperty: function(propertyName, defaultValue) {
			return propertyName && this._aras.getItemProperty(this.node, propertyName, defaultValue);
		},

		getItemAttribute: function(attributeName) {
			return this.node && this.node.getAttribute(attributeName);
		},

		setItemAttribute: function(attributeName, attributeValue, optionalParameters) {
			if (attributeName) {
				var casedAttributeName = attributeName.charAt(0).toUpperCase() + attributeName.substring(1);
				var specialSetter = this['_setItem' + casedAttributeName + 'Attribute'];
				var isAttributeChanged;

				optionalParameters = optionalParameters || {};

				if (specialSetter) {
					isAttributeChanged = specialSetter.apply(this, [attributeName, attributeValue, optionalParameters]);
				} else {
					var currentValue = this.getItemAttribute(attributeName);

					if (currentValue === undefined || (attributeValue !== currentValue)) {
						var itemNode = optionalParameters.itemNode || this.node;

						itemNode.setAttribute(attributeName, attributeValue);
						isAttributeChanged = true;
					}
				}

				if (isAttributeChanged && !optionalParameters.suppressEvent) {
					this.onChanged('attribute', attributeName, attributeValue);
				}
			}
		},

		setItemAttributeSilent: function(attributeName, attributeValue, optionalParameters) {
			optionalParameters = optionalParameters || {};
			optionalParameters.suppressEvent = true;

			this.setItemAttribute(attributeName, attributeValue, optionalParameters);
		},

		_setItemActionAttribute: function(attributeName, attributeValue, optionalParameters) {
			if (attributeValue) {
				var currentAction = this.getItemAttribute(attributeName);
				var itemNode = optionalParameters.itemNode || this.node;
				var isNewItem = this.isNew();
				var isDeleted = this.isDeleted();
				var changeAllowed = true;

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
						default:
							changeAllowed = !isNewItem && !isDeleted;
							break;
					}
				}

				if (changeAllowed) {
					itemNode.setAttribute(attributeName, attributeValue);
					return true;
				}
			}
		},

		_encodePropertyValue: function(proppertyValue) {
			return proppertyValue && proppertyValue.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&apos;').replace(/<([^>])*>/g, '')
				.replace(/</g, '&lt;').replace(/>/g, '&gt;');
		},

		validateItem: function() {
			var clonedNode = this.node.cloneNode(true);
			var relationshipsNode = clonedNode.selectSingleNode('Relationships');
			var errorMessage = '';
			var validationErrors;
			var i;

			if (relationshipsNode) {
				clonedNode.removeChild(relationshipsNode);
			}

			validationErrors = this._aras.clientItemValidation(clonedNode.getAttribute('type'), clonedNode, false);
			for (i = 0; i < validationErrors.length; i++) {
				errorMessage = errorMessage + validationErrors[i].message + '</br>';
			}

			this._validationErrors = this._encodePropertyValue(errorMessage);
		},

		isItemValid: function() {
			return !this._validationErrors;
		},

		getErrorString: function() {
			return this._validationErrors;
		},

		convertToIOM: function(targetItemNode) {
			var resultIOMItem = this._aras.newIOMItem();
			var itemNode = targetItemNode || this.node;

			resultIOMItem.dom = itemNode.ownerDocument;
			resultIOMItem.node = itemNode;

			return resultIOMItem;
		},

		getItemIdPath: function() {
			var idPath = [this.itemId];
			var parentElement = this.parent;

			while (parentElement) {
				idPath.push(parentElement.itemId);
				parentElement = parentElement.parent;
			}

			idPath.reverse();

			return idPath;
		},

		getUniqueIdPath: function() {
			var idPath = [this.uniqueId];
			var parentElement = this.parent;

			while (parentElement) {
				idPath.push(parentElement.uniqueId);
				parentElement = parentElement.parent;
			}

			idPath.reverse();

			return idPath;
		}
	});
});
