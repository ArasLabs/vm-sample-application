define([
	'dojo/_base/declare',
	'Modules/aras.innovator.VariantManagementSample/Scripts/tableRuleEditor/dataModel/baseDataModel'
],
function(declare, BaseDataModel) {
	return declare([BaseDataModel], {
		_scopeId: null,

		constructor: function(initialArguments) {
		},

		cleanupRequestCache: function() {
			this._dataLoader._dropAggregationScopeCache();
		},

		loadSampleData: function(scopeId, optionalParameters) {
			this._parsingData = true;

			optionalParameters = optionalParameters || {};

			if (scopeId) {
				var scopeAggregatedData = this._dataLoader.getAggregatedSampleData(scopeId, optionalParameters);
				var scopeItemData = scopeAggregatedData.length && scopeAggregatedData[0];
				var allowedItemTypes = optionalParameters.allowedItemTypes || [];
				var allowedTypeHash;

				allowedItemTypes = Array.isArray(allowedItemTypes) ? allowedItemTypes : [allowedItemTypes];

				if (allowedItemTypes.length) {
					allowedTypeHash = {};

					for (var i = 0; i < allowedItemTypes.length; i++) {
						allowedTypeHash[allowedItemTypes[i]] = true;
					}
				}

				this._rememberGroupedItems();
				this.cleanupData();

				this._scopeId = scopeId;

				if (scopeItemData) {
					var scopeModelItem = this.itemFactory.createModelItemFromData(scopeAggregatedData[0], {allowedItemTypes: allowedTypeHash});

					scopeModelItem.registerItem(this);
				}

				this.restoreGroupedItems();
			}

			this._parsingData = false;
		}
	});
});
