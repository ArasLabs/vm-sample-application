var aras = parent.aras;
var isUIControlsCreated = false;
var viewsController = parent.viewsController;
var treeEventListeners = [];
var storeEventListeners = [];
var synchronizer;
var formViewHelper;
var formContainerNode;
var viewDataStore;
var viewEditMode;
var scopeItemNode;
var treeControl;
var treeMenu;
var viewContext = {
	allowedTypes: [
		'cs_sample_GenericItem',
		'cs_sample_RelevantFamilies',
		'cs_sample_Family',
		'cs_sample_FamilyOption',
		'cs_sample_Option'
	],
	data: {
		aggregatedDataModel: null
	},
	modules: {
		ModelItem: null
	}
};

loadView = function(newScopeItemNode) {
	var shareData = viewsController.shareData;

	scopeItemNode = newScopeItemNode;
	synchronizer = shareData.synchronizer;
	synchronizer.setAllowedTypes(viewContext.allowedTypes);

	viewContext.data.aggregatedDataModel = shareData.aggregatedDataModel;

	formViewHelper = shareData.formViewHelper;

	if (!isUIControlsCreated) {
		setEditState(viewsController.isViewEditable());
		createUIControls(scopeItemNode);
	} else {
		synchronizer.registerTreeControl(treeControl);
		synchronizer.registerMenuControl(treeMenu);

		reloadView(scopeItemNode);
	}
};

reloadView = function(newScopeItemNode) {
	scopeItemNode = newScopeItemNode;

	viewDataStore = createViewDataStore();
	attachStoreEventListeners(viewDataStore);

	setEditState(viewsController.isViewEditable());
	reloadControlsData();
};

function createViewDataStore() {
	synchronizer.dataLoader.requestSampleRelationshipData(['cs_sample_RelevantFamilies']);
	var dataStore = synchronizer.dataLoader.createDataStore(scopeItemNode, viewContext.allowedTypes, {itemSorter: itemSorter});
	var rootStoreItem = dataStore.treeModelCollection[0];
	if (scopeItemNode.getAttribute('action') !== 'add') {
		var aggregatedData = viewsController.shareData.aggregatedDataModel;
		aggregatedData.loadSampleData(scopeItemNode.getAttribute('id'));
		var variables = aggregatedData.getItemsByParameters({itemType: 'Variable'});
		for (var i = 0, length = variables.length; i < length; i++) {
			if (!containsModelItem(rootStoreItem.children, variables[i])) {
				rootStoreItem.addChild(createModelElementFromNode(dataStore, variables[i].node, 'cs_sample_Family'));
			}
		}
		rootStoreItem.sortChildren(true);
	}
	return dataStore;
}

function containsModelItem(dataArray, modelItem) {
	for (var i = 0, dataLength = dataArray.length; i < dataLength; i++) {
		if (dataArray[i].itemId === modelItem.itemId) {
			return true;
		}
	}
	return false;
}

function createModelElementFromNode(dataStore, targetNode, typeName) {
	var itemId = targetNode.getAttribute('id');
	targetNode.setAttribute('type', typeName);
	var newModelElement = new viewContext.modules.ModelItem({
		id: itemId,
		name: dataStore.getTreeNodeName(targetNode),
		dataType: typeName,
		node: targetNode
	});
	newModelElement.uniqueId = itemId;
	newModelElement.isVirtual = true;
	var relationshipNodes = targetNode.selectNodes('./Relationships/Item');
	for (var i = 0; i < relationshipNodes.length; i++) {
		var currentNode = relationshipNodes[i];
		newModelElement.addChild(this.createModelElementFromNode(dataStore, currentNode, 'cs_sample_Option'));
	}
	return newModelElement;
}

function itemSorter(firstItem, secondItem) {
	var isFirstItemVirtual = firstItem.isVirtual;
	var isSecondItemVirtual = secondItem.isVirtual;
	if (isFirstItemVirtual === isSecondItemVirtual) {
		var firstItemName = aras.getItemProperty(firstItem.node, 'name');
		var secondItemName = aras.getItemProperty(secondItem.node, 'name');

		return firstItemName.localeCompare(secondItemName);
	} else if (isFirstItemVirtual) {
		return 1;
	} else {
		return -1;
	}
}

unloadView = function() {
	synchronizer.unregisterControl('tree');
	synchronizer.unregisterControl('menu');
};

reloadControlsData = function() {
	if (isUIControlsCreated) {
		var selectedStoreItem = viewDataStore.getItemByIdPath(treeControl.selectedIdPath) || viewDataStore.getRootElement();

		treeMenu.dataStore = viewDataStore;
		treeControl.refreshData(viewDataStore);
		treeControl.selectRow(selectedStoreItem.uniqueId);
	}
};

