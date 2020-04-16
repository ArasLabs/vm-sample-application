var aras = parent.aras;
var ArasModules = parent.ArasModules;
var isUIControlsCreated = false;
var viewsController = parent.viewsController;
var viewContext = {
	gridLayout: null,
	editorTemplate: null,
	selectedRuleItem: null,
	allowedTypes: [
		'vm_VariabilityItem',
		'vm_VariabilityItemRule',
		'vm_Rule'
	],
	controls: {
		ruleGrid: null,
		ruleEditor: null,
		editorToolbar: null,
		gridToolbar: null
	},
	data: {
		dataModel: null,
		aggregatedDataModel: null,
		scopeItemNode: null,
		optionNameToOptionsMap: null,
		familyNameHash: null,
		optionIdToOptionsMap: null
	},
	ruleFilter: null,
	eventListeners: {},
	layoutControls: {},
	modules: {},
	topWindow: aras.getMostTopWindowWithAras(window)
};
var synchronizer;
var formViewHelper;
var ruleHelpersTabbar;
var viewEditMode;

loadView = function(newScopeItemNode) {
	var shareData = viewsController.shareData;
	var viewData = viewContext.data;

	synchronizer = shareData.synchronizer;
	synchronizer.setAllowedTypes(viewContext.allowedTypes);

	viewData.scopeItemNode = newScopeItemNode;
	viewData.dataModel = shareData.scopeDataModel;
	viewData.aggregatedDataModel = shareData.aggregatedDataModel;

	formViewHelper = shareData.formViewHelper;

	if (!isUIControlsCreated) {
		setEditState(viewsController.isViewEditable());
		initViewDataContainers(newScopeItemNode);

		createUIControls(newScopeItemNode);
		attachDataModelEventListeners();
	} else {
		attachDataModelEventListeners();
		reloadView(newScopeItemNode);
	}
};

reloadView = function(newScopeItemNode) {
	setEditState(viewsController.isViewEditable());
	initViewDataContainers(newScopeItemNode);

	reloadControlsData();
};

function setupView(setupParameters) {
	setupParameters = setupParameters || {};

	if (setupParameters.itemId) {
		var dataModel = viewContext.data.dataModel;
		var ruleModelItem = dataModel.getItemsByItemId(setupParameters.itemId);

		if (ruleModelItem.length) {
			viewContext.controls.ruleGrid.setSelectedRow(ruleModelItem[0].uniqueId);
		}
	}
}

function unloadView() {
	removeDataModelEventListeners();
}

function initViewDataContainers(scopeItemNode) {
	var dataLoader = synchronizer.dataLoader;
	var viewData = viewContext.data;

	dataLoader.requestSampleRelationshipData(['vm_VariabilityItemRule']);

	viewData.scopeItemNode = scopeItemNode;
	viewData.dataModel.setScopeItem(scopeItemNode, {allowedItemTypes: viewContext.allowedTypes});

	if (!aras.isTempEx(scopeItemNode)) {
		viewData.aggregatedDataModel.loadSampleData(scopeItemNode.getAttribute('id'));
		viewData.aggregatedDataModel.restoreGroupedItems({});
	}

	prepareOptionHashes();
}

function prepareOptionHashes() {
	var viewData = viewContext.data;
	var aggregatedDataModel = viewData.aggregatedDataModel;
	var familyModelItems = aggregatedDataModel.getItemsByParameters({itemType: 'Variable'});
	var optionModelItem;
	var modelItem;
	var itemName;
	var i;
	var j;

	viewData.familyNameHash = {};
	viewData.optionNameToOptionsMap = {};
	viewData.optionIdToOptionsMap = {};

	// searching for available family and option items
	for (i = 0; i < familyModelItems.length; i++) {
		modelItem = familyModelItems[i];
		itemName = modelItem.getItemProperty('name');
		viewData.familyNameHash[itemName] = modelItem;

		for (j = 0; j < modelItem.children.length; j++) {
			optionModelItem = modelItem.children[j];
			itemName = optionModelItem.getItemProperty('name');

			if (!viewData.optionNameToOptionsMap[itemName]) {
				viewData.optionNameToOptionsMap[itemName] = [];
			}
			viewData.optionNameToOptionsMap[itemName].push(optionModelItem);
			if (!viewData.optionIdToOptionsMap[optionModelItem.itemId]) {
				viewData.optionIdToOptionsMap[optionModelItem.itemId] = [];
			}
			viewData.optionIdToOptionsMap[optionModelItem.itemId].push(optionModelItem);
		}
	}
}

reloadControlsData = function() {
	var selectedRuleId;

	reloadRuleGridData();
	updateEditorGroupOptions();

	// restore selected grid item
	if (viewContext.selectedRuleItem) {
		var dataModel = viewContext.data.dataModel;
		var itemId = viewContext.selectedRuleItem.itemId;
		var ruleStoreItems = dataModel.getItemsByItemId(itemId);

		if (ruleStoreItems.length) {
			selectedRuleId = ruleStoreItems[0].uniqueId;
		}
	}

	selectRuleItem(selectedRuleId);
	refreshActiveTab();
	updateGridToolbarState();
};

