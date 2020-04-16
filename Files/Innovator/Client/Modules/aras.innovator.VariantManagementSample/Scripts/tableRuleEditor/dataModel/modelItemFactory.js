/* global define */
define([
	'dojo/_base/declare',
	'Modules/aras.innovator.VariantManagementSample/Scripts/tableRuleEditor/dataModel/modelItem',
	'Modules/aras.innovator.VariantManagementSample/Scripts/tableRuleEditor/dataModel/groupedModelItem',
	'Modules/aras.innovator.VariantManagementSample/Scripts/tableRuleEditor/dataModel/expressionModelItem'
],
function(declare, BaseModelItem, GroupedModelItem, ExpressionModelItem) {
	return declare(null, {
		ownerModel: null,

		constructor: function(initialArguments) {
			initialArguments = initialArguments || {};

			this.ownerModel = initialArguments.dataModel;
		},

		_getModelItemConstructor: function(itemTypeName) {
			var modelItemConstructor;

			switch (itemTypeName) {
				case 'vm_VariabilityItem':
					modelItemConstructor = BaseModelItem;
					break;
				case 'vm_Rule':
					modelItemConstructor = ExpressionModelItem;
					break;
				default:
					modelItemConstructor = GroupedModelItem;
					break;
			}

			return modelItemConstructor;
		},

		createNewModelItem: function(itemType, optionalParameters) {
			if (itemType) {
				var arasInstance = this.ownerModel.aras;
				var itemNode = arasInstance.newItem(itemType, 'add');
				var newModelItem;

				optionalParameters = optionalParameters || {};

				newModelItem = this.createModelItemFromData({
					itemId: itemNode.getAttribute('id'),
					itemType: itemType,
					node: itemNode,
					children: []
				}, optionalParameters);

				return newModelItem;
			}
		},

		createModelItemFromData: function(inputItemData, optionalParameters) {
			if (inputItemData) {
				var arasInstance = this.ownerModel.aras;
				var allowedItemTypes = optionalParameters.allowedItemTypes;
				var newModelItem;

				if (!allowedItemTypes || allowedItemTypes[inputItemData.itemType]) {
					var ModelItemConstructor = this._getModelItemConstructor(inputItemData.itemType);
					var constructorArguments = {aras: arasInstance, factory: this, itemData: inputItemData};
					var childItemsData = inputItemData.children;

					var childModelItem;
					var itemData;
					var propertyName;
					var i;

					optionalParameters = optionalParameters || {};

					if (optionalParameters.constructorArguments) {
						var argumentName;

						for (argumentName in optionalParameters.constructorArguments) {
							constructorArguments[argumentName] = optionalParameters.constructorArguments[argumentName];
						}
					}

					newModelItem = new ModelItemConstructor(constructorArguments);

					if (optionalParameters.uniqueId) {
						newModelItem.uniqueId = optionalParameters.uniqueId;
					}

					if (optionalParameters.modelItemProperties) {
						for (propertyName in optionalParameters.modelItemProperties) {
							newModelItem[propertyName] = optionalParameters.modelItemProperties[propertyName];
						}
					}

					if (optionalParameters.itemProperties) {
						for (propertyName in optionalParameters.itemProperties) {
							newModelItem.setItemProperty(propertyName, optionalParameters.itemProperties[propertyName]);
						}
					}

					if (childItemsData) {
						for (i = 0; i < childItemsData.length; i++) {
							itemData = childItemsData[i];
							childModelItem = this.createModelItemFromData(itemData, optionalParameters);

							if (childModelItem) {
								newModelItem.addChild(childModelItem);
							}
						}
					}
				}

				return newModelItem;
			}
		},

		createModelItemFromItemNode: function(targetNode, optionalParameters) {
			optionalParameters = optionalParameters || {};

			if (targetNode) {
				var arasInstance = this.ownerModel.aras;
				var allowedItemTypes = optionalParameters.allowedItemTypes;
				var itemType = targetNode.getAttribute('type');

				if (!allowedItemTypes || allowedItemTypes[itemType]) {
					var relatedItemNodes = targetNode.selectNodes('./Relationships/Item/related_id/Item');
					var itemData = {
						itemId: targetNode.getAttribute('id'),
						name: arasInstance.getItemProperty(targetNode, 'name'),
						itemType: itemType,
						node: targetNode
					};
					var relationshipNode;
					var relationshipType;
					var newModelItem;
					var relatedItem;
					var i;

					newModelItem = this.createModelItemFromData(itemData, optionalParameters);

					for (i = 0; i < relatedItemNodes.length; i++) {
						currentNode = relatedItemNodes[i];
						relationshipNode = currentNode.parentNode.parentNode;
						relationshipType = relationshipNode.getAttribute('type');

						if (!allowedItemTypes || allowedItemTypes[relationshipType]) {
							relatedItem = this.createModelItemFromItemNode(currentNode, optionalParameters);

							if (relatedItem) {
								newModelItem.addChild(relatedItem);
							}
						}
					}

					return newModelItem;
				}
			}
		}
	});
});
