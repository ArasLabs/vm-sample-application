var aras = parent.aras;
var isUIControlsCreated = false;
var genericItemStructure;
var itemId;
var scopeItem;
var allValues;
var selectedValues;
constantIdsHash = {
	addConstantId: function(variableId, namedConstantId, namedConstantName) {
		if (!this[namedConstantName]) {
			this[namedConstantName] = {};
		}
		this[namedConstantName][variableId] = namedConstantId;
	},
	getConstantId: function(variableId, namedConstantName) {
		return this[namedConstantName] && this[namedConstantName][variableId];
	}
};
var gridControl;
var familyGridData;
var ExpressionModelItem;
var variableIdToNameMap = {};
var constantIdToNameMap = {};
var validConstantsHash = {};
var staticXmlDocument = aras.createXMLDocument();
var optionUnavailabilitySuffix = ' (this option is not available)';

setConstantAvailability = function(variableId, namedConstant, isAvailable) {
	var objectKey = variableId + constantIdsHash.getConstantId(variableId, namedConstant);
	validConstantsHash[objectKey] = validConstantsHash[objectKey] || [];
	validConstantsHash[objectKey] = isAvailable;
};

isConstantAvailable = function(variableId, namedConstant) {
	return Boolean(validConstantsHash[variableId + constantIdsHash.getConstantId(variableId, namedConstant)]);
};

loadView = function(newGenericItemStructure) {
	var shareData = parent.viewsController.shareData;
	shareData.synchronizer.dataLoader.requestSampleRelationshipData(['cs_sample_GenericItemStructure', 'cs_sample_RelevantFamilies', 'cs_sample_Usage']);

	genericItemStructure = newGenericItemStructure;
	itemId = genericItemStructure.getAttribute('id');

	if (!isUIControlsCreated) {
		createUIControls();
		attachButtonsEventListeners();
	} else {
		reloadView(newGenericItemStructure);
	}
};

reloadView = function(newGenericItemStructure) {
	if (isUIControlsCreated) {
		variableIdToNameMap = {};
		constantIdToNameMap = {};
		validConstantsHash = {};

		var shareData = parent.viewsController.shareData;
		shareData.synchronizer.dataLoader.requestSampleRelationshipData(['cs_sample_GenericItemStructure', 'cs_sample_RelevantFamilies', 'cs_sample_Usage']);
		genericItemStructure = newGenericItemStructure;

		loadScopeItem();
		familyGridData = getFamilyGridLayout();
		reloadGridControlData(familyGridData);

		allValues = null;
		selectedValues = null;
		updateButtonsAvailability();
	} else {
		createUIControls();
		attachButtonsEventListeners();
	}
};

getFamilyGridLayout = function() {
	var familyGenericItemDictionary = createFamilyGenericItemDictionary(genericItemStructure);
	var gridItems = [];
	var gridXml = '' +
		'<table editable="true">' +
		'<thead>' +
		'<th align="c">Generic Item</th>' +
		'<th align="c">Family</th>' +
		'<th align="c">Selection</th>' +
		'</thead>' +
		'<columns>' +
		'<column width="200" order="0" edit="NOEDIT" colname="GenericItem" />' +
		'<column width="130" order="1" edit="NOEDIT" colname="Family" />' +
		'<column width="200" order="2" edit="COMBO:0" colname="Selection" />' +
		'</columns>';

	var variableItems = scopeItem.getRelationships('Variable');
	var variableIndex;
	var variableItem;
	var variableId;
	var variableName;

	var variableNamedConstantItems;
	var variableNamedConstantIndex;
	var variableNamedConstantItem;
	var variableNamedConstantLabel;
	var variableNamedConstantId;
	var variableNamedConstants;

	for (variableIndex = 0; variableIndex < variableItems.getItemCount(); variableIndex++) {
		variableItem = variableItems.getItemByIndex(variableIndex);
		variableId = variableItem.getID();
		variableName = variableItem.getProperty('name');
		variableIdToNameMap[variableId] = variableName;

		variableNamedConstants = [];
		variableNamedConstantItems = variableItem.getRelationships('NamedConstant');

		gridXml += '<list id="' + variableIndex + '">';
		var listItems = ['<listitem value="" label=""/>'];
		for (variableNamedConstantIndex = 0; variableNamedConstantIndex < variableNamedConstantItems.getItemCount(); variableNamedConstantIndex++) {
			variableNamedConstantItem = variableNamedConstantItems.getItemByIndex(variableNamedConstantIndex);
			variableNamedConstantId = variableNamedConstantItem.getID();
			variableNamedConstantLabel = variableNamedConstantItem.getProperty('name');
			variableNamedConstants.push({id: variableNamedConstantId, label: variableNamedConstantLabel});
			constantIdToNameMap[variableNamedConstantId] = variableNamedConstantLabel;

			constantIdsHash.addConstantId(variableId, variableNamedConstantId, variableNamedConstantLabel);
			listItems.push('<listitem value="' + variableNamedConstantLabel + '" label="' + variableNamedConstantLabel + '"/>');
		}
		listItems.sort();
		gridXml += listItems.join('');
		gridXml += '</list>';

		var genericItems = '';
		var genericItemList = familyGenericItemDictionary[variableId];
		for (var i = 0, length = genericItemList.length; i < length; i++) {
			genericItems += aras.getItemProperty(genericItemList[i], 'name');
			genericItems += i + 1 < length ? ', ' : '';
		}

		gridItems.push({
			uniqueId: variableId,
			_listId: variableIndex,
			GenericItem: genericItems,
			Family: variableName,
			Selection: ''
		});
	}
	gridXml += '</table>';
	gridItems.sort(function(firstItem, secondItem) {
		return firstItem.Family.localeCompare(secondItem.Family);
	});
	return {
		gridXml: gridXml,
		gridItems: gridItems
	};
};