function reloadRuleGridData() {
	var gridItems = createGridItems(viewContext.gridLayout);
	var ruleGrid = viewContext.controls.ruleGrid;

	ruleGrid.setArrayData_Experimental(gridItems); // jscs: ignore requireCamelCaseOrUpperCaseIdentifiers
}

function updateEditorGroupOptions() {
	var ruleEditor = viewContext.controls.ruleEditor;

	if (ruleEditor.isInputStarted()) {
		var optionNameCollection = {};
		var viewData = viewContext.data;
		var targetGroup = ruleEditor.getGroupByName('RuleConditionGroup');
		var optionName;
		var modelItems;

		for (optionName in viewData.optionNameToOptionsMap) {
			modelItems = viewData.optionNameToOptionsMap[optionName];
			optionNameCollection[optionName] = modelItems.map(function(modelItem) {
				return aras.getItemProperty(modelItem.parent.node, 'name');
			});
		}

		targetGroup.setParserProperty('_FeatureNames', viewData.familyNameHash);
		targetGroup.setParserProperty('_OptionNames', optionNameCollection);
	}
}

setEditState = function(editState) {
	editState = Boolean(editState);

	if (editState !== viewEditMode) {
		viewEditMode = editState;

		if (isUIControlsCreated) {
		}
	}
};

createUIControls = function() {
	require([
		'dojo/layout',
		'dojo/parser',
		'Controls/Common/RenderUtils',
		'Modules/aras.innovator.VariantManagementSample/Scripts/common/ruleEditor/vmRuleEditorControl',
		'Modules/aras.innovator.VariantManagementSample/Scripts/common/ruleEditor/ruleTemplate',
		'dojo/text!Modules/aras.innovator.VariantManagementSample/styles/xmlToHtml.xsl'
	], function(layoutBundle, parser, RenderUtils, RuleEditorControl, RuleTemplate, TranformXSL) {
		var xslDocument = new XmlDocument();
		var viewControls = viewContext.controls;
		var viewBorderContainerWidget;
		var ruleEditor;

		xslDocument.loadXML(TranformXSL);

		if (aras.Browser.isIe()) {
			xslDocument.setProperty('SelectionNamespaces', 'xmlns:xsl="http://www.w3.org/1999/XSL/Transform"');
		} else {
			xslDocument.documentElement.setAttribute('xmlns:xsl', 'http://www.w3.org/1999/XSL/Transform');
		}

		viewContext.modules.RenderUtils = RenderUtils;
		viewContext.modules.XmlToHTMLTransform = xslDocument;
		parser.parse();

		viewContext.gridLayout = createGridLayout('vm_Rule');
		viewContext.editorTemplate = RuleTemplate;

		// ruleGrid control creation
		clientControlsFactory.createControl('Aras.Client.Controls.Public.GridContainer', {connectId: 'ruleGridContainer'}, function(control) {
			var gridItems = createGridItems(viewContext.gridLayout);

			clientControlsFactory.on(control, {
				'gridRowSelect': onGridRowSelect
			});

			// jscs: disable
			control.setLayout_Experimental(viewContext.gridLayout);
			control.columns_Experimental.set('_itemAction', 'formatter', function(storeValue, rowIndex) {
				var renderUtils = viewContext.modules.RenderUtils;
				var storeItem = this.grid.getItem(rowIndex);
				var gridStore = this.grid.store;
				var modelItem = gridStore.getValue(storeItem, '_modelItem');
				var cellHTML = '';

				if (!modelItem.isItemValid()) {
					cellHTML += renderUtils.HTML.wrapInTag('!', 'div', {
						class: 'errorMessage',
						title: modelItem.getErrorString()
					});
				}

				cellHTML += storeValue ? renderUtils.HTML.wrapInTag('', 'div', {class: 'itemActionIcon ' + storeValue}) : '';

				return cellHTML;
			});

			control.setArrayData_Experimental(gridItems);
			viewControls.ruleGrid = control;
			// jscs: enable
		});

		clientControlsFactory.createControl('Aras.Client.Controls.Public.ToolBar', {id: 'gridToolbar', connectId: 'ruleGridToolbar', style: 'overflow: hidden;'},
			function(control) {
				control.loadXml(aras.getI18NXMLResource('rulegrid_toolbar.xml'));

				clientControlsFactory.on(control, {
					'onClick': onGridToolbarButtonClick
				});

				control.show();
				viewControls.gridToolbar = control;
			});

		clientControlsFactory.createControl('Aras.Client.Controls.Public.ToolBar', {id: 'editorToolbar',connectId: 'ruleEditorToolbar'}, function(control) {
			control.loadXml(aras.getI18NXMLResource('ruleeditor_toolbar.xml'));

			clientControlsFactory.on(control, {
				'onClick': onEditorToolbarButtonClick
			});

			control.show();
			viewControls.editorToolbar = control;
		});

		ruleEditor = new RuleEditorControl({connectId: 'ruleEditorControl', template: RuleTemplate, isEditable: viewEditMode});
		ruleEditor.addEventListener(window, null, 'onGroupValueEntered', onEditorGroupValueEntered);
		ruleEditor.addEventListener(window, null, 'onStateChanged', onEditorStateChanged);
		ruleEditor.registerShortcut(83, true, false, applyRuleEditorChanges);

		viewContext.controls.ruleEditor = ruleEditor;

		// tabbar control creation
		clientControlsFactory.createControl('Aras.Client.Controls.Experimental.SimpleTabbar', {style: 'width:100%; height:100%;'}, function(control) {
			ruleHelpersTabbar = control;
			ruleHelpersTabbar.initializedTabs = {};

			document.getElementById('ruleHelpersContainer').appendChild(ruleHelpersTabbar.domNode);
			clientControlsFactory.on(ruleHelpersTabbar, {
				'onClick': onSelectHelperTab
			});

			ruleHelpersTabbar.startup();
			initHelpersTabbar();
		});

		viewBorderContainerWidget = dijit.byId('viewBorderContainer');
		viewBorderContainerWidget.layout();

		viewContext.layoutControls = {
			messageContainer: document.getElementById('editorMessageContainer'),
			viewBorderContainer: viewBorderContainerWidget,
			xmlExpressionContainer: document.getElementById('xmlExpressionContainer')
		};

		updateGridToolbarState();
		isUIControlsCreated = true;
	});
};

