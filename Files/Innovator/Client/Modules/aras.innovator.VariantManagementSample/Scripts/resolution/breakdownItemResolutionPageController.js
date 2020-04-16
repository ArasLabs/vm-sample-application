(function(window) {
	'use strict';

	function BreakdownItemResolutionPageController(parameters) {
		this._aras = parameters.aras;
		this._selectionTitleElement = parameters.selectionTitleElement;
		this._selectionToolbarContainerElement = parameters.selectionToolbarContainerElement;
		this._selectionAreaElement = parameters.selectionAreaElement;
		this._splitterElement = parameters.splitterElement;
		this._resolutionEvaluationTitleElement = parameters.resolutionEvaluationTitleElement;
		this._resolutionEvaluationTgvFrame = parameters.resolutionEvaluationTgvFrame;
		this._additionalToolbarFormatters = parameters.additionalToolbarFormatters;
		this._selectionTreeDataLoader = parameters.selectionTreeDataLoader;
		this._selectionTreeDataProvider = parameters.selectionTreeDataProvider;
		this._tgvParametersProvider = parameters.tgvParametersProvider;
	}

	BreakdownItemResolutionPageController.prototype = {
		constructor: BreakdownItemResolutionPageController,

		_aras: null,

		_selectionTitleElement: null,

		_selectionToolbarContainerElement: null,

		_selectionAreaElement: null,

		_splitterElement: null,

		_resolutionEvaluationTitleElement: null,

		_resolutionEvaluationTgvFrame: null,

		_additionalToolbarFormatters: null,

		_vmSampleModuleSolutionBasedRelativePath: '../Modules/aras.innovator.VariantManagementSample',

		_toolbar: null,

		_selectionTree: null,

		_selectionTreeDataLoader: null,

		_selectionTreeDataProvider: null,

		_tgvParametersProvider: null,

		_resolutionEvaluationTgvController: null,

		_resolutionEvaluationViewLoadingPromise: null,

		_resolutionBaseVariabilityItemNode: null,

		_isResolutionEvaluationViewInitialized: false,

		_setVariabilityItemAsResolutionBaseItem: function(itemNode) {
			this._resolutionBaseVariabilityItemNode = itemNode;

			// Data loader loads data with scope item as root item.
			// Data provider use data loader to load data for selection tree.
			this._selectionTreeDataLoader.setScopeItem(itemNode);
		},

		_init: function() {
			const resolutionBaseVariabilityItemNode = this._getDefaultResolutionBaseVariabilityItemNode();
			this._setVariabilityItemAsResolutionBaseItem(resolutionBaseVariabilityItemNode);

			// init soap module for itemProperty component
			ArasModules.soap(null, {async: true, method: 'ApplyItem', url: this._aras.getServerURL(), headers: this._aras.getHttpHeadersForSoapMessage('ApplyItem')});

			this._initSplitter();

			this._loadTitle(this._selectionTitleElement, 'breakdown_item.resolution_page.selection.title');

			this._defineCustomTgvParametersProviderConstructor();
			this._tgvParametersProvider.setParameter('resolutionTargetScopeBuilderMethod', 'vm_scopeBuilder');

			return this._loadToolbar()
				.then(this._createSelectionTree.bind(this))
				.then(this._subscribeOnSelectionTreeEvents.bind(this))
				.then(this._populateSelectionTree.bind(this));
		},

		_initSplitter: function() {
			window.ArasModules.splitter(this._splitterElement);
		},

		_loadTitle: function(titleElement, titleResource) {
			titleElement.textContent = this._aras.getResource(
				this._vmSampleModuleSolutionBasedRelativePath,
				titleResource);
		},

		_defineCustomTgvParametersProviderConstructor: function() {
			const self = this;

			window.tgvCustomParametersProviderConstructor = function() {
				return self._tgvParametersProvider;
			};
		},

		_createSelectionTree: function() {
			const selectionTreeParameters = {
				aras: this._aras,
				dataProvider: this._selectionTreeDataProvider,
				containerElement: this._selectionAreaElement,
				expressionBuilder: window.VmExpressionBuilder
			};

			return window.VmBooleanMutuallyExclusiveFeatureOptionSelectionTree.createInstance(selectionTreeParameters)
				.then(function(selectionTree) {
					this._selectionTree = selectionTree;
				}.bind(this));
		},

		_subscribeOnSelectionTreeEvents: function() {
			this._selectionTree.on('vmBooleanTreeSelectionChange', this._toggleResolveButtonState.bind(this));
		},

		_populateSelectionTree: function() {
			this._selectionTree.populate();
			this._selectionTree.expandAllExceptFirstLevel();
		},

		_loadToolbar: function() {
			this._toolbar = new window.Toolbar();
			window.Toolbar.extendFormatters(this._additionalToolbarFormatters);
			this._selectionToolbarContainerElement.appendChild(this._toolbar);

			const metadata = this._getToolbarMetadata();

			return window.cuiToolbar(this._toolbar, 'vm_breakdownItemResolutionToolbar', {itemTypeName: 'vm_breakdownItem', metadata: metadata});
		},

		_loadResolutionEvaluationView: function() {
			if (this._resolutionEvaluationViewLoadingPromise) {
				return;
			}

			this._tgvParametersProvider.setParameter(
				'resolutionTargetScopeId',
				this._resolutionBaseVariabilityItemNode ? this._resolutionBaseVariabilityItemNode.getAttribute('id') : null);

			const selectionExpressionDefinition = this._selectionTree.getSelectionExpressionDefinition();
			this._tgvParametersProvider.setParameter('definition', selectionExpressionDefinition);

			this._resolutionEvaluationViewLoadingPromise = Promise.resolve()
				.then(function() {
					if (!this._isResolutionEvaluationViewInitialized) {
						this._aras.browserHelper.toggleSpinner(document, true);

						this._loadTitle(this._resolutionEvaluationTitleElement, 'breakdown_item.resolution_page.resolution_evaluation_view.title');

						const breakdownStructureResolutionTgvRelativePath = '/Modules/aras.innovator.TreeGridView/Views/MainPage.html' +
							'?tgvdId=9FC0DEF6619B419BA850C562D76F2FE9' +
							'&startConditionProvider=ItemDefault({"id":"id"})' +
							'&parametersProvider=parent.tgvCustomParametersProviderConstructor()';

						return new Promise(function(resolve) {
							this._resolutionEvaluationTgvFrame.addEventListener('load', resolve);

							this._resolutionEvaluationTgvFrame.src = this._aras.getBaseURL() + breakdownStructureResolutionTgvRelativePath;
						}.bind(this))
						.then(function() {
							this._aras.browserHelper.toggleSpinner(document, false);

							this._isResolutionEvaluationViewInitialized = true;
						}.bind(this));
					}

					// There is no way to find out that 'mainPage' is initialized because it is assigned inside require that is in window.onload of TGV
					// This code will be changed in I-011084 "Change resolution structure loading" after problem is fixed in I-011067 "Change TGV loading"
					this._resolutionEvaluationTgvController = this._resolutionEvaluationTgvController || this._resolutionEvaluationTgvFrame.contentWindow.mainPage;

					if (this._resolutionEvaluationTgvController) {
						this._resolutionEvaluationTgvFrame.contentWindow.reload();
					}
				}.bind(this))
				.then(function() {
					this._resolutionEvaluationViewLoadingPromise = null;
				}.bind(this));
		},

		_onChangeVariabilityItemHandler: function(itemNode) {
			this._setVariabilityItemAsResolutionBaseItem(itemNode);
			this._populateSelectionTree();
		},

		_getToolbarMetadata: function() {
			const changeItemConfirmationMessage = this._aras.getResource(
				this._vmSampleModuleSolutionBasedRelativePath,
				'breakdown_item.resolution_page.selection.toolbar.item_field.change_variability_item_message');

			const itemFieldHelper = new window.VmItemFieldHelper({
				aras: this._aras,
				initialItemNode: this._resolutionBaseVariabilityItemNode,
				changeItemConfirmationMessage: changeItemConfirmationMessage,
				onChangeItemHandler: this._onChangeVariabilityItemHandler.bind(this)
			});

			return {
				variabilityItemFieldMetadata: itemFieldHelper.getItemFieldHandlers(),
				resolutionEvaluationView: this._getResolutionEvaluationViewPublicApi()
			};
		},

		_getDefaultResolutionBaseVariabilityItemNode: function() {
			// Check window.item if it already contains loaded default VariabilityItem
			const defaultVariabilityItemNode = window.item.selectSingleNode('./Relationships/Item[@type="vm_BreakdownItemVarItem"]/related_id/Item');

			if (defaultVariabilityItemNode) {
				return defaultVariabilityItemNode;
			}

			// Load default VariabilityItem from server
			const breakdownItemId = this._aras.getItemProperty(window.item, 'id');

			let defaultVariabilityItem = this._aras.newIOMItem('vm_VariabilityItem', 'get');
			defaultVariabilityItem.setAttribute('select', 'id,keyed_name');

			const relationshipItem = this._aras.newIOMItem('vm_BreakdownItemVarItem');
			relationshipItem.setAttribute('select', 'related_id');
			relationshipItem.setProperty('source_id', breakdownItemId);

			defaultVariabilityItem.setPropertyItem('id', relationshipItem);
			defaultVariabilityItem.setPropertyCondition('id', 'in');
			defaultVariabilityItem.setPropertyAttribute('id', 'by', 'related_id');

			defaultVariabilityItem = defaultVariabilityItem.apply();

			if (defaultVariabilityItem.isError()) {
				if (defaultVariabilityItem.getErrorCode() !== '0') {
					this._aras.AlertError(defaultVariabilityItem);
				}
				return null;
			}

			return defaultVariabilityItem.node;
		},

		_toggleResolveButtonState: function() {
			const resolveButtonId = 'vm_breakdownItemResolutionToolbarResolveButton';

			this._toolbar.data.set(
				resolveButtonId,
				Object.assign({}, this._toolbar.data.get(resolveButtonId), {
					disabled: !this._selectionTree.hasAvailableOptions()
				})
			);

			this._toolbar.render();
		},

		_getResolutionEvaluationViewPublicApi: function() {
			return {
				load: function() {
					this._loadResolutionEvaluationView();
				}.bind(this)
			};
		}
	};

	Object.defineProperty(BreakdownItemResolutionPageController, 'createInstance', {
		value: function(parameters) {
			const breakdownItemResolutionPageControllerInstance = new BreakdownItemResolutionPageController(parameters);

			return breakdownItemResolutionPageControllerInstance
				._init()
				.then(function() {
					return breakdownItemResolutionPageControllerInstance;
				});
		}
	});

	window.BreakdownItemResolutionPageController = BreakdownItemResolutionPageController;
}(window));
