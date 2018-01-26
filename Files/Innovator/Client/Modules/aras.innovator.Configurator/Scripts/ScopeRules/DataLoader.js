/* global define */
define([
	'dojo/_base/declare',
	'Configurator/Scripts/ScopeRules/DataStore',
	'Configurator/Scripts/ScopeRules/ModelItem',
	'Configurator/Scripts/ScopeRules/ModelEnums'
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
				case 'cs_sample_Rule':
					return '<Item type="cs_sample_Rule" action="get" />';
				case 'cs_sample_RelevantFamilies':
					return '<Item type="cs_sample_RelevantFamilies" action="get" select="related_id(name,locked_by_id)">' +
								'<related_id>' +
									'<Item type="cs_sample_Family" action="get">' +
										'<Relationships>' +
											'<Item type="cs_sample_FamilyOption" action="get" select="related_id(name,locked_by_id)"/>' +
										'</Relationships>' +
									'</Item>' +
								'</related_id>' +
							'</Item>';
				case 'cs_sample_Usage':
					return '<Item type="cs_sample_Usage" action="get">' +
								'<related_id>' +
									'<Item type="Part" action="get"/>' +
								'</related_id>' +
							'</Item>';
				case 'cs_sample_GenericItemStructure':
					return '<Item type="cs_sample_GenericItemStructure" action="get" select="related_id(name,locked_by_id)" repeatProp="related_id" repeatTimes="0" />';
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
					var isRecursiveRequest = relationshipTypes.indexOf('cs_sample_GenericItemStructure') !== -1;
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
							'<Item type="cs_sample_GenericItem" id="' + scopeItemId + '" action="' + actionType + '">' +
								'<Relationships>' + relatedItemsAml + '</Relationships>' +
							'</Item>' +
						'</AML>');

						requestItem = requestItem.apply();

						if (!requestItem.isError()) {
							var scopeRelationshipsNode = this.scopeItemNode.selectSingleNode('./Relationships');
							var responceRelationshipsNode = requestItem.node.selectSingleNode('./Relationships');

							if (responceRelationshipsNode) {
								var importedNode = this.scopeItemNode.ownerDocument.importNode(responceRelationshipsNode, true);

								if (scopeRelationshipsNode) {
									var typeXPathFilter = '@type="' + updatedItemTypes.join('" or @type="') + '"';
									var existingRelationships = this.scopeItemNode.selectNodes('./Relationships/Item[' + typeXPathFilter + ']');
									var relationshipNode;

									for (i = 0; i < existingRelationships.length; i++) {
										relationshipNode = existingRelationships[i];
										scopeRelationshipsNode.removeChild(relationshipNode);
									}

									relationshipNode = importedNode.firstChild;

									while (relationshipNode) {
										scopeRelationshipsNode.appendChild(relationshipNode);
										relationshipNode = importedNode.firstChild;
									}
								} else {
									this.scopeItemNode.appendChild(importedNode);
								}
							}

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