reloadGridControlData = function(familyGridData) {
	gridControl.InitXML_Experimental(familyGridData.gridXml);
	gridControl.columns_Experimental.set('Selection', 'formatter', function(storeValue, rowIndex, columnDescriptor) {
		if (storeValue && !isConstantAvailable(gridControl.getRowId(rowIndex), storeValue)) {
			return '<div style="color: #FF0000">' + storeValue + optionUnavailabilitySuffix + '</div>';
		}
		return storeValue;
	});
	gridControl.setArrayData_Experimental(familyGridData.gridItems);
	for (var i = 0, length = familyGridData.gridItems.length; i < length; i++) {
		var gridItem = familyGridData.gridItems[i];
		gridControl.cells(gridItem.uniqueId, 2).SetListId(gridItem._listId);
	}
	gridControl.grid_Experimental.resize();
};

createUIControls = function() {
	require(['Configurator/Scripts/TableRuleEditor/DataModel/ExpressionModelItem'], function(ExpressionModel) {
		ExpressionModelItem = ExpressionModel;

		loadScopeItem();
		var container = document.getElementById('variableGridContainer');
		/*Clear Container*/
		while (container.firstChild) {
			container.removeChild(container.firstChild);
		}
		/*Clear Container*/

		familyGridData = getFamilyGridLayout();

		clientControlsFactory.createControl('Aras.Client.Controls.Public.GridContainer', {connectId: 'variableGridContainer'}, function(control) {
			gridControl = control;
			clientControlsFactory.on(gridControl, {
				'gridEditCell': refreshOptionsAvailability
			});
			reloadGridControlData(familyGridData);
		});
		updateButtonsAvailability();
		isUIControlsCreated = true;
	}.bind(this));
};

function attachButtonsEventListeners() {
	var validateButton = document.getElementById('validate_button');
	var validateSelectionButton = document.getElementById('validate_selection_button');
	var getReasonsButton = document.getElementById('get_reasons_button');
	var validateUsagesButton = document.getElementById('validate_usages_button');
	var resolveStructureButton = document.getElementById('resolve_structure_button');

	validateButton.addEventListener('click', onValidateScope);
	validateSelectionButton.addEventListener('click', onValidateSelection);
	getReasonsButton.addEventListener('click', onGetReasons);
	validateUsagesButton.addEventListener('click', onValidateUsages);
	resolveStructureButton.addEventListener('click', onResolveStructure);
}

