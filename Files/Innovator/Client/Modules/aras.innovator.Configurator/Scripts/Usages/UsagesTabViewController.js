var aras = parent.aras;
var ArasModules = parent.ArasModules;
var isUIControlsCreated = false;
var viewsController = parent.viewsController;
var viewContext = {
	gridLayout: null,
	selectedUsageItem: null,
	allowedTypes: [
		'cs_sample_GenericItem',
		'cs_sample_Usage'
	],
	controls: {
		usageGrid: null,
		usageEditor: null,
		editorToolbar: null,
		gridToolbar: null
	},
	data: {
		dataModel: null,
		aggregatedDataModel: null,
		scopeItemNode: null,
		optionNameToOptionsHash: null,
		variableNameHash: null,
		optionIdToOptionsHash: null
	},
	eventListeners: {},
	layoutControls: {},
	modules: {},
	topWindow: aras.getMostTopWindowWithAras(window)
};
var synchronizer;
var formViewHelper;
var usageHelpersTabbar;
var viewEditMode;

loadView = function(newScopeItemNode) {
	var shareData = viewsController.shareData;

	synchronizer = shareData.synchronizer;
	synchronizer.setAllowedTypes(viewContext.allowedTypes);

	viewContext.data.scopeItemNode = newScopeItemNode;
	viewContext.data.dataModel = shareData.scopeDataModel;
	viewContext.data.aggregatedDataModel = shareData.aggregatedDataModel;

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
		var usageModelItem = dataModel.getItemsByItemId(setupParameters.itemId);

		if (usageModelItem.length) {
			viewContext.controls.usageGrid.setSelectedRow(usageModelItem[0].uniqueId);
		}
	}
}

function unloadView() {
	removeDataModelEventListeners();
}

function initViewDataContainers(scopeItemNode) {
	synchronizer.dataLoader.requestSampleRelationshipData(['cs_sample_Usage']);

	viewContext.data.scopeItemNode = scopeItemNode;
	viewContext.data.dataModel.setScopeItem(scopeItemNode, {allowedItemTypes: viewContext.allowedTypes});

	if (!aras.isTempEx(scopeItemNode)) {
		viewContext.data.aggregatedDataModel.loadSampleData(scopeItemNode.getAttribute('id'));
		viewContext.data.aggregatedDataModel.restoreGroupedItems({});
	}

	prepareNamedConstantHashes();
}

function prepareNamedConstantHashes() {
	var viewData = viewContext.data;
	var variableModelItems = viewData.aggregatedDataModel.getItemsByParameters({itemType: 'Variable'});

	viewData.variableNameHash = {};
	viewData.optionNameToOptionsHash = {};
	viewData.optionIdToOptionsHash = {};

	// searching for available Variable and NamedConstants items
	for (var i = 0, length = variableModelItems.length; i < length; i++) {
		var modelItem = variableModelItems[i];
		var itemName = modelItem.getItemProperty('name');
		viewData.variableNameHash[itemName] = modelItem;

		for (var j = 0; j < modelItem.children.length; j++) {
			var namedConstantModelItem = modelItem.children[j];
			itemName = namedConstantModelItem.getItemProperty('name');

			if (!viewData.optionNameToOptionsHash[itemName]) {
				viewData.optionNameToOptionsHash[itemName] = [];
			}
			viewData.optionNameToOptionsHash[itemName].push(namedConstantModelItem);
			if (!viewData.optionIdToOptionsHash[namedConstantModelItem.itemId]) {
				viewData.optionIdToOptionsHash[namedConstantModelItem.itemId] = [];
			}
			viewData.optionIdToOptionsHash[namedConstantModelItem.itemId].push(namedConstantModelItem);
		}
	}
}

reloadControlsData = function() {
	var selectedUsageId;

	reloadUsageGridData();
	updateEditorGroupOptions();

	// restore selected grid item
	if (viewContext.selectedUsageItem) {
		var dataModel = viewContext.data.dataModel;
		var itemId = viewContext.selectedUsageItem.itemId;
		var usageStoreItems = dataModel.getItemsByItemId(itemId);

		if (usageStoreItems.length) {
			selectedUsageId = usageStoreItems[0].uniqueId;
		}
	}

	selectUsageItem(selectedUsageId);
	refreshActiveTab();
	updateGridToolbarState();
};

