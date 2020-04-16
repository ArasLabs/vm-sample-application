define(['dojo/_base/declare'], function(declare) {
	return declare(null, {
		_aras: null,

		_usageConditionSourceItemType: null,

		_usageConditionItemType: null,

		_usageConditionVariabilityItemRelationshipItemType: null,

		_isUsageConditionItemTypeMetadataInitialized: false,

		constructor: function(aras, usageConditionSourceItemTypeName) {
			this._aras = aras;
			this._usageConditionSourceItemType = usageConditionSourceItemTypeName;

			Object.defineProperty(this, 'usageConditionItemType', {
				get: function() {
					this._initUsageConditionItemTypeMetadata();

					return this._usageConditionItemType;
				},
				enumerable: true
			});

			Object.defineProperty(this, 'usageConditionVariabilityItemRelationshipItemType', {
				get: function() {
					this._initUsageConditionItemTypeMetadata();

					return this._usageConditionVariabilityItemRelationshipItemType;
				},
				enumerable: true
			});
		},

		fetchItems: function(usageConditionSourceItemId) {
			const usageConditionItemTypeName = this.usageConditionItemType;

			if (!usageConditionItemTypeName) {
				return this._aras.IomInnovator.newError(
					'No Usage Condition ItemType found'
				);
			}

			const usageConditionItems = this._aras.newIOMItem(usageConditionItemTypeName, 'get');
			usageConditionItems.setAttribute('select', 'definition,string_notation');
			usageConditionItems.setProperty('source_id', usageConditionSourceItemId);

			const variabilityItemRelationshipItem = usageConditionItems.createRelationship(this.usageConditionVariabilityItemRelationshipItemType, 'get');
			variabilityItemRelationshipItem.setAttribute('select', 'related_id(keyed_name)');

			return usageConditionItems.apply();
		},

		_getUsageConditionRelationshipType: function(usageConditionSourceItemTypeName) {
			const vmExpressionPolyItemTypeId = '997CD7112AF84DAAA21EF9DC55518AA9';
			const vmVariabilityItemTypeId = 'A2A374A6028444A58989E0A38E7222B7';

			const usageConditionRelationshipType = this._aras.newIOMItem('RelationshipType', 'get');
			usageConditionRelationshipType.setAttribute('maxRecords', '1');
			usageConditionRelationshipType.setAttribute('select', 'relationship_id');

			const usageConditionSourceItemType = usageConditionRelationshipType.createPropertyItem('source_id', 'ItemType', '');
			usageConditionSourceItemType.setProperty('name', usageConditionSourceItemTypeName);

			const usageConditionRelationshipItemType = usageConditionRelationshipType.createPropertyItem('relationship_id', 'ItemType', 'get');
			usageConditionRelationshipItemType.setAttribute('select', 'id');

			const morphaeItem = this._aras.newIOMItem('Morphae');
			morphaeItem.setProperty('source_id', vmExpressionPolyItemTypeId);

			usageConditionRelationshipItemType.setPropertyItem('id', morphaeItem);
			usageConditionRelationshipItemType.setPropertyCondition('id', 'in');
			usageConditionRelationshipItemType.setPropertyAttribute('id', 'by', 'related_id');

			const variabilityItemRelationshipType = usageConditionRelationshipItemType.createRelationship('RelationshipType', 'get');
			variabilityItemRelationshipType.setAttribute('select', 'name');
			variabilityItemRelationshipType.setProperty('related_id', vmVariabilityItemTypeId);

			return usageConditionRelationshipType.apply();
		},

		_initUsageConditionItemTypeMetadata: function() {
			if (this._isUsageConditionItemTypeMetadataInitialized) {
				return;
			}

			const usageConditionRelationshipTypeItem = this._getUsageConditionRelationshipType(
				this._usageConditionSourceItemType
			);

			if (usageConditionRelationshipTypeItem.isError()) {
				return;
			}

			this._usageConditionItemType = usageConditionRelationshipTypeItem.getPropertyAttribute('relationship_id', 'name');

			const usageConditionRelationshipItemType = usageConditionRelationshipTypeItem.getPropertyItem('relationship_id');
			const variabilityItemRelationshipType = usageConditionRelationshipItemType.getRelationships().getItemByIndex(0);

			this._usageConditionVariabilityItemRelationshipItemType = variabilityItemRelationshipType.getProperty('name');

			this._isUsageConditionItemTypeMetadataInitialized = true;
		}
	});
});