function attachDataModelEventListeners() {
	var eventListeners = viewContext.eventListeners.dataModel || (viewContext.eventListeners.dataModel = []);
	var dataModel = viewContext.data.dataModel;
	var ruleGrid = viewContext.controls.ruleGrid;

	// ruleGrid event listeners
	eventListeners.push(dataModel.addEventListener(ruleGrid, ruleGrid, 'onSelectionChanged', onRuleGridDataModelSelectionChanged));
	eventListeners.push(dataModel.addEventListener(ruleGrid, ruleGrid, 'onNewItem', onRuleGridDataModelNewItem));
	eventListeners.push(dataModel.addEventListener(ruleGrid, ruleGrid, 'onDeleteItem', onRuleGridDataModelDeleteItem));
	eventListeners.push(dataModel.addEventListener(ruleGrid, ruleGrid, 'onChangeItem', onRuleGridDataModelItemChangeHandler));

	// window event listeners
	eventListeners.push(dataModel.addEventListener(window, window, 'onSelectionChanged', onDataModelSelectionChanged));
	eventListeners.push(dataModel.addEventListener(window, window, 'onNewItem', onDataModelNewItem));
	eventListeners.push(dataModel.addEventListener(window, window, 'onDeleteItem', onDataModelDeleteItem));
	eventListeners.push(dataModel.addEventListener(window, window, 'onChangeItem', onDataModelChangeItem));
}

function removeDataModelEventListeners() {
	var eventListeners = viewContext.eventListeners.dataModel || [];

	for (var i = 0; i < eventListeners.length; i++) {
		eventListeners[i].remove();
	}
}

function onRuleGridDataModelSelectionChanged(selectedItems) {
	this.deselect();

	if (selectedItems.length) {
		for (var i = 0; i < selectedItems.length; i++) {
			this.setSelectedRow(selectedItems[i].id);
		}
	}
}

function onRuleGridDataModelNewItem(modelItem) {
	if (modelItem.itemType === 'vm_Rule') {
		reloadRuleGridData();
	}
}

function onRuleGridDataModelDeleteItem(modelItem) {
	var itemType = modelItem.itemType;

	if (itemType === 'vm_Rule') {
		if (modelItem.isNew()) {
			reloadRuleGridData();
		} else {
			var gridStore = this.grid_Experimental.store; // jscs: ignore requireCamelCaseOrUpperCaseIdentifiers
			var gridItem = gridStore._itemsByIdentity[modelItem.uniqueId];

			gridStore.setValue(gridItem, '_itemAction', 'delete');
		}
	}
}

function onDataModelNewItem(modelItem) {
	if (modelItem.itemType === 'vm_Rule') {
		synchronizer.setScopeDirtyState();
	}
}

function onDataModelDeleteItem(modelItem) {
	if (modelItem.itemType === 'vm_Rule' && !modelItem.isNew()) {
		synchronizer.setScopeDirtyState();
	}
}

function onDataModelChangeItem(modelItem) {
	if (modelItem.itemType === 'vm_Rule') {
		synchronizer.setScopeDirtyState();
	}
}

function onSelectHelperTab(tabId) {
	if (!ruleHelpersTabbar.initializedTabs[tabId]) {
		var loaderMethodName = tabId + 'TabLoad';
		var loaderMethod = window[loaderMethodName];

		if (typeof loaderMethod === 'function') {
			loaderMethod(ruleHelpersTabbar._getTab(tabId));
			ruleHelpersTabbar.initializedTabs[tabId] = true;
		}
	}
}

