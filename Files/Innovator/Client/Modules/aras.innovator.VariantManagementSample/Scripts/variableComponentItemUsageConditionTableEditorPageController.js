(function(window) {
	'use strict';

	function VariableComponentItemUsageConditionTableEditorPageController(parameters) {
		this._aras = parameters.aras;

		this._init(
			parameters.itemFieldFormatter,
			parameters.variabilityItemFieldTitleElement,
			parameters.variabilityItemFieldContainerElement,
			parameters.splitterElement
		);
	}

	VariableComponentItemUsageConditionTableEditorPageController.prototype = {
		constructor: VariableComponentItemUsageConditionTableEditorPageController,

		_aras: null,

		_vmSampleModuleSolutionBasedRelativePath: '../Modules/aras.innovator.VariantManagementSample',

		_init: function(
			itemFieldFormatter,
			variabilityItemFieldTitleElement,
			variabilityItemFieldContainerElement,
			splitterElement
		) {
			this._loadTitle(variabilityItemFieldTitleElement, 'variable_component_item.usage_condition_table_editor_page.selection.title');

			this._initVariabilityItemField(itemFieldFormatter, variabilityItemFieldContainerElement);

			this._initSplitter(splitterElement);
		},

		_initSplitter: function(splitterElement) {
			window.ArasModules.splitter(splitterElement);
		},

		_loadTitle: function(titleElement, titleResource) {
			titleElement.textContent = this._aras.getResource(
				this._vmSampleModuleSolutionBasedRelativePath,
				titleResource);
		},

		_initVariabilityItemField: function(itemFieldFormatter, variabilityItemFieldContainerElement) {
			const changeItemConfirmationMessage = this._aras.getResource(
				this._vmSampleModuleSolutionBasedRelativePath,
				'variable_component_item.usage_condition_table_editor_page.selection.variability_item_field.change_item_confirmation_message');

			const itemFieldHelper = new window.VmItemFieldHelper({
				aras: this._aras,
				changeItemConfirmationMessage: changeItemConfirmationMessage
			});

			const itemFieldSettings = {
				itemtype: 'vm_VariabilityItem',
				fieldItemClassName: 'vm-usage-condition-table-editor-selection__variability-item-field',
				metadata: itemFieldHelper.getItemFieldHandlers()
			};

			window.Inferno.render(itemFieldFormatter(itemFieldSettings), variabilityItemFieldContainerElement);
		}
	};

	window.VariableComponentItemUsageConditionTableEditorPageController = VariableComponentItemUsageConditionTableEditorPageController;
}(window));
