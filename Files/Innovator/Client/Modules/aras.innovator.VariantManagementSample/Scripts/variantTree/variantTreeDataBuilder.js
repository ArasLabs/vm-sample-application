/* global define */
define('Modules/aras.innovator.VariantManagementSample/Scripts/variantTree/variantTreeDataBuilder', [
	'dojo/_base/declare',
],
function(declare) {
	return declare(null, {
		itemCounter: 0,
		_nodeItemsData: null,
		_nodeItemsOrderHash: null,
		_rootNodeLabel: 'Root',

		constructor: function(initialParameters) {
			this.setGeneratedData(initialParameters || {});
			this._nodeItemsOrderHash = {};
		},

		setGeneratedData: function(variantTreeData) {
			this.generationData = variantTreeData.generationData;
			this.validCombinations = variantTreeData.validCombinations;
			this.rootNodeLabel = variantTreeData.rootNodeLabel || this.rootNodeLabel;
			this._nodeItemsData = variantTreeData._nodeItemsData || [];
			if (variantTreeData.variableNamedConstantPairs) {
				this.setNodeItemsSortOrder(variantTreeData.variableNamedConstantPairs);
			}
		},

		setNodeItemsSortOrder: function(orderedIdList) {
			this._nodeItemsOrderHash = this._buildItemsOrderHash(orderedIdList);
		},

		_buildItemsOrderHash: function(orderedIdList) {
			var orderByItemIdHash = {};

			if (orderedIdList && orderedIdList.length) {
				var i;

				for (i = 0; i < orderedIdList.length; i++) {
					var namedConstantInfo = orderedIdList[i];
					orderByItemIdHash[namedConstantInfo.namedConstantId + namedConstantInfo.variableId] = i;
				}
			}

			return orderByItemIdHash;
		},

		getVariantTreeData: function() {
			return this.generateVariantTreeData(this.generationData, this.validCombinations);
		},

		generateVariantTreeData: function(generationData, validCombinations) {
			var treeData;

			generationData = generationData || {};
			treeData = {id: 'root', itemData: {label: generationData.rootNodeLabel || this._rootNodeLabel}, children: []};

			if (validCombinations.length) {
				var itemsOrderHash = generationData.nodeItemsOrder ? this._buildItemsOrderHash(generationData.nodeItemsOrder) : this._nodeItemsOrderHash;
				var nodeItems = generationData.nodeItems || this._nodeItemsData;
				var treeBuildContext = {nodeItemsHash: {}, itemCounter: 0};
				var combinationNodeSorter = this._combinationNodeSorter.bind(itemsOrderHash);
				var branchNodeSorter = this._branchNodeSorter.bind(itemsOrderHash);
				var normalizeInfo = {
					itemsSorter: combinationNodeSorter.bind(this),
					itemsHash: treeBuildContext.nodeItemsHash,
					groupSequence: []
				};
				var currentCombination;
				var normalizedCombination;
				var nodeItem;
				var previousItemId;
				var i;

				nodeItems.sort(function(firstItem, secondItem) {
					var firstItemOrder = itemsOrderHash[firstItem.itemId + firstItem.sourceId] || 0;
					var secondItemOrder = itemsOrderHash[secondItem.itemId + secondItem.sourceId] || 0;

					return firstItemOrder - secondItemOrder;
				});

				for (i = 0; i < nodeItems.length; i++) {
					nodeItem = nodeItems[i];
					treeBuildContext.nodeItemsHash[nodeItem.itemId + nodeItem.sourceId] = nodeItem;

					if (nodeItem.sourceId !== previousItemId) {
						normalizeInfo.groupSequence.push(nodeItem.sourceId);
						previousItemId = nodeItem.sourceId;
					}
				}

				for (i = 0; i < validCombinations.length; i++) {
					currentCombination = validCombinations[i];
					normalizedCombination = this._normalizeCombination(currentCombination, normalizeInfo);

					if (normalizedCombination.length) {
						this._buildTreeBranch(normalizedCombination, treeData, treeBuildContext);
					}
				}
			}

			this._bypassStructure(treeData, function(structureItem) {
				var childItems = structureItem.children;

				if (childItems.length) {
					childItems.sort(branchNodeSorter);
				}

				delete structureItem.childIdHash;
			}.bind(this), true);

			return treeData;
		},

		_normalizeCombination: function(targetCombination, normalizeInfo) {
			var resultCombination = targetCombination.slice(0);

			normalizeInfo = normalizeInfo || {};

			if (resultCombination.length) {
				if (resultCombination.length < normalizeInfo.groupSequence.length) {
					var extendedCombination = new Array(normalizeInfo.groupSequence.length);
					var groupIndex;
					var nodeItem;
					var itemId;
					var combination;
					var i;

					// placing all item ids from incomplete combination on appropriate places in full config
					for (i = 0; i < resultCombination.length; i++) {
						combination = resultCombination[i];
						itemId = combination.itemId;
						nodeItem = normalizeInfo.itemsHash[combination.getKey()];
						groupIndex = normalizeInfo.groupSequence.indexOf(nodeItem.sourceId);

						extendedCombination[groupIndex] = itemId;
					}

					// cut all empty items at the end of full combination
					while (!extendedCombination[extendedCombination.length - 1]) {
						extendedCombination.pop();
					}

					resultCombination = extendedCombination;
				} else {
					if (normalizeInfo.itemsSorter) {
						var self = this;
						resultCombination.sort(normalizeInfo.itemsSorter.bind(self));
					}
				}
			}

			return resultCombination;
		},

		_combinationNodeSorter: function(firstItem, secondItem) {
			var firstItemOrder = this[firstItem.getKey()] || 0;
			var secondItemOrder = this[(secondItem.getKey())] || 0;

			return firstItemOrder - secondItemOrder;
		},

		_branchNodeSorter: function(firstNode, secondNode) {
			var firstItemOrder = (firstNode.itemData && this[firstNode.itemData.itemId + firstNode.itemData.sourceId]) || 0;
			var secondItemOrder = (secondNode.itemData && this[secondNode.itemData.itemId + secondNode.itemData.sourceId]) || 0;

			return firstItemOrder - secondItemOrder;
		},

		_buildTreeBranch: function(idList, parentNode, treeBuildContext) {
			treeBuildContext = treeBuildContext || {nodeItemsHash: {}, itemCounter: 0};
			parentNode = parentNode || treeBuildContext.rootNode;

			if (parentNode) {
				var itemInfo = idList.shift();
				var itemId = itemInfo.itemId;
				var siblingIdHash = parentNode.childIdHash || (parentNode.childIdHash = {});
				var currentNode = siblingIdHash[itemId];

				if (!currentNode) {
					currentNode = {
						id: (treeBuildContext.itemCounter++).toString(),
						itemData: treeBuildContext.nodeItemsHash[itemInfo.getKey()],
						children: [],
						childIdHash: {}
					};

					parentNode.children.push(currentNode);
					siblingIdHash[itemId] = currentNode;
				}

				if (idList.length) {
					this._buildTreeBranch(idList, currentNode, treeBuildContext);
				}
			}
		},

		_bypassStructure: function(targetItems, bypassMethod, deepBypassing) {
			if (targetItems && bypassMethod) {
				targetItems = targetItems ? (Array.isArray(targetItems) ? targetItems : [targetItems]) : [];
				targetItems.map(bypassMethod);

				if (deepBypassing) {
					var currentItem;
					var i;

					for (i = 0; i < targetItems.length; i++) {
						currentItem = targetItems[i];

						if (currentItem.children) {
							this._bypassStructure(currentItem.children, bypassMethod, deepBypassing);
						}
					}
				}
			}
		}
	});
});
