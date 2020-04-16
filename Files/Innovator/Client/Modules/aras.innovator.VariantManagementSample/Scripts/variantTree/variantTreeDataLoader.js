/* global define */
define('Modules/aras.innovator.VariantManagementSample/Scripts/variantTree/variantTreeDataLoader', [
	'dojo/_base/declare',
	'Modules/aras.innovator.VariantManagementSample/Scripts/tableRuleEditor/dataModel/aggregatedDataModel'
],
function(declare, AggregatedDataModel) {
	return declare(null, {
		aras: null,
		builderMethodName: null,
		aggregatedScopeCache: null,

		constructor: function(initialParameters) {
			this.aras = initialParameters.aras;
			this.builderMethodName = initialParameters.builderMethodName;
			this.aggregatedDataModel = new AggregatedDataModel({aras: this.aras});
			this.aggregatedScopeCache = {};
		},

		load: function(scopeItemData) {
			var loadedData = {};
			if (scopeItemData && scopeItemData.variableNamedConstantPairs && scopeItemData.variableNamedConstantPairs.length) {
				loadedData.variableNamedConstantPairs = scopeItemData.variableNamedConstantPairs;
				var namedConstantModelItems;
				var itemsData;

				this.aggregatedDataModel.loadSampleData(scopeItemData.id, {
					allowedItemTypes: ['Scope', 'Variable', 'NamedConstant'],
					builderMethodName: this.builderMethodName
				});

				namedConstantModelItems = this.aggregatedDataModel.getItemsByParameters({itemType: 'NamedConstant'}).filter(function(modelItem) {
					for (var i = 0, length = loadedData.variableNamedConstantPairs.length; i < length; i++) {
						var pair = loadedData.variableNamedConstantPairs[i];
						if (pair.namedConstantId === modelItem.itemId && pair.variableId === modelItem.parent.itemId) {
							return true;
						}
					}
					return false;
				});

				itemsData = namedConstantModelItems.map(this._getElementData);

				if (scopeItemData.labels) {
					itemsData.forEach(function(item) {
						if (scopeItemData.labels[item.itemId]) {
							item.name = scopeItemData.labels[item.itemId];
						}

						if (scopeItemData.labels[item.sourceId]) {
							item.sourceName = scopeItemData.labels[item.sourceId];
						}
					});

					if (scopeItemData.labels.root) {
						this._rootNodeLabel = scopeItemData.labels.root;
					}
				}

				loadedData._nodeItemsData = itemsData;
				loadedData.validCombinations = this.getValidCombinations(itemsData, scopeItemData.id);
				loadedData.generationData = {nodeItems: loadedData._nodeItemsData};
			}

			return loadedData;
		},

		getValidCombinations: function(nodeItems, scopeId) {
			var requestItem = this.aras.newIOMItem('Method', 'cfg_GetValidCombinations');
			var targetScope = aras.newIOMItem('cfg_Scope', this.builderMethodName);
			var groupItemsIdHash = {};
			var selectAttribute = '';
			var conditionAttribute = '';
			var sourceItemId;
			var childrenIdHash;
			var itemData;
			var idList;
			var conditionXmlDocument;
			var i;

			// form request "select" attribute value
			for (i = 0; i < nodeItems.length; i++) {
				itemData = nodeItems[i];
				sourceItemId = itemData.sourceId;
				childrenIdHash = groupItemsIdHash[sourceItemId] || (groupItemsIdHash[sourceItemId] = []);

				childrenIdHash.push(itemData.itemId);
			}

			for (sourceItemId in groupItemsIdHash) {
				selectAttribute += (selectAttribute ? ',' : '') + sourceItemId;
				idList = groupItemsIdHash[sourceItemId];

				conditionAttribute += '<OR>';

				for (i = 0; i < idList.length; i++) {
					conditionAttribute +=
					'<eq>' +
						'<variable id="' + sourceItemId + '"></variable>' +
						'<named-constant id="' + idList[i] + '"></named-constant>' +
					'</eq>';
				}

				conditionAttribute += '</OR>';
			}

			requestItem.setID(scopeId);
			requestItem.setAttribute('dataSource', 'db');
			requestItem.setAttribute('select', selectAttribute);

			// create and append condition property node
			if (conditionAttribute) {
				conditionXmlDocument = new XmlDocument();
				conditionXmlDocument.loadXML('<condition><![CDATA[<expression><AND>' + conditionAttribute + '</AND></expression>]]></condition>');
				requestItem.node.appendChild(requestItem.node.ownerDocument.importNode(conditionXmlDocument.documentElement, true));
			}

			targetScope.setID(scopeId);

			requestItem.setPropertyItem('targetScope', targetScope);
			requestItem = requestItem.apply();

			if (requestItem.isError()) {
				this.aras.AlertError(requestItem);
			} else {
				return this.parseCombinationsResponce(requestItem.getResult());
			}
		},

		parseCombinationsResponce: function(responceText) {
			//'{}' response means there are no valid combinations
			//There is the known issue IR-056764 in the Configurator Services APIs, when the 'cfg_GetValidCombinations' method returns
			//wrong results for Scope objects with no Rules / Variables
			if ('{}' === responceText || -1 !== responceText.indexOf('#values#')) {
				return [];
			}

			var responceData = JSON.parse(responceText);
			var combinationsMeta = responceData['combinations-meta'];
			var groupOrderedIdList = new Array(Object.keys(combinationsMeta.variables).length);
			var combinationValueList = combinationsMeta.values;
			var variablesList = Object.keys(combinationsMeta.variables);
			var combinationsList = responceData.combinations;
			var currentCombination;
			var combinationItem;
			var normalizedCombination;
			var itemId;
			var groupId;
			var i;
			var j;

			for (groupId in combinationsMeta) {
				groupOrderedIdList[combinationsMeta[groupId]] = groupId;
			}

			for (i = 0; i < combinationsList.length; i++) {
				currentCombination = combinationsList[i];
				normalizedCombination = [];

				for (j = 0; j < currentCombination.length; j++) {
					combinationItem = combinationValueList[currentCombination[j]];
					itemId = this._normalizeCombinationItem(combinationItem);

					normalizedCombination.push({
						itemId: itemId,
						variableId: variablesList[j],
						getKey: function() {
							return this.itemId + this.variableId;
						}
					});
				}

				combinationsList[i] = normalizedCombination;
			}

			return combinationsList;
		},

		_normalizeCombinationItem: function(combinationItem) {
			if (combinationItem) {
				switch (combinationItem.type) {
					case 'NamedConstant':
						return combinationItem.id;
				}
			}
		},

		_getElementData: function(modelItem) {
			var parentItem = modelItem.parent;

			return {
				itemId: modelItem.itemId,
				dataType: modelItem.itemType,
				label: modelItem.getItemProperty('label') || modelItem.getItemProperty('name'),
				subLabel: modelItem.getItemProperty('sublabel'),
				icon: modelItem.getItemProperty('icon'),
				count: modelItem.getItemProperty('count'),
				sourceId: parentItem && parentItem.itemId,
				sourceType: parentItem && parentItem.itemType,
				sourceName: parentItem && (modelItem.getItemProperty('label') || parentItem.getItemProperty('name'))
			};
		}
	});
});
