/* global define */
define([
	'dojo/_base/declare',
	'Modules/aras.innovator.VariantManagementSample/Scripts/scopeRules/dataStore',
	'Modules/aras.innovator.VariantManagementSample/Scripts/scopeRules/modelItem',
	'Modules/aras.innovator.VariantManagementSample/Scripts/scopeRules/modelEnums'
],
function(declare, DataStore, ModelItem, Enums) {
	return declare(null, {
		dataStore: null,
		scopeItemNode: null,
		aras: null,
		aggregatedScopeCache: null,
		_loadedTypes: null,
		_loadedTypesItemAttribute: 'loadedTypes',

		constructor: function(initialArguments) {
			this.aras = initialArguments.aras;
			this.aggregatedScopeCache = {};
			this._loadedTypes = {};

			this.setScopeItem(initialArguments.scopeItem);
		},

		isDataLoaded: function(dataType) {
			return this._loadedTypes[dataType];
		},

		dropRequestScopeCache: function() {
			this._loadedTypes = {};
			this.scopeItemNode.setAttribute(this._loadedTypesItemAttribute, JSON.stringify(this._loadedTypes));
		},

		_getRequestPartForSampleRelationshipType: function(targetType) {
			switch (targetType) {
				case 'vm_VariabilityItemRule':
					return '<Item type="vm_VariabilityItemRule" action="get" select="related_id(item_number,locked_by_id,definition,description,string_notation)" />';
				case 'vm_VariabilityItemFeature':
					return '<Item type="vm_VariabilityItemFeature" action="get">' +
						'<related_id>' +
							'<Item type="vm_Feature" isCriteria="0" select="name,locked_by_id">' +
								'<Relationships>' +
									'<Item type="vm_FeatureOption" isCriteria="0" select="related_id(name,locked_by_id)" />' +
								'</Relationships>' +
							'</Item>' +
						'</related_id>' +
					'</Item>';
				case 'vm_VariabilityItemStructure':
					return '<Item type="vm_VariabilityItemStructure" action="get" select="related_id(name,locked_by_id)" repeatProp="related_id" repeatTimes="0" />';
			}
		},

		setScopeItem: function(newScopeNode) {
			if (newScopeNode !== this.scopeItemNode) {
				var isDirtyScope = this.aras.isDirtyEx(newScopeNode);

				if (isDirtyScope) {
					var attributeValue = newScopeNode.getAttribute(this._loadedTypesItemAttribute);

					if (attributeValue) {
						this._loadedTypes = JSON.parse(attributeValue);
					}
				} else {
					this._loadedTypes = {};
				}

				this.scopeItemNode = newScopeNode;
			}
		},

		requestSampleRelationshipData: function(relationshipTypes, cacheLoaded) {
			if (cacheLoaded === null || cacheLoaded == undefined) {
				cacheLoaded = true;
			}

			var isRequestAvailable = this.scopeItemNode && !this.aras.isTempEx(this.scopeItemNode);

			if (isRequestAvailable) {
				relationshipTypes = relationshipTypes ? (Array.isArray(relationshipTypes) ? relationshipTypes : [relationshipTypes]) : [];

				if (relationshipTypes.length) {
					var requestItem = this.aras.newIOMItem();
					var isRecursiveRequest = relationshipTypes.indexOf('vm_VariabilityItemStructure') !== -1;
					var actionType = isRecursiveRequest ? 'GetItemRepeatConfig' : 'get';
					var scopeItemId = this.scopeItemNode.getAttribute('id');
					var relatedItemsAml = '';
					var updatedItemTypes = [];
					var itemType;
					var i;

					for (i = 0; i < relationshipTypes.length; i++) {
						itemType = relationshipTypes[i];

						if (!this._loadedTypes[itemType] || isRecursiveRequest) {
							relatedItemsAml += this._getRequestPartForSampleRelationshipType(relationshipTypes[i]);
							this._loadedTypes[itemType] = cacheLoaded;

							updatedItemTypes.push(itemType);
						}
					}

					if (updatedItemTypes.length) {
						requestItem.loadAML('<AML>' +
							'<Item type="vm_VariabilityItem" id="' + scopeItemId + '" action="' + actionType + '">' +
								'<Relationships>' + relatedItemsAml + '</Relationships>' +
							'</Item>' +
						'</AML>');

						requestItem = requestItem.apply();

						if (!requestItem.isError()) {
							const scopeRelationshipsNode = this.scopeItemNode.selectSingleNode('./Relationships');

							if (scopeRelationshipsNode) {
								const existingRelationships = this.scopeItemNode.selectNodes(
									'./Relationships/Item[@type="' + updatedItemTypes.join('" or @type="') + '"]'
								);

								for (i = 0; i < existingRelationships.length; i++) {
									const relationshipNode = existingRelationships[i];
									scopeRelationshipsNode.removeChild(relationshipNode);
								}
							}

							this.aras.mergeItem(this.scopeItemNode, requestItem.node);

							this.scopeItemNode.setAttribute(this._loadedTypesItemAttribute, JSON.stringify(this._loadedTypes));
						}
					}
				}
			}

			return this.scopeItemNode;
		},

		createDataStore: function(scopeItemNode, allowedItemTypes, optionalParameters) {
			var dataStore = new DataStore({
				aras: this.aras,
				itemSorter: optionalParameters && optionalParameters.itemSorter
			});

			dataStore.sortingActive = true;
			allowedItemTypes = allowedItemTypes ? (Array.isArray(allowedItemTypes) ? allowedItemTypes : [allowedItemTypes]) : [];

			if (allowedItemTypes.length) {
				var allowedTypeHash = {};
				var rootItem;
				var i;

				for (i = 0; i < allowedItemTypes.length; i++) {
					allowedTypeHash[allowedItemTypes[i]] = true;
				}

				rootItem = this.generateTreeData(dataStore, scopeItemNode, allowedTypeHash);

				dataStore.treeModelCollection = [rootItem];
				rootItem.registerItem(dataStore);
				rootItem.sortChildren(true);
			}

			return dataStore;
		},

		dropAggregationScopeCache: function() {
			this.aggregatedScopeCache = {};
		},

		generateTreeData: function(dataStore, sourceScopeNode, allowedTypes) {
			var rootElement = this.createModelElementFromNode(dataStore, sourceScopeNode, {isRoot: true, allowedTypes: allowedTypes});

			return rootElement;
		},

		createModelElementFromNode: function(dataStore, targetNode, optionalParameters) {
			optionalParameters = optionalParameters || {};

			if (targetNode) {
				var targetNodeType = targetNode.getAttribute('type');
				var allowedTypes = optionalParameters.allowedTypes;

				if (!allowedTypes || allowedTypes[targetNodeType]) {
					var itemId = targetNode.getAttribute('id');
					var isRoot = optionalParameters.isRoot;
					var relationshipNodes = targetNode.selectNodes('./Relationships/Item/related_id/Item');
					var elementData = {
						id: itemId,
						name: dataStore.getTreeNodeName(targetNode),
						dataType: targetNodeType,
						node: targetNode
					};
					var newModelElement;
					var relationshipNode;
					var relationshipItemType;
					var relatedItemType;
					var i;

					if (!isRoot) {
						elementData.relationshipNode = targetNode.parentNode.parentNode;
						elementData.lockState = this.aras.isLocked(targetNode) ?
							(this.aras.isLockedByUser(targetNode) ? Enums.LockStates.LockedByMe : Enums.LockStates.Locked) : Enums.LockStates.Unlocked;
					}

					newModelElement = new ModelItem(elementData);

					if (optionalParameters.uniqueId) {
						newModelElement.uniqueId = optionalParameters.uniqueId;
					}

					if (this.aras.isTempEx(targetNode) || this.aras.isDirtyEx(targetNode)) {
						dataStore.validateElement(newModelElement);
					}

					if (optionalParameters.additionalProperties) {
						var propertyName;

						for (propertyName in optionalParameters.additionalProperties) {
							newModelElement[propertyName] = optionalParameters.additionalProperties[propertyName];
						}
					}

					for (i = 0; i < relationshipNodes.length; i++) {
						currentNode = relationshipNodes[i];
						relatedItemType = currentNode.getAttribute('type');
						relationshipNode = currentNode.parentNode.parentNode;
						relationshipItemType = relationshipNode.getAttribute('type');

						if (!allowedTypes || (allowedTypes[relationshipItemType] && allowedTypes[relatedItemType])) {
							relatedElement = this.createModelElementFromNode(dataStore, currentNode, {allowedTypes: allowedTypes});

							if (relatedElement) {
								newModelElement.addChild(relatedElement);
							}
						}
					}

					return newModelElement;
				}
			}
		}
	});
});
