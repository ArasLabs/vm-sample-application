define('Modules/aras.innovator.VariantManagementSample/Scripts/scopeRules/modelEnums', [], function() {
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
			VariabilityItemRule: 13,
			Family: 20,
			FamilyOption: 21,
			Rule: 22,
			Option: 30
		},

		getRelationshipModelTypes: function(modelType) {
			var itemTypes = this.ModelItemTypes;

			modelType = typeof modelType === 'number' ? modelType : this.getModelTypeFromItemType(modelType);

			switch (modelType) {
				case itemTypes.GenericItem:
					return [itemTypes.RelevantFamily, itemTypes.VariabilityItemRule];
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
				case itemTypes.VariabilityItemRule:
					return itemTypes.Rule;
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
				case itemTypes.VariabilityItemRule:
					return 'vm_VariabilityItemRule';
				case itemTypes.GenericItem:
					return 'vm_VariabilityItem';
				case itemTypes.GenericItemStructure:
					return 'vm_VariabilityItemStructure';
				case itemTypes.RelevantFamily:
					return 'vm_VariabilityItemFeature';
				case itemTypes.Rule:
					return 'vm_Rule';
				case itemTypes.Family:
					return 'vm_Feature';
				case itemTypes.FamilyOption:
					return 'vm_FeatureOption';
				case itemTypes.Option:
					return 'vm_Option';
				default:
					break;
			}
		},

		getModelTypeFromItemType: function(itemTypeName) {
			var itemTypes = this.ModelItemTypes;

			switch (itemTypeName) {
				case 'vm_VariabilityItemRule':
					return itemTypes.VariabilityItemRule;
				case 'vm_VariabilityItem':
					return itemTypes.GenericItem;
				case 'vm_VariabilityItemStructure':
					return itemTypes.GenericItemStructure;
				case 'vm_VariabilityItemFeature':
					return itemTypes.RelevantFamily;
				case 'vm_Rule':
					return itemTypes.Rule;
				case 'vm_Feature':
					return itemTypes.Family;
				case 'vm_FeatureOption':
					return itemTypes.FamilyOption;
				case 'vm_Option':
					return itemTypes.Option;
				default:
					break;
			}
		},

		getItemLabelFromModelType: function(elementType) {
			var itemTypes = this.ModelItemTypes;

			switch (elementType) {
				case itemTypes.VariabilityItemRule:
					return 'VariabilityItemRule';
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
