const aras = parent.aras;
const utils = new window.VmUtils(aras);
let isUIControlsCreated = false;
const itemViewPaneManagerId = window.parent.vmSwitchableTabItemViewController.paneManagerId;
const tabContentViewControllers = new Map();
const variabilityItemStructureSelectionTreeDataProvider = new window.VariabilityItemStructureSelectionTreeDataProvider({
	aras: aras,
	dataLoader: window.parent.viewsController.shareData.synchronizer.dataLoader,
	utils: utils
});
let tabContentSwitcherManager;

const loadView = function() {
	if (!isUIControlsCreated) {
		createUIControls();
	}
};

const createUIControls = function() {
	const validationTabsElement = document.querySelector('.validation-tabs');
	const tabContentSwitcherElement = document.querySelector('.tab-content-switcher');

	bindSwitcherPanesToTabs(tabContentSwitcherElement, validationTabsElement);

	tabContentSwitcherManager = new window.VmSwitcherManager(aras, tabContentSwitcherElement);
	validationTabsElement.selectTab(tabContentSwitcherManager.activePaneId);

	isUIControlsCreated = true;
};

const bindSwitcherPanesToTabs = function(switcherElement, tabsElement) {
	Array.prototype.forEach.call(switcherElement.children, function(item) {
		const paneId = item.getAttribute('switcher-pane-id');

		tabsElement.addTab(
			paneId,
			{
				label: aras.getResource('../Modules/aras.innovator.VariantManagementSample/', 'variability_item.validation_page.' + paneId + '.label')
			}
		);
	});

	tabsElement.on('select', function(paneId) {
		tabContentSwitcherManager.switchActivePane(paneId);
	});
};

const loadValidationTabView = function(tabId, variabilityItemNode) {
	if (!tabContentViewControllers.has(tabId)) {
		return;
	}

	const tabViewController = tabContentViewControllers.get(tabId);
	aras.browserHelper.toggleSpinner(document, true);

	Promise.resolve()
		.then(function() {
			tabViewController.loadView(variabilityItemNode);
		})
		.then(function() {
			aras.browserHelper.toggleSpinner(document, false);
		});
};

document.addEventListener('switchPane', function(e) {
	const eventDetails = e.detail;
	if (eventDetails.action !== 'activate' || eventDetails.switcherId !== itemViewPaneManagerId) {
		return;
	}

	loadView();

	const variabilityItemNode = window.parent.item;
	loadValidationTabView(tabContentSwitcherManager.activePaneId, variabilityItemNode);
});

document.addEventListener('switchPane', function(e) {
	const eventDetails = e.detail;
	if (eventDetails.action !== 'activate' || eventDetails.switcherId !== tabContentSwitcherManager.switcherId) {
		return;
	}

	const variabilityItemNode = window.parent.item;
	loadValidationTabView(tabContentSwitcherManager.activePaneId, variabilityItemNode);
});

document.addEventListener('DOMContentLoaded', function() {
	tabContentViewControllers.set(
		'auto-validation-pane',
		new window.AutoValidationTabViewController({
			aras: aras,
			gridContainerElement: document.querySelector('.auto-validation-pane-grid'),
			toolbarContainerElement: document.querySelector('.auto-validation-pane-toolbar')
		})
	);

	tabContentViewControllers.set(
		'selection-validation-pane',
		new window.SelectionValidationTabViewController({
			aras: aras,
			selectionTreeDataProvider: variabilityItemStructureSelectionTreeDataProvider,
			selectionTitleElement: document.querySelector('.vm-selection-tree__title'),
			selectionToolbarElement: document.querySelector('.vm-selection-tree__toolbar'),
			selectionAreaElement: document.querySelector('.vm-selection-tree__selection-area'),
			validateSelectionButtonElement: document.querySelector('.vm-selection-validation__validate-selection-btn'),
			getReasonsButtonElement: document.querySelector('.vm-selection-validation__get-reasons-btn'),
			splitterElement: document.querySelector('.aras-splitter'),
			gridContainerElement: document.querySelector('.vm-selection-validation__validation-result-grid')
		})
	);
});