createFamilyGenericItemDictionary = function(genericItem, familyGenericItemHash) {
	familyGenericItemHash = familyGenericItemHash || {};
	var families = genericItem.selectNodes('./Relationships/Item[@type="cs_sample_RelevantFamilies"]/related_id/Item');
	for (var i = 0, length = families.length; i < length; i++) {
		var family = families[i];
		var familyId = family.getAttribute('id');
		if (familyGenericItemHash[familyId] instanceof Array) {
			familyGenericItemHash[familyId].push(genericItem);
		} else {
			familyGenericItemHash[familyId] = [genericItem];
		}
	}

	var innerGenericItems = genericItem.selectNodes('./Relationships/Item[@type="cs_sample_GenericItemStructure"]/related_id/Item');
	for (i = 0, length = innerGenericItems.length; i < length; i++) {
		createFamilyGenericItemDictionary(innerGenericItems[i], familyGenericItemHash);
	}
	return familyGenericItemHash;
};

loadScopeItem = function() {
	scopeItem = aras.newIOMItem('Method', 'cfg_GetScopeStructure');
	var targetScope = aras.newIOMItem('Method', 'cs_sample_scopeBuilder');
	targetScope.setID(itemId);
	scopeItem.setPropertyItem('targetScope', targetScope);
	scopeItem = scopeItem.apply();

	if (scopeItem.isError()) {
		aras.AlertError(scopeItem.getErrorString());
		return;
	}
};

showDialog = function(formId, optionalParameters) {
	optionalParameters = optionalParameters || {};
	var mainWindow = aras.getMainWindow();
	var targetWindow = window === mainWindow ? mainWindow.main : aras.getMostTopWindowWithAras(window);
	var formToDisply = aras.getFormForDisplay(formId);
	var dialogParameters = {
		title: optionalParameters.title || '',
		formId: formId,
		aras: aras,
		parentWindow: targetWindow,
		isEditMode: true,
		item: optionalParameters.item,
		scopeItem: optionalParameters.scopeItem,
		documentItem: this,
		validationResult: optionalParameters.validationResult,
		dialogWidth: formToDisply.getProperty('width', '640px'),
		dialogHeight: formToDisply.getProperty('height', '480px'),
		resizable: false,
		content: 'ShowFormAsADialog.html'
	};
	targetWindow.ArasModules.Dialog.show('iframe', dialogParameters);
};

onValidateScope = function() {
	validateScope()
		.then(function(validationResult) {
			if (validationResult.isError()) {
				return aras.AlertError(validationResult);
			}
			showDialog('C69E3D7D86F340F89AEC0320BAB51A40', {
				title: 'Validation Result',
				validationResult: validationResult
			});
		});
};

validateScope = function() {
	return Promise.resolve()
		.then(function() {
			var actionItem = aras.newIOMItem('Method', 'cfg_ValidateScope');
			var targetScope = aras.newIOMItem('Method', 'cs_sample_scopeBuilder');
			targetScope.setID(itemId);
			actionItem.setPropertyItem('targetScope', targetScope);
			actionItem = actionItem.apply();

			if (actionItem.isError()) {
				aras.AlertError(actionItem.getErrorString());
				return;
			}
			return actionItem;
		});
};

getValidCombination = function(conditionProperty) {
	var actionItem = aras.newIOMItem('Method', 'cfg_GetValidCombinations');
	actionItem.setAttribute('responseFormat', 'XML');
	actionItem.setAttribute('fetch', '1');
	var targetScope = aras.newIOMItem('Method', 'cs_sample_scopeBuilder');
	targetScope.setID(itemId);
	actionItem.setPropertyItem('targetScope', targetScope);
	if (conditionProperty && conditionProperty.nodeValue) {
		actionItem.setProperty('condition', conditionProperty.nodeValue);
	}
	return actionItem.apply();
};

onValidateSelection = function() {
	validateCombination()
		.then(function(validationResult) {
			if (validationResult.isError()) {
				return aras.AlertError(validationResult);
			}
			showDialog('C69E3D7D86F340F89AEC0320BAB51A40', {
				title: 'Validation Result',
				validationResult: validationResult
			});
		});
};

validateCombination = function() {
	return getSelectedValuesAsExpression().then(function(conditionProperty) {
		var actionItem = getValidCombination(conditionProperty);
		var actionItemResult = actionItem.dom.firstChild.firstChild.firstChild;
		var resultItem = aras.newIOMItem();
		if (actionItemResult.selectSingleNode('./combinations/combination')) {
			resultItem.loadAML('<Validation type="Validation" result="true" ></Validation>');
		} else {
			var conditionItem = aras.newIOMItem();
			conditionItem.loadAML(conditionProperty.nodeValue);

			resultItem.loadAML(
				'<Validation type="Validation" result="false" ><Error><Name>Selection Check</Name><Message>Failed for selected options</Message><details>' +
				getTerms(conditionItem.dom) +
				'</details></Error></Validation>'
			);
		}
		return resultItem;
	});
};

