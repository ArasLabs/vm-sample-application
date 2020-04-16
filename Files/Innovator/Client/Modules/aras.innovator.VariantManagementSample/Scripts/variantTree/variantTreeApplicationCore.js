define('Modules/aras.innovator.VariantManagementSample/Scripts/variantTree/variantTreeApplicationCore', [
	'dojo/_base/declare',
	'dojo/_base/connect',
	'Modules/aras.innovator.VariantManagementSample/Scripts/common/settingsDialog',
	'Modules/aras.innovator.VariantManagementSample/Scripts/variantTree/variantTreeDataLoader',
	'Modules/aras.innovator.VariantManagementSample/Scripts/variantTree/publishing/htmlExporter',
	'Modules/aras.innovator.VariantManagementSample/Scripts/variantTree/variantTreeApplicationBase'
],
function(declare, connect, SettingsDialog, DataLoader, HtmlExporter, VariantTreeApplicationBase) {
	return declare([VariantTreeApplicationBase], {
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
				connectId: 'variantTreeControls',
				title: settingsDialogParameters.title || 'Variant Tree Settings',
				formId: settingsDialogParameters.formId || '06F6C0FD097A4FE6A3772473F94D256E',
				scopeId: this.itemId,
				formParameters: settingsDialogParameters.formParameters || {groupName: 'Features', builderMethodName: settingsDialogParameters.builderMethodName}
			});
			this.htmlExporter = new HtmlExporter({
				aras: aras,
				connectId: 'variantTreeControls',
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
			Array.prototype.forEach.call(document.querySelectorAll('#variantTreeControls > div:not(.settingsButton)'), function(item) {
				item.classList.toggle('invisible', !hasCombinations);
			});
			document.querySelector('#variantTreeInfo').classList.toggle('invisible', !hasCombinations);
			document.querySelector('#variantTreeContainer').classList.toggle('invisible', !hasCombinations);
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