setEditState = function(editState) {
	editState = Boolean(editState);

	if (editState !== viewEditMode) {
		viewEditMode = editState;

		if (isUIControlsCreated) {
			treeControl.setEditable(editState);
		}
	}
};

createUIControls = function() {
	require([
		'dojo/_base/connect',
		'dojo/parser',
		'dijit/popup',
		'Configurator/Scripts/UI/TreeGridAdapter',
		'Configurator/Scripts/ScopeRules/TreeMenu',
		'Controls/Common/RenderUtils',
		'Configurator/Scripts/ScopeRules/ModelItem'
	], function(connect, parser, popup, TreeGridAdapter, TreeMenu, RenderUtils, ModelItem) {
		viewContext.modules.RenderUtils = RenderUtils;
		viewContext.modules.connect = connect;
		viewContext.modules.ModelItem = ModelItem;

		viewDataStore = createViewDataStore();
		var rootElement = viewDataStore.getRootElement();
		attachStoreEventListeners(viewDataStore);

		parser.parse();
		formContainerNode = document.getElementById('formPane');

		treeMenu = new TreeMenu({aras: aras, dataStore: viewDataStore, targetNodeIds: 'scopeTree'});
		treeControl = new TreeGridAdapter({connectId: 'scopeTree', dataStore: viewDataStore, menuHelper: treeMenu, isEditable: viewEditMode});
		treeControl._createTree();

		treeEventListeners.push(connect.connect(treeControl, 'onItemSelect', function(selectedItem) {
			popup.close(treeMenu.treeMenu);

			// need timeout 0 because form item can not save last property
			// when we at once change focus from form field to tree selectedItem
			setTimeout(function() {
				this.selectedIdPath = selectedItem.getItemIdPath();

				showTreeElement(selectedItem);
			}.bind(treeControl), 0);
		}));

		synchronizer.registerMenuControl(treeMenu);
		synchronizer.registerTreeControl(treeControl);

		window.addEventListener('beforeunload', onBeforeUnload);

		treeControl.selectRow(rootElement.uniqueId);
		isUIControlsCreated = true;
	});
};

function attachStoreEventListeners(targetStore) {
	if (targetStore) {
		var connectModule = viewContext.modules.connect;

		removeStoreEventListeners();

		storeEventListeners.push(connectModule.connect(targetStore, 'onElementPropertyChanged', function(storeElement) {
			var itemData = storeElement.itemData;

			itemData.name = this.getTreeNodeName(itemData.node);
			treeControl.updateRow(storeElement);
		}));
	}
}

function removeStoreEventListeners() {
	for (var i = 0; i < storeEventListeners.length; i++) {
		storeEventListeners[i].remove();
	}
}

function onBeforeUnload() {
	for (var i = 0; i < treeEventListeners.length; i++) {
		treeEventListeners[i].remove();
	}
	removeStoreEventListeners();
	window.removeEventListener('beforeunload', onBeforeUnload);
}

showTreeElement = function(targetElement) {
	if (targetElement.isRoot()) {
		setFormVisibility(false);
	} else {
		var isEditable = viewEditMode && (targetElement.isNew() || (!targetElement.isDeleted() && aras.isLockedByUser(targetElement.node) &&
			viewDataStore.isElementEditable(targetElement)));

		formViewHelper.showItemForm(targetElement.dataType, (isEditable ? 'edit' : 'view'), targetElement.node, formContainerNode, handleFormPropertyChange);
		setFormVisibility(true);
	}
};

setFormVisibility = function(doVisible) {
	var borderContainer = dijit.byId('viewContent');

	if (borderContainer.isFormVisible !== doVisible) {
		var relationshipGridPane = dijit.byId('formPane');

		relationshipGridPane.domNode.style.display = doVisible ? '' : 'none';
		borderContainer.resize();

		borderContainer.isFormVisible = doVisible;
	}
};

updateRequiredProperties = function(treeElementModel, needUpdateProperties) {
	var form = getCachedFormWithClassification(treeElementModel.dataType, (viewEditMode ? 'edit' : 'view'), treeElementModel.node);

	for (var j = 0; j < needUpdateProperties.length; j++) {
		var observerObject = form.form.contentWindow.observersHash.getElementById(needUpdateProperties[j].propertyName + '_system');

		if (observerObject) {
			observerObject.setValue(needUpdateProperties[j].propertyValue);
		}
	}
};

function handleFormPropertyChange(propertyName, propertyValue) {
	var storeItemId = treeControl.gridContainer.getSelectedId();
	var storeElement = viewDataStore.getElementById(storeItemId);

	if (storeElement) {
		viewDataStore.onElementPropertyChanged(storeElement, propertyName, propertyValue);
	}
}
