var aras = parent.aras;
var isUIControlsCreated = false;
var variantTreeApplicationCore;

loadView = function(newScopeItemNode) {
	if (!isUIControlsCreated) {
		createUIControls(newScopeItemNode);
	} else {
		reloadView(newScopeItemNode);
	}
};

reloadView = function(newScopeItemNode) {
	reloadControlsData(newScopeItemNode);
};

reloadControlsData = function(newScopeItemNode) {
	variantTreeApplicationCore.settingsDialog.show();
};

createUIControls = function(scopeItemNode) {
	require(
		['Modules/aras.innovator.VariantManagementSample/Scripts/variantTree/variantTreeApplicationCore'],
		function(VariantTreeApplicationCore) {
			var builderMethodName = 'vm_scopeBuilder';
			variantTreeApplicationCore = new VariantTreeApplicationCore({
				item: scopeItemNode,
				isEditMode: parent.isEditMode,
				dataLoaderParameters: {
					dataLoaderModulePath: 'Modules/aras.innovator.VariantManagementSample/Scripts/variantTree/variantTreeDataLoader',
					constructorParameters: {
						aras: aras,
						builderMethodName: builderMethodName
					}
				},
				settingsDialogParameters: {
					formId: '06F6C0FD097A4FE6A3772473F94D256E',
					title: 'Variant Tree Settings',
					formParameters: {
						groupName: 'Features',
						builderMethodName: builderMethodName
					}
				}
			});

			variantTreeApplicationCore.init();
			aras.browserHelper.toggleSpinner(document, false);
			isUIControlsCreated = true;
		});
};

document.addEventListener('switchPane', function(e) {
	if (e.detail.action === 'activate') {
		this.loadView(window.parent.item);
	}
}.bind(this));
