let scopeItem = window.item;

const itemViewPaneId = 'formTab';
const validationViewPaneId = 'validation-view-pane';
const textRuleEditorViewPaneId = 'text-rule-editor-view-pane';
const tableRuleEditorViewPaneId = 'table-rule-editor-view-pane';
const variantTreeViewPaneId = 'variant-tree-view-pane';

window.viewsController = {
	shareData: {},

	_currentUser: aras.getUserID(),

	_isRootItemAction: false,

	_originMethods: {
		lockCommand: window.onLockCommand,
		unlockCommand: window.onUnlockCommand,
		saveCommand: window.onSaveCommand,
		refreshCommand: window.onRefresh,
		setItem: window.setItem
	},

	init: function() {
		window.vmSwitchableTabItemViewController.isPaneAvailable = this._getViewAvailability.bind(this);
	},

	onItemLinkClicked: function(itemTypeName, additionalData) {
		let paneId;
		switch (itemTypeName) {
			case 'vm_Rule':
				paneId = textRuleEditorViewPaneId;
				break;
		}

		window.vmSwitchableTabItemViewController.switchActivePane(paneId, additionalData);
	},

	reloadActiveView: function(newItem) {
		const activePaneElement = window.vmSwitchableTabItemViewController.activePaneElement;
		const activeViewWindow = activePaneElement.contentWindow || activePaneElement.ownerDocument.defaultView;

		if (activeViewWindow && activeViewWindow.reloadView) {
			activeViewWindow.reloadView(newItem);
		}
	},

	refreshSidebarButtonsAvailability: function() {
		window.vmSwitchableTabItemViewController.refreshSidebarButtonsAvailability();
	},

	callRootItemCommand: function(commandName, commandArguments) {
		this._isRootItemAction = true;

		const commandHandler = this._originMethods[commandName];

		if (commandHandler) {
			const applyCommandResult = commandHandler.apply(window, commandArguments);

			if (applyCommandResult instanceof Promise) {
				return applyCommandResult.then(function(result) {
					this._isRootItemAction = false;
					this.refreshSidebarButtonsAvailability();
					return result;
				}.bind(this));
			} else {
				this._isRootItemAction = false;
				this.refreshSidebarButtonsAvailability();
				return applyCommandResult;
			}
		}
	},

	isViewEditable: function() {
		return aras.isTempEx(scopeItem) || aras.getItemProperty(scopeItem, 'locked_by_id') === this._currentUser;
	},

	_getViewAvailability: function(viewId) {
		const isNewItem = aras.isTempEx(scopeItem);
		const isDirty = aras.isDirtyEx(scopeItem);
		const activePaneId = window.vmSwitchableTabItemViewController.activePaneId;

		switch (viewId) {
			case validationViewPaneId:
			case variantTreeViewPaneId:
				return !isNewItem && !isDirty;
			case textRuleEditorViewPaneId:
			case tableRuleEditorViewPaneId:
				return !isNewItem && (!isDirty || activePaneId === textRuleEditorViewPaneId || activePaneId === tableRuleEditorViewPaneId);
			case itemViewPaneId:
				return !isDirty;
			default:
				return true;
		}
	}
};

document.addEventListener('loadWidgets', function() {
	require([
		'dojo/aspect',
		'Modules/aras.innovator.VariantManagementSample/Scripts/scopeRules/dataLoader',
		'Modules/aras.innovator.VariantManagementSample/Scripts/scopeRules/synchronizer',
		'Modules/aras.innovator.VariantManagementSample/Scripts/common/itemFormViewHelper',
		'Modules/aras.innovator.VariantManagementSample/Scripts/tableRuleEditor/dataModel/scopeDataModel',
		'Modules/aras.innovator.VariantManagementSample/Scripts/tableRuleEditor/dataModel/aggregatedDataModel'
	], function(aspect, DataLoader, Synchronizer, ItemFormViewHelper, ScopeDataModel, AggregatedDataModel) {
		const dataLoader = new DataLoader({aras: aras, scopeItem: scopeItem});
		const shareData = window.viewsController.shareData;
		const scopeDataModel = new ScopeDataModel({aras: aras, scopeItem: scopeItem});
		const aggregatedDataModel = new AggregatedDataModel({aras: aras});

		const synchronizer = new Synchronizer({
			aras: aras,
			scopeItem: scopeItem,
			dataLoader: dataLoader,
			isEditMode: window.isEditMode
		});

		// register events
		aspect.after(synchronizer, 'setScopeDirtyState', window.viewsController.refreshSidebarButtonsAvailability.bind(window.viewsController), true);

		shareData.synchronizer = synchronizer;
		shareData.formViewHelper = new ItemFormViewHelper({aras: aras});
		shareData.scopeDataModel = scopeDataModel;
		shareData.aggregatedDataModel = aggregatedDataModel;
	});
});

document.addEventListener('loadSideBar', function() {
	window.viewsController.init();

	require(['dojo/ready'], function(ready) {
		ready(function() {
			window.viewsController.refreshSidebarButtonsAvailability();
		});
	});
});

window.onLockCommand = function() {
	return window.viewsController.callRootItemCommand('lockCommand', arguments);
};

window.onUnlockCommand = function() {
	return window.viewsController.callRootItemCommand('unlockCommand', arguments);
};

window.onSaveCommand = function() {
	return window.viewsController.callRootItemCommand('saveCommand', arguments);
};

window.onRefresh = function() {
	return window.viewsController.callRootItemCommand('refreshCommand', arguments);
};

window.setItem = function(newItemNode) {
	if (window.viewsController._isRootItemAction) {
		const originMethod = window.viewsController._originMethods.setItem;
		const shareData = window.viewsController.shareData;

		if (originMethod) {
			originMethod(newItemNode);
		}

		scopeItem = newItemNode;
		shareData.synchronizer.reloadControlsData(newItemNode);
		shareData.aggregatedDataModel.cleanupRequestCache();

		// update share data before view reloading
		shareData.synchronizer.setEditMode(window.viewsController.isViewEditable());
		window.viewsController.reloadActiveView(newItemNode);
	}
};
