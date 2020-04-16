/* global define */
define([
	'dojo/_base/declare',
	'Modules/aras.innovator.VariantManagementSample/Scripts/tableRuleEditor/dataModel/modelItem'
],
function(declare, ModelItem) {
	return declare(ModelItem, {
		_itemGroups: null,

		constructor: function(initialArguments) {
			this._itemGroups = {};
		},

		onChildGroupChanged: function(modelItem, groupName, changeAction) {
			if (changeAction == 'add') {
				if (!this._itemGroups[groupName]) {
					this.setItemGroup(groupName, {skipRecursive: true});
				}
			} else if (this._itemGroups[groupName]) {
				var groupedChildren = this.getChildrenByGroup(groupName);

				if (!groupedChildren.length) {
					this.removeItemGroup(groupName, {skipRecursive: true});
				}
			}
		},

		getChildrenByGroup: function(groupName) {
			return this.getChildrenByParameters({group: groupName}, {isRecursive: true});
		},

		addChild: function(targetItem) {
			if (targetItem && targetItem.parent !== this) {
				this.inherited(arguments);
				targetItem.addEventListener(this, this, 'onItemGroupChanged', this.onChildGroupChanged);
			}
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

		getChildrenByParameters: function(filterParameters, optionalParameters, foundItems) {
			var childItems = this.children;
			var currentChildItem;
			var filterParameterName;
			var filterParameterValue;
			var i;

			filterParameters = filterParameters || {};
			optionalParameters = optionalParameters || {};
			foundItems = foundItems || [];

			for (i = 0; i < childItems.length; i++) {
				currentChildItem = childItems[i];
				isCheckPassed = true;

				for (filterParameterName in filterParameters) {
					filterParameterValue = filterParameters[filterParameterName];

					switch (filterParameterName) {
						case 'group':
							isCheckPassed = currentChildItem.isItemFromGroup(filterParameterValue);
							break;
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

				if (optionalParameters.isRecursive) {
					currentChildItem.getChildrenByParameters(filterParameters, optionalParameters, foundItems);
				}
			}

			return foundItems;
		},

		isItemFromGroup: function(groupName) {
			return this._itemGroups[groupName];
		},

		getItemGroups: function() {
			return Object.keys(this._itemGroups);
		},

		getInheritedGroup: function() {
			return this.parent && (this.parent.getItemGroup && (this.parent.getItemGroup() || this.parent.getInheritedGroup()));
		},

		removeAllItemGroups: function(optionalParameters) {
			this.removeItemGroup(this.getItemGroups(), optionalParameters);
		},

		removeItemGroup: function(groupNames, optionalParameters) {
			var groupName;
			var childItem;
			var i;
			var j;

			groupNames = groupNames ? (Array.isArray(groupNames) ? groupNames : [groupNames]) : [];

			for (i = 0; i < groupNames.length; i++) {
				groupName = groupNames[i];

				if (this._itemGroups[groupName]) {
					optionalParameters = optionalParameters || {};

					delete this._itemGroups[groupName];

					// set group for all descendant items
					if (!optionalParameters.skipRecursive) {
						for (j = 0; j < this.children.length; j++) {
							childItem = this.children[j];
							childItem.removeItemGroup(groupName, {suppressEvent: true});
						}
					}

					if (!optionalParameters.suppressEvent) {
						this.raiseEvent('onItemGroupChanged', this, groupName, 'remove');
					}
				}
			}
		},

		setItemGroup: function(groupNames, optionalParameters) {
			var groupName;
			var childItem;
			var i;
			var j;

			groupNames = groupNames ? (Array.isArray(groupNames) ? groupNames : [groupNames]) : [];

			for (i = 0; i < groupNames.length; i++) {
				groupName = groupNames[i];

				if (!this._itemGroups[groupName]) {
					optionalParameters = optionalParameters || {};

					this._itemGroups[groupName] = true;

					// set group for all descendant items
					if (!optionalParameters.skipRecursive) {
						for (j = 0; j < this.children.length; j++) {
							currentItem = this.children[j];
							currentItem.setItemGroup(groupName, {suppressEvent: true});
						}
					}

					if (!optionalParameters.suppressEvent) {
						this.raiseEvent('onItemGroupChanged', this, groupName, 'add');
					}
				}
			}
		}
	});
});