function reloadUsageGridData() {
	var gridItems = createGridItems(viewContext.gridLayout);
	var usageGrid = viewContext.controls.usageGrid;

	usageGrid.setArrayData_Experimental(gridItems); // jscs: ignore requireCamelCaseOrUpperCaseIdentifiers
}

function updateEditorGroupOptions() {
	var usageEditor = viewContext.controls.usageEditor;

	if (usageEditor.isInputStarted()) {
		var namedConstantNameCollection = {};
		var viewData = viewContext.data;
		var targetGroup = usageEditor.getGroupByName('UsageConditionGroup');

		for (var namedConstantName in viewData.optionNameToOptionsHash) {
			var modelItems = viewData.optionNameToOptionsHash[namedConstantName];
			namedConstantNameCollection[namedConstantName] = modelItems.map(function(modelItem) {
				return aras.getItemProperty(modelItem.parent.node, 'name');
			});
		}

		targetGroup.setParserProperty('_FamilyNames', viewData.variableNameHash);
		targetGroup.setParserProperty('_OptionNames', namedConstantNameCollection);
	}
}

setEditState = function(editState) {
	editState = Boolean(editState);
	if (editState !== viewEditMode) {
		viewEditMode = editState;
	}
};

createUIControls = function() {
	require([
		'dojo/parser',
		'Controls/Common/RenderUtils',
		'Modules/aras.innovator.Configurator/Scripts/Classes/ruleEditor/csRuleEditorControl',
		'Configurator/Scripts/RuleEditor/UsageTemplate',
		'dojo/text!Configurator/Styles/XMLtoHTML.xsl'
	], function(parser, RenderUtils, EditorControl, UsageTemplate, TranformXSL) {
		var xslDocument = new XmlDocument();
		var viewControls = viewContext.controls;

		xslDocument.loadXML(TranformXSL);

		if (aras.Browser.isIe()) {
			xslDocument.setProperty('SelectionNamespaces', 'xmlns:xsl="http://www.w3.org/1999/XSL/Transform"');
		} else {
			xslDocument.documentElement.setAttribute('xmlns:xsl', 'http://www.w3.org/1999/XSL/Transform');
		}

		viewContext.modules.RenderUtils = RenderUtils;
		viewContext.modules.XmlToHTMLTransform = xslDocument;
		parser.parse();

		viewContext.gridLayout = createGridLayout('cs_sample_Usage');

		// usageGrid control creation
		clientControlsFactory.createControl('Aras.Client.Controls.Public.GridContainer', {connectId: 'usageGridContainer'}, function(control) {
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
			viewControls.usageGrid = control;
			// jscs: enable
		});

		clientControlsFactory.createControl('Aras.Client.Controls.Public.ToolBar', {id: 'gridToolbar', connectId: 'usageGridToolbar', style: 'overflow: hidden;'},
			function(control) {
				control.loadXml(aras.getI18NXMLResource('usagegrid_toolbar.xml'));

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

		var usageEditor = new EditorControl({connectId: 'ruleEditorControl', template: UsageTemplate, isEditable: viewEditMode});
		usageEditor.addEventListener(window, null, 'onGroupValueEntered', onEditorGroupValueEntered);
		usageEditor.addEventListener(window, null, 'onStateChanged', onEditorStateChanged);
		usageEditor.registerShortcut(83, true, false, applyUsageEditorChanges);

		viewContext.controls.usageEditor = usageEditor;

		// tabbar control creation
		clientControlsFactory.createControl('Aras.Client.Controls.Experimental.SimpleTabbar', {style: 'width:100%; height:100%;'}, function(control) {
			usageHelpersTabbar = control;
			usageHelpersTabbar.initializedTabs = {};

			document.getElementById('usageHelpersContainer').appendChild(usageHelpersTabbar.domNode);
			clientControlsFactory.on(usageHelpersTabbar, {
				'onClick': onSelectHelperTab
			});

			usageHelpersTabbar.startup();
			initHelpersTabbar();
		});

		var viewBorderContainerWidget = dijit.byId('viewBorderContainer');
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
	var usageGrid = viewContext.controls.usageGrid;

	eventListeners.push(dataModel.addEventListener(usageGrid, usageGrid, 'onSelectionChanged', onUsageGridDataModelSelectionChanged));
	eventListeners.push(dataModel.addEventListener(usageGrid, usageGrid, 'onNewItem', onUsageGridDataModelNewItem));
	eventListeners.push(dataModel.addEventListener(usageGrid, usageGrid, 'onDeleteItem', onUsageGridDataModelDeleteItem));
	eventListeners.push(dataModel.addEventListener(usageGrid, usageGrid, 'onChangeItem', onUsageGridDataModelItemChangeHandler));

	eventListeners.push(dataModel.addEventListener(window, window, 'onSelectionChanged', onDataModelSelectionChanged));
	eventListeners.push(dataModel.addEventListener(window, window, 'onNewItem', onDataModelNewItem));
	eventListeners.push(dataModel.addEventListener(window, window, 'onDeleteItem', onDataModelDeleteItem));
	eventListeners.push(dataModel.addEventListener(window, window, 'onChangeItem', onDataModelChangeItem));
}

function removeDataModelEventListeners() {
	var eventListeners = viewContext.eventListeners.dataModel || [];
	for (var i = 0, length = eventListeners.length; i < length; i++) {
		eventListeners[i].remove();
	}
}

function onUsageGridDataModelSelectionChanged(selectedItems) {
	this.deselect();
	if (selectedItems.length) {
		for (var i = 0, length = selectedItems.length; i < length; i++) {
			this.setSelectedRow(selectedItems[i].id);
		}
	}
}

function onUsageGridDataModelNewItem(modelItem) {
	if (modelItem.itemType === 'cs_sample_Usage') {
		reloadUsageGridData();
	}
}

function onUsageGridDataModelDeleteItem(modelItem) {
	var itemType = modelItem.itemType;

	if (itemType === 'cs_sample_Usage') {
		if (modelItem.isNew()) {
			reloadUsageGridData();
		} else {
			var gridStore = this.grid_Experimental.store; // jscs: ignore requireCamelCaseOrUpperCaseIdentifiers
			var gridItem = gridStore._itemsByIdentity[modelItem.uniqueId];

			gridStore.setValue(gridItem, '_itemAction', 'delete');
		}
	}
}

function onDataModelNewItem(modelItem) {
	if (modelItem.itemType === 'cs_sample_Usage') {
		synchronizer.setScopeDirtyState();
	}
}

function onDataModelDeleteItem(modelItem) {
	if (modelItem.itemType === 'cs_sample_Usage' && !modelItem.isNew()) {
		synchronizer.setScopeDirtyState();
	}
}

function onDataModelChangeItem(modelItem) {
	if (modelItem.itemType === 'cs_sample_Usage') {
		synchronizer.setScopeDirtyState();
	}
}

function onSelectHelperTab(tabId) {
	if (!usageHelpersTabbar.initializedTabs[tabId]) {
		var loaderMethodName = tabId + 'TabLoad';
		var loaderMethod = window[loaderMethodName];

		if (typeof loaderMethod === 'function') {
			loaderMethod(usageHelpersTabbar._getTab(tabId));
			usageHelpersTabbar.initializedTabs[tabId] = true;
		}
	}
}

function onUsageGridDataModelItemChangeHandler(modelItem, changesInfo) {
	var itemType = modelItem.itemType;

	if (itemType === 'cs_sample_Usage') {
		var usageGrid = viewContext.controls.usageGrid;
		var gridWidget = usageGrid.grid_Experimental; // jscs: ignore requireCamelCaseOrUpperCaseIdentifiers
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

				for (var i = 0, length = displayedProperties.length; i < length; i++) {
					var propertyDescriptor = displayedProperties[i];
					propertyNameHash[propertyDescriptor.field] = true;
				}

				for (var propertyName in propertyChanges) {
					if (propertyNameHash[propertyName]) {
						if (propertyName === 'definition') {
							gridStore.setValue(storeItem, propertyName, serializeUsageItemToEditorTemplate(modelItem).UsageConditionGroup);
						} else {
							gridStore.setValue(storeItem, propertyName, propertyChanges[propertyName]);
						}
					}
				}

				synchronizer.setScopeDirtyState();
			}
		}
	}
}

function onGridToolbarButtonClick(targetButton) {
	var actionId = targetButton.getId();
	var usageGrid = viewContext.controls.usageGrid;
	var dataModel = viewContext.data.dataModel;

	switch (actionId) {
		case 'new':
		case 'replace':
			createNewUsageItem(actionId);
			break;
		case 'delete':
			var usageModelItem = viewContext.selectedUsageItem;
			var usageEditor = viewContext.controls.usageEditor;
			var selectedItemId = usageModelItem.uniqueId;

			if (usageModelItem.isNew()) {
				var nextRowIndex = usageGrid.getRowIndex(selectedItemId) - 1;
				selectedItemId = nextRowIndex >= 0 ? usageGrid.getRowId(nextRowIndex) : null;
			}

			usageEditor.resetChanges();
			dataModel.deleteItem(usageModelItem);

			selectUsageItem(selectedItemId, true);
			break;
	}
}

function createNewUsageItem(action) {
	var dataModel = viewContext.data.dataModel;
	var scopeModelItem = dataModel.getItemsByParameters({itemType: 'cs_sample_GenericItem'})[0];
	return synchronizer.showSearchDialog('Part', function(selectedItemIds) {
		if (selectedItemIds.length) {
			for (var i = 0, length = selectedItemIds.length; i < length; i++) {
				var itemId = selectedItemIds[i];
				var itemNode = aras.getItemById('Part', itemId);
				if (itemNode) {
					var usageModelItem;
					if (action === 'new') {
						var newRelationshipItem = this.aras.newIOMItem('cs_sample_Usage', 'add');
						newRelationshipItem.setProperty('source_id', scopeModelItem.node.getAttribute('id'));
						usageModelItem = dataModel.createModelItemFromItemNode(newRelationshipItem.node.cloneNode(true), {
							itemProperties: {
								definition: '<expression></expression>'
							}
						});
						scopeModelItem.addChild(usageModelItem, {appendItemNode: true});
						aras.setNodeElement(newRelationshipItem.node, 'related_id', itemNode);
					} else {
						usageModelItem = viewContext.selectedUsageItem;
						var currentAction = usageModelItem.node.getAttribute('action');
						if (currentAction !== 'add') {
							usageModelItem.node.setAttribute('action', 'edit');
						}
						aras.setNodeElement(usageModelItem.node, 'related_id', itemNode);
						this.showSelectedItemForm(true);
					}
					this.reloadUsageGridData();
					viewContext.controls.usageGrid.setSelectedRow(usageModelItem.uniqueId);
				}
			}
		}
	}.bind(this), {dblclickclose: false, multiselect: true});
}

function onEditorToolbarButtonClick(targetButton) {
	var actionId = targetButton.getId();
	var usageEditor = viewContext.controls.usageEditor;

	switch (actionId) {
		case 'undo':
			usageEditor.undoChange();
			setTimeout(function() {
				usageEditor.focus();
			}, 0);
			break;
		case 'redo':
			usageEditor.redoChange();
			setTimeout(function() {
				usageEditor.focus();
			}, 0);
			break;
		case 'apply':
			applyUsageEditorChanges();
			break;
		case 'reset':
			if (viewContext.selectedUsageItem) {
				usageEditor.resetChanges();
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

function applyUsageEditorChanges() {
	var usageEditor = viewContext.controls.usageEditor;

	if (viewContext.selectedUsageItem && usageEditor.isValueModified()) {
		if (usageEditor.isInputValid()) {
			deserializeEditorValue(usageEditor.getValue(true));
			usageEditor.setStartState(usageEditor.getCurrentState());
		} else {
			aras.AlertError('Apply error: value is invalid.');
		}
	}

	return false;
}

function updateGridToolbarState() {
	var gridToolbar = viewContext.controls.gridToolbar;
	var toolbarButtonIds = gridToolbar.getButtons(',').split(',');
	var scopeModelItem = viewContext.data.dataModel.getItemsByParameters({itemType: 'cs_sample_GenericItem'})[0];
	var relatedGenericItems = scopeModelItem.node.selectNodes('./Relationships/Item[@type="cs_sample_GenericItemStructure"]');
	var isActionAllowed = !(relatedGenericItems && relatedGenericItems.length);
	for (var i = 0, length = toolbarButtonIds.length; i < length; i++) {
		var buttonId = toolbarButtonIds[i];
		var buttonWidget = gridToolbar.getItem(buttonId);
		switch (buttonId) {
			case 'new':
				buttonWidget.setEnabled(isActionAllowed && viewEditMode);
				break;
			case 'replace':
			case 'delete':
				buttonWidget.setEnabled(isActionAllowed && viewEditMode && viewContext.selectedUsageItem);
				break;
			default:
				break;
		}
	}
}

function updateEditorToolbarState(isValidValue) {
	var editorToolbar = viewContext.controls.editorToolbar;
	var toolbarButtonIds = editorToolbar.getButtons(',').split(',');
	var usageEditor = viewContext.controls.usageEditor;
	var editorState = usageEditor.getCurrentState();

	for (var i = 0, length = toolbarButtonIds.length; i < length; i++) {
		var buttonId = toolbarButtonIds[i];
		var buttonWidget = editorToolbar.getItem(buttonId);

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
	var selectedTabId = usageHelpersTabbar.GetSelectedTab();
	var targetTabId = 'part';

	if (selectedTabId === targetTabId || forceShow) {
		var tabDomNode = usageHelpersTabbar._getTab(targetTabId).domNode;

		if (viewContext.selectedUsageItem) {
			var relationshipNode = viewContext.selectedUsageItem.getRelationshipNode();
			var itemAction = relationshipNode.getAttribute('action');
			var isEditable = viewEditMode && (itemAction === 'add' || itemAction !== 'delete');

			formViewHelper.showFormById(
				'68F7300629614C7EBD9FA41D8F606BF0',
				isEditable ? 'edit' : 'view',
				relationshipNode.selectSingleNode('related_id/Item'), tabDomNode, handleFormPropertyChange
			);
		} else {
			formViewHelper.hideAllItemForms(tabDomNode);
		}
	}
}

function handleFormPropertyChange(propertyName, propertyValue) {
	if (viewContext.selectedUsageItem) {
		var usageModelItem = viewContext.selectedUsageItem;
		var gridWidget = viewContext.controls.usageGrid.grid_Experimental; // jscs: ignore requireCamelCaseOrUpperCaseIdentifiers
		var gridStore = gridWidget.store;
		var gridItem = gridStore._getItemByIdentity(usageModelItem.uniqueId);

		gridStore.setValue(gridItem, propertyName, propertyValue);
		usageModelItem.validateItem();

		usageModelItem.setItemAttribute('action', 'edit');
	}
}

function onEditorStateChanged() {
	var usageEditor = viewContext.controls.usageEditor;
	var isValidValue = usageEditor.isInputValid();

	if (isValidValue) {
		hideEditorErrorMessage();
	} else {
		showEditorErrorMessage(usageEditor.getErrorString());
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
	if (usageHelpersTabbar) {
		usageHelpersTabbar.addTab('part', 'Part');
		usageHelpersTabbar.selectTab('part');
	}
}

function createGridLayout() {
	return [
		{
			field: '_itemAction',
			name: ' ',
			width: '30px',
			styles: 'text-align: center;'
		},
		{
			field: 'definition',
			name: 'Propositional Form',
			width: '400px',
			styles: 'text-align: center;',
			headerStyles: 'text-align: center;'
		},
		{
			field: 'part_number',
			name: 'Part',
			width: '100px',
			styles: 'text-align: center;',
			headerStyles: 'text-align: center;'
		},
		{
			field: 'part_description',
			name: 'Part Description',
			width: '300px',
			styles: 'text-align: center;',
			headerStyles: 'text-align: center;'
		}
	];
}

function createGridItems() {
	var gridItems = [];
	var dataModel = viewContext.data.dataModel;
	var usageItems = dataModel.getItemsByParameters({itemType: 'cs_sample_Usage'});

	if (usageItems.length) {
		for (var i = 0, length = usageItems.length; i < length; i++) {
			var currentUsageItem = usageItems[i];
			var itemNode = currentUsageItem.node;
			var relationshipNode = currentUsageItem.getRelationshipNode();

			var partItemNode = itemNode.selectSingleNode('related_id/Item');
			var newGridItem = {
				uniqueId: currentUsageItem.uniqueId,
				itemId: currentUsageItem.itemId,
				_modelItem: currentUsageItem,
				_itemAction: relationshipNode.getAttribute('action') || itemNode.getAttribute('action'),
				definition: this.serializeUsageItemToEditorTemplate(currentUsageItem).UsageConditionGroup,
				part_number: aras.getItemProperty(partItemNode, 'item_number'), // jscs: ignore requireCamelCaseOrUpperCaseIdentifiers
				part_description: aras.getItemProperty(partItemNode, 'description') // jscs: ignore requireCamelCaseOrUpperCaseIdentifiers
			};
			gridItems.push(newGridItem);
		}
	}

	return gridItems;
}

function onGridRowSelect(rowId) {
	var dataModel = viewContext.data.dataModel;
	if (!viewContext.selectedUsageItem || viewContext.selectedUsageItem.uniqueId !== rowId && !dataModel._selectionChanging) {
		var usageEditor = viewContext.controls.usageEditor;

		if (usageEditor.isValueModified() && !usageEditor.isInputValid()) {
			showConfirmDialog('Editor contains unsaved changes. Proceed?')
				.then(function(selectedOption) {
					if (selectedOption === 'btnYes') {
						selectUsageItem(rowId);
					} else {
						viewContext.controls.usageGrid.setSelectedRow(viewContext.selectedUsageItem.uniqueId);
					}
				});
		} else {
			selectUsageItem(rowId);
		}
	}
}

function selectUsageItem(usageId, forceSelection) {
	var dataModel = viewContext.data.dataModel;
	var usageModelItem = dataModel.getItemById(usageId);

	dataModel.setSelection(usageModelItem, {forceSelection: forceSelection});
}

function onDataModelSelectionChanged(selectedItems) {
	var usageModelItem = selectedItems.length && selectedItems[0];
	var usageEditor = viewContext.controls.usageEditor;

	if (usageModelItem) {
		var relationshipNode = usageModelItem.getRelationshipNode();
		var serializedUsage = serializeUsageItemToEditorTemplate(usageModelItem);
		var itemAction = relationshipNode.getAttribute('action');
		var isEditable = viewEditMode && (itemAction === 'add' || itemAction !== 'delete');
		var expressionContainer = viewContext.layoutControls.xmlExpressionContainer;
		var expressionFrame = expressionContainer.querySelector('iframe');
		var expressionFrameContent = prepareExpressionContent(usageModelItem.getItemProperty('definition'));

		viewContext.selectedUsageItem = usageModelItem;

		expressionFrame.contentDocument.open();
		expressionFrame.contentDocument.write(expressionFrameContent);
		expressionFrame.contentDocument.close();

		if (!usageEditor.isInputStarted()) {
			usageEditor.startNewInput();
			updateEditorGroupOptions();
		}

		usageEditor.setEditState(isEditable);
		usageEditor.setValue(serializedUsage);
		usageEditor.focusFirstEditableGroup();
	} else {
		viewContext.selectedUsageItem = null;

		usageEditor.setEditState(false);
		usageEditor.setValue({});
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

	if (optionalParameters.sync) {
		var confirmationResult;

		if (aras.Browser.isCh()) {
			confirmationResult = topWindow.confirm(confirmationMessage) ? 'btnYes' : 'btnCancel';
		} else {
			confirmationResult = aras.modalDialogHelper.show('DefaultModal',
				topWindow,
				confirmDialogParams,
				confirmDialogParams,
				'groupChgsDialog.html');
		}

		if (typeof optionalParameters.onClose === 'function') {
			optionalParameters.onClose(confirmationResult);
		}

		return confirmationResult;
	} else {
		return topWindow.ArasModules.Dialog.show('iframe', confirmDialogParams).promise;
	}
}

function refreshActiveTab() {
	var selectedTab = usageHelpersTabbar.GetSelectedTab();

	switch (selectedTab) {
		case 'part':
			showSelectedItemForm();
			break;
		default:
			break;
	}
}

function serializeUsageItemToEditorTemplate(targetUsageItem) {
	var resultData = {
		optionNameToOptionsHash: {}
	};

	if (targetUsageItem) {
		resultData.UsageConditionGroup = targetUsageItem.deserializeExpressionToString({optionDeserializer: expressionPropositionFormDeserializer});
	}

	return resultData;
}

function onEditorGroupValueEntered(editorGroup, groupValue) {
	var usageEditor = viewContext.controls.usageEditor;
	var groupName = usageEditor.getGroupName(editorGroup);

	applyEditorGroupValue(viewContext.selectedUsageItem, groupName, groupValue);
}

function expressionPropositionFormDeserializer(variableId, namedConstantId) {
	var deserializedValue = '';
	var namedConstantModelItem = (viewContext.data.optionIdToOptionsHash[namedConstantId] || []).filter(function(modelItem) {
		return modelItem.parent.node.getAttribute('id') === variableId;
	})[0];

	if (namedConstantModelItem) {
		var familyModelItem = namedConstantModelItem.parent;
		var familyName = familyModelItem.getItemProperty('name');
		var namedConstantName = namedConstantModelItem.getItemProperty('name');
		var specialSymbolsRegExp = /^[a-zA-Z0-9]+$/;

		familyName = !specialSymbolsRegExp.test(familyName) ? '[' + familyName + ']' : familyName;
		namedConstantName = !specialSymbolsRegExp.test(namedConstantName) ? '[' + namedConstantName + ']' : namedConstantName;

		deserializedValue += familyName + ' = ' + namedConstantName;
	} else {
		deserializedValue += '(Option ' + namedConstantId + ' was not found)';
	}

	return deserializedValue;
}

function serializeExpressionDataToXml(expressionData) {
	var serializedValue = '';

	if (expressionData) {
		var renderUtils = viewContext.modules.RenderUtils.HTML;

		expressionData = Array.isArray(expressionData) ? expressionData : [expressionData];
		expressionData = expressionData.filter(function(dataItem) {
			return dataItem && (typeof dataItem !== 'object' || dataItem.type !== 'whitespace');
		});

		for (var i = 0, length = expressionData.length; i < length; i++) {
			serializedValue += serializeExpressionToXml(expressionData[i]);
		}
		serializedValue = renderUtils.wrapInTag(serializedValue, 'expression');
	}

	return serializedValue;
}

function serializeExpressionToXml(expressionData) {
	var renderUtils = viewContext.modules.RenderUtils.HTML;
	var expressionXml = '';

	switch (expressionData.type) {
		case 'BinaryExpression':
			var namedConstantName = expressionData.rightOperand.text;
			var variableName = expressionData.leftOperand.text || expressionData.leftOperand;
			var namedConstantModelItem = viewContext.data.optionNameToOptionsHash[namedConstantName].filter(function(variableItem) {
				return aras.getItemProperty(variableItem.parent.node, 'name') === variableName;
			})[0];
			var conditionVariableId = namedConstantModelItem.parent.itemId;
			expressionXml += renderUtils.wrapInTag('', 'variable', {id: conditionVariableId});
			expressionXml += renderUtils.wrapInTag('', 'named-constant', {id: namedConstantModelItem.itemId});
			expressionXml = renderUtils.wrapInTag(expressionXml, 'EQ');
			break;
		case 'LogicExpression':
			var expressionParts = expressionData.children;

			for (var i = 0, length = expressionParts.length; i < length; i++) {
				expressionXml += serializeExpressionToXml(expressionParts[i]);
			}

			expressionXml = renderUtils.wrapInTag(expressionXml, expressionData.op, (expressionData.brackets ? {brackets: true} : undefined));
			break;
	}

	return expressionXml;
}

function applyEditorGroupValue(usageModelItem, groupName) {
	if (usageModelItem && groupName) {
		var usageEditor = viewContext.controls.usageEditor;
		var editorGroup = usageEditor.getGroupByName(groupName);
		var valueApplied = true;

		switch (groupName) {
			case 'UsageConditionGroup':
				var expressionData = editorGroup.getParsedExpression();
				var expressionXml = serializeExpressionDataToXml(expressionData);
				usageModelItem.setItemProperty('definition', expressionXml);
				break;
			default:
				valueApplied = false;
				break;
		}

		// updating itemAction column in grid
		if (valueApplied) {
			if (!usageModelItem.isNew() && !usageModelItem.isDeleted()) {
				var gridWidget = viewContext.controls.usageGrid.grid_Experimental; // jscs: ignore requireCamelCaseOrUpperCaseIdentifiers
				var gridStore = gridWidget.store;
				var gridItem = gridStore._getItemByIdentity(usageModelItem.uniqueId);

				gridStore.setValue(gridItem, '_itemAction', 'edit');
			}

			usageModelItem.setItemAttribute('action', 'edit');
			synchronizer.setScopeDirtyState();
		}
	}
}

function deserializeEditorValue(editorValue) {
	if (editorValue && viewContext.selectedUsageItem) {
		for (var groupName in editorValue) {
			applyEditorGroupValue(viewContext.selectedUsageItem, groupName, editorValue[groupName]);
		}
	}
}