function onRuleGridDataModelItemChangeHandler(modelItem, changesInfo) {
	var itemType = modelItem.itemType;

	if (itemType === 'vm_Rule') {
		var ruleGrid = viewContext.controls.ruleGrid;
		var gridWidget = ruleGrid.grid_Experimental; // jscs: ignore requireCamelCaseOrUpperCaseIdentifiers
		var gridStore = gridWidget.store;
		var storeItem = gridStore._itemsByIdentity[modelItem.uniqueId];

		if (storeItem) {
			var attributeChanges = changesInfo.attribute;
			var propertyChanges = changesInfo.property;

			if (attributeChanges && attributeChanges.action) {
				gridStore.setValue(storeItem, '_itemAction', attributeChanges.action);
			}

			if (propertyChanges) {
				var displayedProperties = gridWidget.structure;
				var propertyNameHash = {};
				var propertyDescriptor;
				var propertyName;
				var i;

				for (i = 0; i < displayedProperties.length; i++) {
					propertyDescriptor = displayedProperties[i];
					propertyNameHash[propertyDescriptor.field] = true;
				}

				for (propertyName in propertyChanges) {
					if (propertyNameHash[propertyName]) {
						const changedValue = propertyChanges[propertyName];

						if (propertyName == 'definition') {
							gridStore.setValue(storeItem, 'string_notation', serializeRuleItemToEditorTemplate(modelItem).RuleConditionGroup);
						}

						gridStore.setValue(storeItem, propertyName, changedValue);
					}
				}

				synchronizer.setScopeDirtyState();
			}
		}
	}
}

function onGridToolbarButtonClick(targetButton) {
	var actionId = targetButton.getId();
	var ruleGrid = viewContext.controls.ruleGrid;
	var dataModel = viewContext.data.dataModel;
	var gridToolbar = viewContext.controls.gridToolbar;

	switch (actionId) {
		case 'new':
			createNewRuleItem().then(function(newModelItem) {
				if (newModelItem) {
					reloadRuleGridData();
					ruleGrid.setSelectedRow(newModelItem.uniqueId);
				}
			});

			break;
		case 'delete':
			var ruleModelItem = viewContext.selectedRuleItem;
			var ruleEditor = viewContext.controls.ruleEditor;
			var selectedItemId = ruleModelItem.uniqueId;

			if (ruleModelItem.isNew()) {
				var nextRowIndex = ruleGrid.getRowIndex(selectedItemId) - 1;

				selectedItemId = nextRowIndex >= 0 ? ruleGrid.getRowId(nextRowIndex) : null;
			}

			ruleEditor.resetChanges();
			dataModel.deleteItem(ruleModelItem);

			selectRuleItem(selectedItemId, true);
			break;
		case 'setfilter':
			showFilterDialog();
			break;
		case 'clearfilter':
			setRuleFilter(null);
			break;
	}
}

function createNewRuleItem() {
	return new Promise(function(resolve) {
		var dataModel = viewContext.data.dataModel;
		var scopeModelItem = dataModel.getItemsByParameters({itemType: 'vm_VariabilityItem'})[0];
		var ruleModelItem = dataModel.createNewModelItem('vm_Rule');

		ruleModelItem.setItemProperty('item_number', 'Server Assigned');

		scopeModelItem.addChild(ruleModelItem);
		resolve(ruleModelItem);
	}.bind(this));
}

function showFilterDialog() {
	var aggregatedDataModel = viewContext.data.aggregatedDataModel;
	var allModelItems = aggregatedDataModel.getAllItems();
	var confirmDialogParams = {
		aras: aras,
		dialogWidth: 400,
		dialogHeight: 490,
		center: true,
		title: 'Filter settings',
		content: '../Modules/aras.innovator.VariantManagementSample/Views/filterRuleDialog.html'
	};
	var filtrationContext = {
		filtrationItems: aggregatedDataModel.getItemsByParameters({itemType: 'Variable'})
	};

	if (viewContext.ruleFilter) {
		aggregatedDataModel.restoreGroupedItems(viewContext.ruleFilter);
	} else {
		var modelItem;
		var i;

		for (i = 0; i < allModelItems.length; i++) {
			modelItem = allModelItems[i];

			if (modelItem.setItemGroup) {
				modelItem.setItemGroup('checked', {skipRecursive: true, suppressEvent: true});
			}
		}
	}

	confirmDialogParams.filtrationContext = filtrationContext;

	viewContext.topWindow.ArasModules.Dialog.show('iframe', confirmDialogParams).promise.then(function(returnValue) {
		if (returnValue === 'ok') {
			var groupItemsCache = aggregatedDataModel.getGroupedItemsCache();
			var checkedItemsCount = Object.keys(groupItemsCache).length;

			setRuleFilter(checkedItemsCount !== allModelItems.length ? groupItemsCache : null);
		}
	});
}

function setRuleFilter(newRuleFilter) {
	viewContext.ruleFilter = newRuleFilter;

	reloadRuleGridData();
	updateSelection();
	updateGridToolbarState();
}

function updateSelection() {
	var ruleGrid = viewContext.controls.ruleGrid;
	var selectedRuleId = ruleGrid.getSelectedId();
	selectRuleItem(selectedRuleId);
}

