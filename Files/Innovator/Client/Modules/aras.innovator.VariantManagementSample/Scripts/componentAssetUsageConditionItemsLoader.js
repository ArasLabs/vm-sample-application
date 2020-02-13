define(['dojo/_base/declare'], function(declare) {
	return declare(null, {
		_aras: null,

		constructor: function(aras) {
			this._aras = aras;

			Object.defineProperty(this, 'usageConditionItemType', {
				get: function() {
					return 'vm_VarComponentAssetUsage';
				},
				enumerable: true
			});

			Object.defineProperty(this, 'usageConditionVariabilityItemRelationshipItemType', {
				get: function() {
					return 'vm_VarComponentAssetUsageVarIt';
				},
				enumerable: true
			});
		},

		getExpressionItems: function(usageConditionSourceItemId) {
			const expressionItems = this._aras.newIOMItem(this.usageConditionItemType, 'get');
			expressionItems.setProperty('source_id', usageConditionSourceItemId);

			const componentAssetUsageVarItem = expressionItems.createRelationship(this.usageConditionVariabilityItemRelationshipItemType, 'get');
			componentAssetUsageVarItem.setAttribute('select', 'related_id(keyed_name)');

			return expressionItems.apply();
		}
	});
});
