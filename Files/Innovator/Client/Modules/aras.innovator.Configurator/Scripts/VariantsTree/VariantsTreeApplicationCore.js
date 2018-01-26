define('Configurator/Scripts/VariantsTree/VariantsTreeApplicationCore', [
	'dojo/_base/declare',
	'dojo/_base/connect',
	'Configurator/Scripts/Common/SettingsDialog',
	'Configurator/Scripts/VariantsTree/ConfiguratorVariantsTreeDataLoader',
	'Configurator/Scripts/VariantsTree/Publishing/HtmlExporter',
	'Configurator/Scripts/VariantsTree/VariantsTreeApplicationBase'
],
function(declare, connect, SettingsDialog, DataLoader, HtmlExporter, VariantsTreeApplicationBase) {
	return declare([VariantsTreeApplicationBase], {
		item: null,
		isEditMode: null,
		itemId: null,
		settingsDialog: null,
		dataLoader: null,
		htmlExporter: null,

		constructor: function(initialParameters) {
			var settingsDialogParameters = initialParameters.settingsDialogParameters || {};
			this.item = initialParameters.item;
			this.isEditMode = initialParameters.isEditMode;
			this.itemId = this.item.getAttribute('id');

			var dataLoaderParameters = initialParameters.dataLoaderParameters || {};
			var dataLoaderConstructorParameters = dataLoaderParameters.constructorParameters;
			if (!dataLoaderConstructorParameters) {
				throw new Error('DataLoader parameters must be set');
			}
			if (dataLoaderParameters.dataLoaderModule) {
				this.dataLoader = new dataLoaderParameters.dataLoaderModule(dataLoaderConstructorParameters);
			} else if (dataLoaderParameters.dataLoaderModulePath) {
				require([dataLoaderParameters.dataLoaderModulePath], function(CustomDataLoader) {
					this.dataLoader = new CustomDataLoader(dataLoaderConstructorParameters);
				}.bind(this));
			} else {
				this.dataLoader = new DataLoader(dataLoaderConstructorParameters);
			}

			this.settingsDialog = new SettingsDialog({
				connectId: 'variantsTreeControls',
				title: settingsDialogParameters.title || 'Variant Tree Settings',
				formId: settingsDialogParameters.formId || 'B308FEE81C709E094ACDA399D5CA6FE2',
				scopeId: this.itemId,
				formParameters: settingsDialogParameters.formParameters || {groupName: 'Families', builderMethodName: settingsDialogParameters.builderMethodName}
			});
			this.htmlExporter = new HtmlExporter({
				aras: aras,
				connectId: 'variantsTreeControls',
				dataBuilder: this.dataBuilder,
				scopeName: aras.getItemProperty(this.item, 'keyed_name'),
				settings: this.settings
			});
		},

		init: function() {
			this.inherited(arguments);
			connect.connect(this.settingsDialog, 'onSettingsChange', this.onSettingsChange.bind(this));
			this.settingsDialog.show();
		},

		loadView: function(additionalArguments) {
			additionalArguments = additionalArguments || {};

			var loadedData = this.dataLoader.load({
				id: this.item.getAttribute('id'),
				variableNamedConstantPairs: additionalArguments.variableNamedConstantPairs || [],
				labels: additionalArguments.labels
			});
			if (loadedData.validCombinations && 0 < loadedData.validCombinations.length) {
				this.preloadViewPreparation(true);
				this.dataBuilder.setGeneratedData(loadedData);
				var treeData = this.dataBuilder.getVariantTreeData();

				if (this.treeControl.isTreeLoaded()) {
					this.treeControl.setTreeLayerData('variantsTree', treeData);
					this.treeControl.centerView();
				} else {
					this.treeControl.loadTree(treeData);
				}

				this.updateInfoPanel();
			} else {
				this.preloadViewPreparation(false);
				return aras.AlertWarning('There are no valid combinations for this item');
			}
		},

		preloadViewPreparation: function(hasCombinations) {
			Array.prototype.forEach.call(document.querySelectorAll('#variantsTreeControls > div:not(.settingsButton)'), function(item) {
				item.classList.toggle('invisible', !hasCombinations);
			});
			document.querySelector('#variantsTreeInfo').classList.toggle('invisible', !hasCombinations);
			document.querySelector('#variantsTreeContainer').classList.toggle('invisible', !hasCombinations);
		},

		onSettingsChange: function(newSettings) {
			aras.browserHelper.toggleSpinner(document, true);

			// timeout added in order to show spinner
			setTimeout(function() {
				this.settings.affectedGroups = newSettings.affectedGroups;

				this.loadView({
					variableNamedConstantPairs: this.getSelectedVariableNamedConstantPairs()
				});

				aras.browserHelper.toggleSpinner(document, false);
			}.bind(this), 0);
		},

		onViewerStartPan: function(mouseEvent) {
			this.inherited(arguments);
			var isLeftButton = mouseEvent.button === 0;

			if (isLeftButton) {
				aras.showStatusMessage('status', 'Pan view mode');
			}
		},

		onViewerEndPan: function(mouseEvent) {
			this.inherited(arguments);
			aras.clearStatusMessage('status');
		}
	});
});