function onEditorToolbarButtonClick(targetButton) {
	var actionId = targetButton.getId();
	var ruleEditor = viewContext.controls.ruleEditor;

	switch (actionId) {
		case 'undo':
			ruleEditor.undoChange();

			setTimeout(function() {
				ruleEditor.focus();
			}, 0);
			break;
		case 'redo':
			ruleEditor.redoChange();

			setTimeout(function() {
				ruleEditor.focus();
			}, 0);
			break;
		case 'apply':
			applyRuleEditorChanges();
			break;
		case 'reset':
			if (viewContext.selectedRuleItem) {
				ruleEditor.resetChanges();
			}
			break;
		case 'viewxml':
			var expressionContainer = viewContext.layoutControls.xmlExpressionContainer;
			var isEnabled = targetButton.getState();

			if (isEnabled) {
				expressionContainer.classList.add('active');
			} else {
				expressionContainer.classList.remove('active');
			}
			break;
	}
}

function applyRuleEditorChanges() {
	var ruleEditor = viewContext.controls.ruleEditor;

	if (viewContext.selectedRuleItem && ruleEditor.isValueModified()) {
		if (ruleEditor.isInputValid()) {
			deserializeEditorValue(ruleEditor.getValue(true));
			ruleEditor.setStartState(ruleEditor.getCurrentState());
		} else {
			aras.AlertError('Apply error: value is invalid.');
		}
	}

	return false;
}

function updateGridToolbarState() {
	var gridToolbar = viewContext.controls.gridToolbar;
	var toolbarButtonIds = gridToolbar.getButtons(',').split(',');
	var buttonId;
	var buttonWidget;
	var i;

	for (i = 0; i < toolbarButtonIds.length; i++) {
		buttonId = toolbarButtonIds[i];
		buttonWidget = gridToolbar.getItem(buttonId);

		switch (buttonId) {
			case 'related_option':
			case 'new':
				buttonWidget.setEnabled(viewEditMode);
				break;
			case 'delete':
				buttonWidget.setEnabled(viewEditMode && viewContext.selectedRuleItem);
				break;
			case 'clearfilter':
				buttonWidget.setEnabled(isFilterActive());
				break;
			default:
				break;
		}
	}
}

function updateEditorToolbarState(isValidValue) {
	var editorToolbar = viewContext.controls.editorToolbar;
	var toolbarButtonIds = editorToolbar.getButtons(',').split(',');
	var ruleEditor = viewContext.controls.ruleEditor;
	var editorState = ruleEditor.getCurrentState();
	var buttonId;
	var buttonWidget;
	var i;

	for (i = 0; i < toolbarButtonIds.length; i++) {
		buttonId = toolbarButtonIds[i];
		buttonWidget = editorToolbar.getItem(buttonId);

		switch (buttonId) {
			case 'undo':
				buttonWidget.setEnabled(editorState && editorState.prev);
				break;
			case 'redo':
				buttonWidget.setEnabled(editorState && editorState.next);
				break;
			case 'apply':
				buttonWidget.setEnabled(editorState && editorState.prev && isValidValue);
				break;
			case 'reset':
				buttonWidget.setEnabled(editorState && editorState.prev);
				break;
		}
	}
}

function showSelectedItemForm(forceShow) {
	var selectedTabId = ruleHelpersTabbar.GetSelectedTab();
	var targetTabId = 'properties';

	if (selectedTabId === targetTabId || forceShow) {
		var tabDomNode = ruleHelpersTabbar._getTab(targetTabId).domNode;

		if (viewContext.selectedRuleItem) {
			var ruleModelItem = viewContext.selectedRuleItem;
			var relationshipNode = ruleModelItem.getRelationshipNode();
			var itemAction = relationshipNode.getAttribute('action');
			var isEditable = viewEditMode && (itemAction === 'add' || itemAction !== 'delete');

			formViewHelper.showFormById('B7804608819E48429CA93764F9DC1C3E', isEditable ? 'edit' : 'view', ruleModelItem.node, tabDomNode, handleFormPropertyChange);
		} else {
			formViewHelper.hideAllItemForms(tabDomNode);
		}
	}
}

function handleFormPropertyChange(propertyName, propertyValue) {
	if (viewContext.selectedRuleItem) {
		var ruleModelItem = viewContext.selectedRuleItem;
		var gridWidget = viewContext.controls.ruleGrid.grid_Experimental; // jscs: ignore requireCamelCaseOrUpperCaseIdentifiers
		var gridStore = gridWidget.store;
		var gridItem = gridStore._getItemByIdentity(ruleModelItem.uniqueId);

		gridStore.setValue(gridItem, propertyName, propertyValue);
		ruleModelItem.validateItem();

		ruleModelItem.setItemAttribute('action', 'edit');
	}
}

function onEditorStateChanged() {
	var ruleEditor = viewContext.controls.ruleEditor;
	var isValidValue = ruleEditor.isInputValid();

	if (isValidValue) {
		hideEditorErrorMessage();
	} else {
		showEditorErrorMessage(ruleEditor.getErrorString());
	}

	updateEditorToolbarState(isValidValue);
}