updateButtonsAvailability = function() {
	getSelectedValuesAsExpression()
		.then(getValidCombination)
		.then(function(validCombination) {
			var validCombinationResult = validCombination.dom.firstChild.firstChild.firstChild;
			var hasCombinations = Boolean(validCombinationResult.selectNodes('./combinations/combination').length);
			var getReasonsButtonNode = document.getElementById('get_reasons_button');
			if (Object.keys(constantIdToNameMap).length === 0 || hasCombinations) {
				getReasonsButtonNode.classList.add('disabledToolbarButton');
			} else {
				getReasonsButtonNode.classList.remove('disabledToolbarButton');
			}
		})
		.then(getValidCombination)
		.then(function(validCombination) {
			var validateSelectionButtonNode = document.getElementById('validate_selection_button');
			var validCombinationResult = validCombination.dom.firstChild.firstChild.firstChild;
			var hasCombinations = Boolean(validCombinationResult.selectNodes('./combinations/combination').length);
			if (hasCombinations) {
				validateSelectionButtonNode.classList.remove('disabledToolbarButton');
			} else {
				validateSelectionButtonNode.classList.add('disabledToolbarButton');
			}
		});
};

getTerms = function(expression) {
	var relatedItemXPath = './Relationships/Item[@id="{0}"]';
	var termList = expression.selectNodes('expression/AND/EQ');
	var termArray = '';
	for (var termIndex = 0; termIndex < termList.length; termIndex++) {
		var term = termList[termIndex];
		var termfamily = term.selectSingleNode('variable');
		var scopefamily = this.scopeItem.node.selectSingleNode(relatedItemXPath.replace('{0}', termfamily.selectSingleNode('@id').text));

		if (scopefamily !== null) {
			termfamily.setAttribute('name', aras.getItemProperty(scopefamily, 'name'));
			var termoption = term.selectSingleNode('named-constant');
			var scopeoption = scopefamily.selectSingleNode(relatedItemXPath.replace('{0}', termoption.selectSingleNode('@id').text));
			termoption.setAttribute('name', aras.getItemProperty(scopeoption, 'name'));
		}
		termArray += term.xml;
	}
	return termArray;
};

onGetReasons = function() {
	getReasons().then(function(actionItem) {
		if (actionItem.isError()) {
			return aras.AlertError(actionItem);
		} else {
			var methodParamScopeItem = aras.newIOMItem('cs_sample_GenericItem', null);
			methodParamScopeItem.setID(itemId);
			methodParamScopeItem.setProperty('name', scopeItem.getProperty('name'));
			aras.evalMethod('cs_sample_ShowConflicts', methodParamScopeItem, {
				'conflictsItem': actionItem,
				'variableNames': variableIdToNameMap,
				'constantNames': constantIdToNameMap
			});
		}
	});
};

getReasons = function() {
	return new Promise(function(resolve) {
		getSelectedValuesAsExpression().then(function(cdataNode) {
			var actionItem = aras.newIOMItem('Method', 'cfg_GetConflicts');
			var targetScopeItem = aras.newIOMItem('Method', 'cs_sample_scopeBuilder');
			targetScopeItem.setID(itemId);
			actionItem.setPropertyItem('targetScope', targetScopeItem);

			if (cdataNode && cdataNode.nodeValue) {
				actionItem.setProperty('condition', cdataNode.nodeValue);
			}

			resolve(actionItem.apply());
		});
	});
};

onValidateUsages = function() {
	validateUsages().then(function(validationResult) {
		if (validationResult.isError()) {
			return aras.AlertError(validationResult);
		}
		var item = aras.newIOMItem();
		item.loadAML(genericItemStructure.xml);
		showDialog('69DB8546A2B40B36D416E5993E2E3456', {
			title: 'Validation Errors',
			validationResult: validationResult,
			item: item,
			scopeItem: scopeItem
		});
	});
};

validateUsages = function() {
	return Promise.resolve()
		.then(function() {
			var actionItem = aras.newIOMItem('Method', 'cs_sample_validate_usages');
			actionItem.setID(itemId);
			actionItem = actionItem.apply();

			if (actionItem.isError()) {
				aras.AlertError(actionItem.getErrorString());
				return;
			}
			return actionItem;
		});
};

