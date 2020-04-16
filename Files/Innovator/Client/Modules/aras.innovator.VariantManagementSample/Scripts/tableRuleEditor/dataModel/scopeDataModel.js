define([
	'dojo/_base/declare',
	'Modules/aras.innovator.VariantManagementSample/Scripts/tableRuleEditor/dataModel/baseDataModel'
],
function(declare, BaseDataModel) {
	return declare([BaseDataModel], {
		_scopeItem: null,
		_scopeId: null,

		constructor: function(initialArguments) {
		},

		setScopeItem: function(scopeItemNode, optionalParameters) {
			this._parsingData = true;

			optionalParameters = optionalParameters || {};

			if (scopeItemNode) {
				var allowedItemTypes = optionalParameters.allowedItemTypes || [];
				var allowedTypeHash;
				var scopeModelItem;

				allowedItemTypes = Array.isArray(allowedItemTypes) ? allowedItemTypes : [allowedItemTypes];

				if (allowedItemTypes.length) {
					allowedTypeHash = {};

					for (i = 0; i < allowedItemTypes.length; i++) {
						allowedTypeHash[allowedItemTypes[i]] = true;
					}
				}

				this._rememberGroupedItems();
				this.cleanupData();

				this._scopeItem = scopeItemNode;
				this._scopeId = scopeItemNode.getAttribute('id');

				scopeModelItem = this.itemFactory.createModelItemFromItemNode(scopeItemNode, {allowedItemTypes: allowedTypeHash});
				scopeModelItem.registerItem(this);

				this.restoreGroupedItems();
			}

			this._parsingData = false;
		}
	});
});