function showEditorErrorMessage(errorMessage) {
	var messageContainer = viewContext.layoutControls.messageContainer;

	messageContainer.textContent = errorMessage;
	messageContainer.style.opacity = '1';
}

function hideEditorErrorMessage() {
	var messageContainer = viewContext.layoutControls.messageContainer;

	messageContainer.style.opacity = '0';
}

function initHelpersTabbar() {
	if (ruleHelpersTabbar) {
		var requiredTabs = [{id: 'properties', label: 'Properties'}];
		var tabProperties;
		var i;

		for (i = 0; i < requiredTabs.length; i++) {
			tabProperties = requiredTabs[i];

			ruleHelpersTabbar.addTab(tabProperties.id, tabProperties.label);
		}
		ruleHelpersTabbar.selectTab('properties');
	}
}

function createGridLayout(dataTypeName) {
	var ruleItemType = aras.getItemTypeDictionary(dataTypeName);
	var visibleItemTypeProperties = aras.getvisiblePropsForItemType(ruleItemType.node);
	var itemTypeId = ruleItemType.getID();
	var visiblePropertiesHash = {};
	var resultLayout = [{
		field: '_itemAction',
		name: ' ',
		width: '30px',
		styles: 'text-align: center;'
	}];
	var propertyNode;
	var columnWidths;
	var columnOrder;
	var propertyName;
	var i;

	for (i = 0; i < visibleItemTypeProperties.length; i++) {
		propertyNode = visibleItemTypeProperties[i];
		propertyName = aras.getItemProperty(propertyNode, 'name');
		visiblePropertiesHash[propertyName] = propertyNode;
	}

	aras.uiInitItemsGridSetups(ruleItemType.node, visibleItemTypeProperties);

	columnWidths = aras.getPreferenceItemProperty('Core_ItemGridLayout', itemTypeId, 'col_widths').split(';');
	columnOrder = aras.getPreferenceItemProperty('Core_ItemGridLayout', itemTypeId, 'col_order').split(';');

	if (columnOrder.length === columnWidths.length) {
		var dataType;

		for (i = 0; i < columnOrder.length; i++) {
			propertyName = columnOrder[i];

			if (propertyName.substr(-2) === '_D') {
				propertyName = propertyName.substring(0, propertyName.length - 2);

				if (visiblePropertiesHash[propertyName]) {
					propertyNode = visiblePropertiesHash[propertyName];
					dataType = aras.getItemProperty(propertyNode, 'data_type');

					resultLayout.push({
						field: propertyName,
						name: aras.getItemProperty(propertyNode, 'label'),
						width: columnWidths[i] + 'px',
						styles: dataType === 'text' ? '' : 'text-align: center;',
						headerStyles: 'text-align: center;'
					});
				}
			}
		}
	}

	return resultLayout;
}

function isFilterActive() {
	return Boolean(viewContext.ruleFilter);
}

function createGridItems(gridControlLayout) {
	var gridItems = [];
	var dataModel = viewContext.data.dataModel;
	var ruleItems = dataModel.getItemsByParameters({itemType: 'vm_Rule'});

	if (ruleItems.length) {
		var currentRuleItem;
		var propertyName;
		var propertyValue;
		var newGridItem;
		var itemNode;
		var relationshipNode;
		var filteredItems;
		var expressionOptions;
		var itemId;
		var i;
		var j;

		if (isFilterActive()) {
			var ruleFilterItems = viewContext.ruleFilter;
			var activeOptionsHash = {};
			var itemIdPath;
			var hashItem;

			filteredItems = [];

			for (hashItem in ruleFilterItems) {
				itemIdPath = hashItem.split(',');
				itemId = itemIdPath[itemIdPath.length - 1];

				activeOptionsHash[itemId] = true;
			}

			for (i = 0; i < ruleItems.length; i++) {
				currentRuleItem = ruleItems[i];
				expressionOptions = currentRuleItem.getAllExpressionOptions();

				if (expressionOptions.length) {
					for (j = 0; j < expressionOptions.length; j++) {
						itemId = expressionOptions[j];

						if (activeOptionsHash[itemId]) {
							filteredItems.push(currentRuleItem);
							break;
						}
					}
				} else {
					filteredItems.push(currentRuleItem);
				}
			}
		} else {
			filteredItems = ruleItems;
		}

		for (i = 0; i < filteredItems.length; i++) {
			currentRuleItem = filteredItems[i];
			itemNode = currentRuleItem.node;
			relationshipNode = currentRuleItem.getRelationshipNode();

			newGridItem = {
				uniqueId: currentRuleItem.uniqueId,
				itemId: currentRuleItem.itemId,
				_modelItem: currentRuleItem,
				_itemAction: relationshipNode.getAttribute('action') || itemNode.getAttribute('action')
			};

			for (j = 1; j < gridControlLayout.length; j++) {
				propertyName = gridControlLayout[j].field;
				propertyValue = aras.getItemProperty(itemNode, propertyName);

				newGridItem[propertyName] = propertyValue;
			}

			gridItems.push(newGridItem);
		}
	}

	return gridItems;
}

