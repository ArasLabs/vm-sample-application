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

unloadView = function() {
};

reloadControlsData = function(newScopeItemNode) {
	variantTreeApplicationCore.settingsDialog.show();
};

createUIControls = function(scopeItemNode) {
	require(
		['Configurator/Scripts/VariantsTree/VariantsTreeApplicationCore'],
		function(VariantsTreeApplicationCore) {
			var builderMethodName = 'cs_sample_scopeBuilder';
			variantTreeApplicationCore = new VariantsTreeApplicationCore({
				item: scopeItemNode,
				isEditMode: parent.isEditMode,
				dataLoaderParameters: {
					dataLoaderModulePath: 'Configurator/Scripts/VariantsTree/ConfiguratorVariantsTreeDataLoader',
					constructorParameters: {
						aras: aras,
						builderMethodName: builderMethodName
					}
				},
				settingsDialogParameters: {
					formId: 'B308FEE81C709E094ACDA399D5CA6FE2',
					title: 'Variant Tree Settings',
					formParameters: {
						groupName: 'Families',
						builderMethodName: builderMethodName
					}
				}
			});

			variantTreeApplicationCore.init();
			aras.browserHelper.toggleSpinner(document, false);
			isUIControlsCreated = true;
		});
};
