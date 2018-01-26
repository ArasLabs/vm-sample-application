define('Configurator/Scripts/ScopeRules/ModelEnums', [], function() {
	return {
		LockStates: {
			Unlocked: 0,
			Locked: 1,
			LockedByMe: 2
		},

		ModelItemTypes: {
			Unknown: 0,
			GenericItem: 10,
			GenericItemStructure: 11,
			RelevantFamily: 12,
			Rule: 13,
			Family: 20,
			FamilyOption: 21,
			Option: 30
		},

		getRelationshipModelTypes: function(modelType) {
			var itemTypes = this.ModelItemTypes;

			modelType = typeof modelType === 'number' ? modelType : this.getModelTypeFromItemType(modelType);

			switch (modelType) {
				case itemTypes.GenericItem:
					return [itemTypes.RelevantFamily];
				case itemTypes.Family:
					return [itemTypes.FamilyOption];
				default:
					return [];
			}
		},

		getRelatedItemModelType: function(modelType) {
			var itemTypes = this.ModelItemTypes;

			modelType = typeof modelType === 'number' ? modelType : this.getModelTypeFromItemType(modelType);

			switch (modelType) {
				case itemTypes.GenericItemStructure:
					return itemTypes.GenericItem;
				case itemTypes.RelevantFamily:
					return itemTypes.Family;
				case itemTypes.FamilyOption:
					return itemTypes.Option;
				default:
					return itemTypes.Unknown;
			}
		},

		getRelationshipTypeFromRelatedType: function(sourceModelType, relatedModelType) {
			var relationshipTypes = this.getRelationshipModelTypes(sourceModelType);
			var relationshipType;
			var modelType;
			var i;

			relatedModelType = typeof relatedModelType === 'number' ? relatedModelType : this.getModelTypeFromItemType(relatedModelType);

			for (i = 0; i < relationshipTypes.length; i++) {
				relationshipType = relationshipTypes[i];
				modelType = this.getRelatedItemModelType(relationshipType);

				if (modelType === relatedModelType) {
					return relationshipType;
				}
			}

			return this.ModelItemTypes.Unknown;
		},

		getItemTypeFromModelType: function(elementType) {
			var itemTypes = this.ModelItemTypes;

			switch (elementType) {
				case itemTypes.GenericItem:
					return 'cs_sample_GenericItem';
				case itemTypes.GenericItemStructure:
					return 'cs_sample_GenericItemStructure';
				case itemTypes.RelevantFamily:
					return 'cs_sample_RelevantFamilies';
				case itemTypes.Rule:
					return 'cs_sample_Rule';
				case itemTypes.Family:
					return 'cs_sample_Family';
				case itemTypes.FamilyOption:
					return 'cs_sample_FamilyOption';
				case itemTypes.Option:
					return 'cs_sample_Option';
				default:
					break;
			}
		},

		getModelTypeFromItemType: function(itemTypeName) {
			var itemTypes = this.ModelItemTypes;

			switch (itemTypeName) {
				case 'cs_sample_GenericItem':
					return itemTypes.GenericItem;
				case 'cs_sample_GenericItemStructure':
					return itemTypes.GenericItemStructure;
				case 'cs_sample_RelevantFamilies':
					return itemTypes.RelevantFamily;
				case 'cs_sample_Rule':
					return itemTypes.Rule;
				case 'cs_sample_Family':
					return itemTypes.Family;
				case 'cs_sample_FamilyOption':
					return itemTypes.FamilyOption;
				case 'cs_sample_Option':
					return itemTypes.Option;
				default:
					break;
			}
		},

		getItemLabelFromModelType: function(elementType) {
			var itemTypes = this.ModelItemTypes;

			switch (elementType) {
				case itemTypes.GenericItem:
					return 'GenericItem';
				case itemTypes.GenericItemStructure:
					return 'GenericItemStructure';
				case itemTypes.RelevantFamily:
					return 'RelevantFamilies';
				case itemTypes.Rule:
					return 'Rule';
				case itemTypes.Family:
					return 'Family';
				case itemTypes.FamilyOption:
					return 'FamilyOption';
				case itemTypes.Option:
					return 'Option';
				default:
					break;
			}
		}
	};
});