onResolveStructure = function() {
	resolveStructure().then(function(resolveStructureResult) {
		if (resolveStructureResult.isError()) {
			return aras.AlertError(resolveStructureResult);
		}
		showDialog('09F1B6ED0CFB44269D59682E9DE13DA5', {
			title: 'Bom Structure',
			validationResult: resolveStructureResult
		});
	});
};

resolveStructure = function() {
	return new Promise(function(resolve) {
		getSelectedValuesAsExpression().then(function(conditionProperty) {
			var actionItem = aras.newIOMItem('Method', 'cs_sample_resolve');
			actionItem.setID(itemId);
			conditionProperty = conditionProperty || actionItem.dom.createCDATASection('<expression></expression>');
			actionItem.setProperty('condition', conditionProperty.nodeValue);

			resolve(actionItem.apply());
		});
	});
};

getSelectedValuesAsExpression = function(skipEditedVariable) {
	return Promise.resolve()
		.then(function() {
			var selectedOptions = [];
			var selectedVariable = gridControl.getSelectedId();
			for (var key in selectedValues) {
				var fieldValue = selectedValues[key];
				if (!fieldValue || (skipEditedVariable && selectedVariable === key)) {
					continue;
				}
				selectedOptions.push({variableId: key, namedConstantId: fieldValue});
			}
			return convertValuesToExpressions(selectedOptions);
		});
};

convertValuesToExpressions = function(valueCollection) {
	return new Promise(function(resolve) {
		if (!valueCollection || !Array.isArray(valueCollection) || valueCollection.length === 0) {
			resolve();
			return;
		}

		require(['Controls/Common/RenderUtils'], function(renderUtils) {
			var utils = renderUtils.HTML;

			var eqExpressions = [];
			valueCollection.forEach(function(value) {
				var variableTag = utils.wrapInTag('', 'variable', {id: value.variableId});
				var namedConstantTag = utils.wrapInTag('', 'named-constant', {id: value.namedConstantId});
				var eqTag = utils.wrapInTag(variableTag + namedConstantTag, 'EQ');
				eqExpressions.push(eqTag);
			});
			var expressionsByAND = utils.wrapInTag(eqExpressions.join(''), 'AND');
			var andExpressionsInExpression = utils.wrapInTag(expressionsByAND, 'expression');
			var expressionsInCDATA = utils.wrapInCDATASection(andExpressionsInExpression, staticXmlDocument);

			resolve(expressionsInCDATA);
		});
	});
};

getAllValuesAsExpressions = function() {
	var resultPromise;
	if (allValues) {
		resultPromise = Promise.resolve(allValues);
	} else {
		var collectedValues = [];
		resultPromise = Promise.resolve()
			.then(function() {
				var valuePromises = [];
				var cellLayout = gridControl.grid_Experimental.layout.cells[2].cellLayoutLists;
				for (var i = 0, length = cellLayout.length; i < length; i++) {
					var gridItem = familyGridData.gridItems[i];
					var variableId = gridItem.uniqueId[0];
					var listId = gridItem._listId[0];
					var selectOptions = cellLayout[listId].values;
					for (var optionIndex = 1, optionAmount = selectOptions.length; optionIndex < optionAmount; optionIndex++) {
						var singleOptionLabel = selectOptions[optionIndex];
						if (!singleOptionLabel) {
							continue;
						}
						var value = {variableId: variableId, namedConstantId: constantIdsHash.getConstantId(variableId, singleOptionLabel)};
						collectedValues.push(value);
						valuePromises.push(convertValuesToExpressions([value]));
					}
				}
				return Promise.all(valuePromises);
			})
			.then(function(resolvedValuePromises) {
				allValues = collectedValues.map(function(item, index) {
					item.expression = resolvedValuePromises[index];
					return item;
				});
				return allValues;
			});
	}

	return resultPromise;
};

