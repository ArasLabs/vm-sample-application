/* global define */
define([
	'dojo/_base/declare'
],
function(declare) {
	return declare(null, {
		aras: null,
		_aggregatedScopeRequestCache: {},
		_aggregatedCoreScopeRequestCache: {},

		constructor: function(initialArguments) {
			this.aras = initialArguments.aras;
		},

		getAggregatedSampleData: function(scopeId, optionalParameters) {
			var resultData;

			if (scopeId) {
				var requestDataNode = this._requestAggregatedSampleData(scopeId, optionalParameters);
				var parsedData = requestDataNode ? this._parseRequestData(null, requestDataNode, './Relationships/Item') : [];

				if (parsedData.length) {
					resultData = this._filterStructure(parsedData, this._generateItemTypeFilter({Scope: true}));
				}
			}

			return resultData || [];
		},

		_dropAggregationScopeCache: function() {
			this._aggregatedScopeRequestCache = {};
			this._aggregatedCoreScopeRequestCache = {};
		},

		_generateItemTypeFilter: function(allowedTypes) {
			allowedTypes = allowedTypes || {};

			return function(targetItem) {
				return allowedTypes[targetItem.itemType];
			};
		},

		_filterStructure: function(targetItems, filterMethod, deepFiltering) {
			var filteredItems;
			var currentItem;
			var i;

			filteredItems = targetItems.filter(filterMethod);

			if (deepFiltering) {
				for (i = 0; i < filteredItems.length; i++) {
					currentItem = filteredItems[i];

					if (currentItem.children) {
						currentItem.children = this._filterStructure(currentItem.children, filterMethod, deepFiltering);
					}
				}
			}

			return filteredItems;
		},

		_requestAggregatedSampleData: function(scopeId, optionalParameters) {
			optionalParameters = optionalParameters || {};

			if (scopeId) {
				var scopeCacheId = this.aras.calcMD5(scopeId + (optionalParameters.builderMethodName || 'vm_scopeBuilder'));
				var requestData = this._aggregatedCoreScopeRequestCache[scopeCacheId];

				if (!requestData || optionalParameters.forceLoad) {
					var requestItem = aras.newIOMItem('Method', 'cfg_GetScopeStructure');
					var targetScope = aras.newIOMItem('cfg_Scope', optionalParameters.builderMethodName || 'vm_scopeBuilder');

					targetScope.setID(scopeId);

					requestItem.setID(scopeId);
					requestItem.setPropertyItem('targetScope', targetScope);

					requestItem = requestItem.apply();

					if (!requestItem.isError()) {
						requestData = requestItem.node;
						this._aggregatedScopeRequestCache[scopeCacheId] = requestData;
					} else {
						this.aras.AlertError(requestItem);
					}
				}

				return requestData;
			}
		},

		_parseRequestData: function(sourceItemData, targetItemNode, relatedXPath, parsedData) {
			var relatedItemNodes = targetItemNode.selectNodes(relatedXPath);
			var elementData;
			var i;

			parsedData = parsedData || [];

			elementData = {
				itemId: targetItemNode.getAttribute('id'),
				itemType: targetItemNode.getAttribute('type'),
				node: targetItemNode,
				parent: sourceItemData
			};

			if (sourceItemData) {
				var siblingItems = sourceItemData.children || (sourceItemData.children = []);

				siblingItems.push(elementData);
			}

			parsedData.push(elementData);

			for (i = 0; i < relatedItemNodes.length; i++) {
				this._parseRequestData(elementData, relatedItemNodes[i], relatedXPath, parsedData);
			}

			return parsedData;
		}
	});
});