function onGridRowSelect(rowId) {
	var dataModel = viewContext.data.dataModel;
	if (!viewContext.selectedRuleItem || viewContext.selectedRuleItem.uniqueId !== rowId && !dataModel._selectionChanging) {
		var ruleEditor = viewContext.controls.ruleEditor;

		if (ruleEditor.isValueModified() && !ruleEditor.isInputValid()) {
			showConfirmDialog('Editor contains unsaved changes. Proceed?')
				.then(function(selectedOption) {
					if (selectedOption === 'btnYes') {
						selectRuleItem(rowId);
					} else {
						viewContext.controls.ruleGrid.setSelectedRow(viewContext.selectedRuleItem.uniqueId);
					}
				});
		} else {
			selectRuleItem(rowId);
		}
	}
}

function selectRuleItem(ruleId, forceSelection) {
	var dataModel = viewContext.data.dataModel;
	var ruleModelItem = dataModel.getItemById(ruleId);

	dataModel.setSelection(ruleModelItem, {forceSelection: forceSelection});
}

function onDataModelSelectionChanged(selectedItems) {
	var ruleModelItem = selectedItems.length && selectedItems[0];
	var ruleEditor = viewContext.controls.ruleEditor;

	if (ruleModelItem) {
		var relationshipNode = ruleModelItem.getRelationshipNode();
		var serializedRule = serializeRuleItemToEditorTemplate(ruleModelItem);
		var itemAction = relationshipNode.getAttribute('action');
		var isEditable = viewEditMode && (itemAction === 'add' || itemAction !== 'delete');
		var expressionContainer = viewContext.layoutControls.xmlExpressionContainer;
		var expressionFrame = expressionContainer.querySelector('iframe');
		var expressionFrameContent = prepareExpressionContent(ruleModelItem.getItemProperty('definition'));

		viewContext.selectedRuleItem = ruleModelItem;

		expressionFrame.contentDocument.open();
		expressionFrame.contentDocument.write(expressionFrameContent);
		expressionFrame.contentDocument.close();

		if (!ruleEditor.isInputStarted()) {
			ruleEditor.startNewInput();
			updateEditorGroupOptions();
		}

		ruleEditor.setEditState(isEditable);
		ruleEditor.setValue(serializedRule);
		ruleEditor.focusFirstEditableGroup();
	} else {
		viewContext.selectedRuleItem = null;

		ruleEditor.setEditState(false);
		ruleEditor.setValue({});
	}

	showSelectedItemForm();
	updateGridToolbarState();
}

function prepareExpressionContent(expressionPropertyValue) {
	var expressionContent = '';

	if (expressionPropertyValue) {
		var xslDocument = viewContext.modules.XmlToHTMLTransform;
		var expressionDocument = new XmlDocument();

		expressionDocument.loadXML(expressionPropertyValue);
		expressionContent = expressionDocument.transformNode(xslDocument);
	}

	return expressionContent;
}

function showConfirmDialog(confirmationMessage, optionalParameters) {
	optionalParameters = optionalParameters || {};

	var topWindow = viewContext.topWindow;
	var confirmDialogParams = {
		buttons: optionalParameters.buttons || {
			btnYes: aras.getResource('', 'common.ok'),
			btnCancel: aras.getResource('', 'common.cancel')
		},
		defaultButton: optionalParameters.defaultButton || 'btnCancel',
		aras: aras,
		dialogWidth: 350,
		dialogHeight: 150,
		center: true,
		content: 'groupChgsDialog.html',
		message: confirmationMessage
	};
	return topWindow.ArasModules.Dialog.show('iframe', confirmDialogParams).promise;
}

function refreshActiveTab() {
	var selectedTab = ruleHelpersTabbar.GetSelectedTab();

	switch (selectedTab) {
		case 'properties':
			showSelectedItemForm();
			break;
		default:
			break;
	}
}

function serializeRuleItemToEditorTemplate(targetRuleItem) {
	var resultData = {
		optionNameToOptionsMap: {}
	};

	if (targetRuleItem) {
		resultData.RuleConditionGroup = targetRuleItem.deserializeExpressionToString({optionDeserializer: expressionPropositionFormDeserializer});
	}

	return resultData;
}

function onEditorGroupValueEntered(editorGroup, groupValue) {
	var ruleEditor = viewContext.controls.ruleEditor;
	var groupName = ruleEditor.getGroupName(editorGroup);

	applyEditorGroupValue(viewContext.selectedRuleItem, groupName, groupValue);
}