refreshOptionsAvailability = function() {
	return Promise.all([getSelectedValuesAsExpression(gridControl.getSelectedCell().IsEdited()), getAllValuesAsExpressions()])
		.then(function(results) {
			var selectedValuesInSingleExpression = results[0];
			var allValuesInExpressionCollection = results[1];
			//it means there are no variables or named constants and this check prevents us from redundant call to server
			if (!allValuesInExpressionCollection || Array.isArray(allValuesInExpressionCollection) && allValuesInExpressionCollection.length === 0) {
				return;
			}

			var intersectionItem = aras.newIOMItem('Method', 'cfg_GetIntersectingExpressions');
			intersectionItem.setAttribute('responseFormat', 'XML');
			var intersectionItemDom = intersectionItem.dom;

			var targetScopeItem = aras.newIOMItem('Method', 'cs_sample_scopeBuilder');
			targetScopeItem.setID(itemId);
			intersectionItem.setPropertyItem('targetScope', targetScopeItem);

			var cartesianNode = staticXmlDocument.createElement('cartesian-product');

			var selectedValueSet = staticXmlDocument.createElement('set');
			var selectedValueExpression = staticXmlDocument.createElement('expression');
			selectedValueExpression.setAttribute('id', 'selected');
			selectedValueSet.appendChild(selectedValueExpression);
			cartesianNode.appendChild(selectedValueSet);
			if (selectedValuesInSingleExpression) {
				selectedValueExpression.appendChild(selectedValuesInSingleExpression);
			} else {
				selectedValueExpression.appendChild(intersectionItemDom.createCDATASection('<expression></expression>'));
			}
			var expressionToBeCheckedContainer = staticXmlDocument.createElement('set');
			cartesianNode.appendChild(expressionToBeCheckedContainer);
			intersectionItemDom.documentElement.appendChild(cartesianNode);

			for (var index = 0, exprAmount = allValuesInExpressionCollection.length; index < exprAmount; index++) {
				var singleValueExpression = allValuesInExpressionCollection[index];
				var expression = staticXmlDocument.createElement('expression');
				expression.setAttribute('id', singleValueExpression.variableId + singleValueExpression.namedConstantId);
				expression.appendChild(singleValueExpression.expression);
				expressionToBeCheckedContainer.appendChild(expression);
			}
			intersectionItem = intersectionItem.apply();
			if (intersectionItem.isError()) {
				return aras.AlertError(intersectionItem);
			}
			var intersectionResultNode = intersectionItem.dom.firstChild.firstChild.firstChild;
			var selectionCell = gridControl.grid_Experimental.layout.cells[2];
			var cellLayout = selectionCell.cellLayoutLists;

			// timeout is required here because 'widget' object is not loaded yet
			setTimeout(function() {
				selectionCell.widget.on('change', function(item) {
					selectedValues = selectedValues || {};
					var selectedVariableId = gridControl.getSelectedId();
					selectedValues[selectedVariableId] = constantIdsHash.getConstantId(selectedVariableId, item);
					updateButtonsAvailability();
					if (!isConstantAvailable(selectedVariableId, item)) {
						this.textbox.classList.add('disabledOption');
					} else {
						this.textbox.classList.remove('disabledOption');
					}
				});
				selectionCell.widget.on('search', function() {
					var menuItems = this.dropDown.domNode.getElementsByClassName('dijitMenuItem');
					for (var itemIndex = 0, length = menuItems.length; itemIndex < length; itemIndex++) {
						var menuItem = menuItems[itemIndex];
						if (!isConstantAvailable(gridControl.getSelectedId(), menuItem.innerText)) {
							menuItem.classList.add('disabledOption');
						}
					}
				});
			}, 0);
			for (var i = 0; i < cellLayout.length; i++) {
				var gridItem = familyGridData.gridItems[i];
				var variableId = gridItem.uniqueId[0];
				var listId = gridItem._listId[0];
				var namedConstants = cellLayout[listId].values;
				var namedConstantLabels = cellLayout[listId].labels;
				for (var optionIndex = 1, optionsAmount = namedConstants.length; optionIndex < optionsAmount; optionIndex++) {
					var option = namedConstants[optionIndex];

					var cortegeExpressionXPath = './cortege/expression[@id=\'' + variableId + constantIdsHash.getConstantId(variableId, option) + '\']';
					var isAvailable = intersectionResultNode.selectNodes(cortegeExpressionXPath).length !== 0;
					if (isAvailable) {
						namedConstantLabels[optionIndex] = option;
					} else {
						namedConstantLabels[optionIndex] = option + optionUnavailabilitySuffix;
					}
					setConstantAvailability(variableId, option, isAvailable);
				}

				if (gridItem.Selection) {
					gridControl.grid_Experimental.updateRow(i);
				}
			}
		});
};