function expressionPropositionFormDeserializer(variableId, namedConstantId) {
	var deserializedValue = '';
	var optionModelItem = (viewContext.data.optionIdToOptionsMap[namedConstantId] || []).filter(function(optionItem) {
		return optionItem.parent.node.getAttribute('id') === variableId;
	})[0];

	if (optionModelItem) {
		var familyModelItem = optionModelItem.parent;
		var familyName = familyModelItem.getItemProperty('name');
		var optionName = optionModelItem.getItemProperty('name');
		var specialSymbolsRegExp = /^[a-zA-Z0-9]+$/;

		familyName = !specialSymbolsRegExp.test(familyName) ? '[' + familyName + ']' : familyName;
		optionName = !specialSymbolsRegExp.test(optionName) ? '[' + optionName + ']' : optionName;

		deserializedValue += familyName + ' = ' + optionName;
	} else {
		deserializedValue += '(Option ' + namedConstantId + ' was not found)';
	}

	return deserializedValue;
}

function serializeExpressionDataToXml(expressionData) {
	var serializedValue = '';

	if (expressionData) {
		var renderUtils = viewContext.modules.RenderUtils.HTML;
		var expressionValue;
		var i;

		expressionData = Array.isArray(expressionData) ? expressionData : [expressionData];
		expressionData = expressionData.filter(function(dataItem) {
			return dataItem && (typeof dataItem !== 'object' || dataItem.type !== 'whitespace');
		});

		if (expressionData.length === 4) {
			expressionValue = serializeExpressionToXml(expressionData[1]);
			serializedValue += renderUtils.wrapInTag(expressionValue, 'CONDITION');

			expressionValue = serializeExpressionToXml(expressionData[3]);
			serializedValue += renderUtils.wrapInTag(expressionValue, 'CONSEQUENCE');

			serializedValue = renderUtils.wrapInTag(serializedValue, 'IMPLICATION');
		} else {
			for (i = 0; i < expressionData.length; i++) {
				serializedValue += serializeExpressionToXml(expressionData[i]);
			}
		}
		serializedValue = renderUtils.wrapInTag(serializedValue, 'expression');
	}

	return serializedValue;
}

function serializeExpressionToXml(expressionData) {
	var renderUtils = viewContext.modules.RenderUtils.HTML;
	var expressionXml = '';
	var i;

	switch (expressionData.type) {
		case 'BinaryExpression':
			var optionName = expressionData.rightOperand.text;
			var variableName = expressionData.leftOperand.text || expressionData.leftOperand;
			var optionModelItem = viewContext.data.optionNameToOptionsMap[optionName].filter(function(variableItem) {
				return aras.getItemProperty(variableItem.parent.node, 'name') === variableName;
			})[0];
			var conditionVariableId = optionModelItem.parent.internal.itemData.itemId;
			expressionXml += renderUtils.wrapInTag('', 'variable', {id: conditionVariableId});
			expressionXml += renderUtils.wrapInTag('', 'named-constant', {id: optionModelItem.itemId});
			expressionXml = renderUtils.wrapInTag(expressionXml, 'EQ');
			break;
		case 'LogicExpression':
		case 'MacroExpression':
			var expressionParts = expressionData.children;

			for (i = 0; i < expressionParts.length; i++) {
				expressionXml += serializeExpressionToXml(expressionParts[i]);
			}

			expressionXml = renderUtils.wrapInTag(expressionXml, expressionData.op, (expressionData.brackets ? {brackets: true} : undefined));
			break;
	}

	return expressionXml;
}

function applyEditorGroupValue(ruleModelItem, groupName) {
	if (ruleModelItem && groupName) {
		var ruleEditor = viewContext.controls.ruleEditor;
		var editorGroup = ruleEditor.getGroupByName(groupName);
		var valueAppied = true;

		switch (groupName) {
			case 'RuleConditionGroup':
				var expressionData = editorGroup.getParsedExpression();
				var expressionXml = serializeExpressionDataToXml(expressionData);

				ruleModelItem.setItemProperty('definition', expressionXml);
				ruleModelItem.setItemProperty('string_notation', ruleModelItem.deserializeExpressionToString({optionDeserializer: expressionPropositionFormDeserializer}));
				break;
			default:
				valueAppied = false;
				break;
		}

		// updating itemAction column in grid
		if (valueAppied) {
			if (!ruleModelItem.isNew() && !ruleModelItem.isDeleted()) {
				var gridWidget = viewContext.controls.ruleGrid.grid_Experimental; // jscs: ignore requireCamelCaseOrUpperCaseIdentifiers
				var gridStore = gridWidget.store;
				var gridItem = gridStore._getItemByIdentity(ruleModelItem.uniqueId);

				gridStore.setValue(gridItem, '_itemAction', 'edit');
			}

			ruleModelItem.setItemAttribute('action', 'edit');
			synchronizer.setScopeDirtyState();
		}
	}
}

function deserializeEditorValue(editorValue) {
	if (editorValue && viewContext.selectedRuleItem) {
		var groupName;

		for (groupName in editorValue) {
			applyEditorGroupValue(viewContext.selectedRuleItem, groupName, editorValue[groupName]);
		}
	}
}

document.addEventListener('switchPane', function(e) {
	switch (e.detail.action) {
		case 'activate':
			this.loadView(window.parent.item);
			this.setupView(e.detail.additionalData);
			break;
		case 'deactivate':
			this.unloadView();
			break;
	}
}.bind(this));
