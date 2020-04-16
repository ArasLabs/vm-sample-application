(function(window) {
	'use strict';

	function SelectionValidationTabViewController(parameters) {
		this._aras = parameters.aras;
		this._selectionTreeDataProvider = parameters.selectionTreeDataProvider;
		this._selectionTitleElement = parameters.selectionTitleElement;
		this._selectionToolbarElement = parameters.selectionToolbarElement;
		this._selectionAreaElement = parameters.selectionAreaElement;
		this._validateSelectionButtonElement = parameters.validateSelectionButtonElement;
		this._getReasonsButtonElement = parameters.getReasonsButtonElement;
		this._splitterElement = parameters.splitterElement;
		this._gridContainerElement = parameters.gridContainerElement;
	}

	SelectionValidationTabViewController.prototype = {
		constructor: SelectionValidationTabViewController,

		_aras: null,

		_selectionTree: null,

		_selectionTreeDataProvider: null,

		_validationResultGrid: null,

		_selectionTitleElement: null,

		_selectionToolbarElement: null,

		_selectionAreaElement: null,

		_validateSelectionButtonElement: null,

		_getReasonsButtonElement: null,

		_splitterElement: null,

		_gridContainerElement: null,

		_viewLoadingPromise: null,

		_vmSampleModuleSolutionBasedRelativePath: '../Modules/aras.innovator.VariantManagementSample/',

		_initialized: false,

		_variabilityItemNode: null,

		_variabilityItemId: null,

		_variableNameByIdHash: null,

		_namedConstantNameByIdHash: null,

		loadView: function(variabilityItemNode) {
			if (this._viewLoadingPromise) {
				return;
			}

			this._variabilityItemNode = variabilityItemNode;
			this._variabilityItemId = this._aras.getItemProperty(variabilityItemNode, 'id');

			this._viewLoadingPromise = this._init()
				.then(function() {
					const scopeItem = this._getScopeStructureItem(this._variabilityItemId);

					if (scopeItem.isError()) {
						return this._aras.AlertError(scopeItem);
					}

					this._variableNameByIdHash = Object.create(null);
					this._namedConstantNameByIdHash = Object.create(null);
					this._populateVariableAndNamedConstantHashes(scopeItem, this._variableNameByIdHash, this._namedConstantNameByIdHash);

					this._selectionTree.populate();
					this._selectionTree.expandAllExceptFirstLevel();

					this._refreshControls();
				}.bind(this))
				.then(function() {
					this._viewLoadingPromise = null;
				}.bind(this));
		},

		_init: function() {
			if (this._initialized) {
				return Promise.resolve();
			}

			this._selectionTitleElement.textContent = this._aras.getResource(
				this._vmSampleModuleSolutionBasedRelativePath,
				'variability_item.validation_page.selection-validation-pane.selection_tree_title');

			this._setupButton(this._validateSelectionButtonElement,
				'variability_item.validation_page.selection-validation-pane.validate_selection_button_label',
				this._produceValidationOutput.bind(this));

			this._setupButton(this._getReasonsButtonElement,
				'variability_item.validation_page.selection-validation-pane.get_reasons_button_label',
				this._getReasonsButtonOnClickHandler.bind(this));

			window.ArasModules.splitter(this._splitterElement);

			const selectionTreeParameters = {
				aras: this._aras,
				dataProvider: this._selectionTreeDataProvider,
				containerElement: this._selectionAreaElement,
				expressionBuilder: window.VmExpressionBuilder
			};

			return window.VmBooleanMutuallyExclusiveFeatureOptionSelectionTree.createInstance(selectionTreeParameters)
				.then(function(selectionTree) {
					this._selectionTree = selectionTree;
					this._selectionTree.on('vmBooleanTreeSelectionChange', this._refreshControls.bind(this));
				}.bind(this))
				.then(this._loadSelectionToolbar.bind(this))
				.then(function() {
					this._validationResultGrid = new window.VmValidationResultGrid({
						aras: this._aras,
						gridContainerElement: this._gridContainerElement
					});
				}.bind(this))
				.then(function() {
					this._initialized = true;
				}.bind(this));
		},

		_refreshControls: function() {
			this._getReasonsButtonElement.disabled = this._selectionTree.hasAvailableOptions();
		},

		_loadSelectionToolbar: function() {
			const toolbar = new window.Toolbar();

			this._selectionToolbarElement.appendChild(toolbar);

			const toolbarMetadata = this._getSelectionToolbarMetadata();

			return window.cuiToolbar(toolbar, 'vm_selectionTreeToolbar', {metadata: toolbarMetadata});
		},

		_getSelectionToolbarMetadata: function() {
			return {
				selectionTree: {
					expandAll: function() {
						this._selectionTree.expandAll();
					}.bind(this),
					collapseAll: function() {
						this._selectionTree.collapseAll();
					}.bind(this)
				}
			};
		},

		_setupButton: function(buttonElement, textContentResource, eventListener) {
			buttonElement.querySelector('.aras-button__text').textContent = this._aras.getResource(
				this._vmSampleModuleSolutionBasedRelativePath,
				textContentResource);
			buttonElement.addEventListener('click', eventListener);
		},

		_getScopeStructureItem: function(itemId) {
			const targetScopeItem = this._buildTargetScopeItem(itemId);

			const scopeItem = this._aras.newIOMItem('Method', 'cfg_GetScopeStructure');
			scopeItem.setPropertyItem('targetScope', targetScopeItem);
			return scopeItem.apply();
		},

		_buildTargetScopeItem: function(itemId) {
			const targetScopeItem = this._aras.newIOMItem('Method', 'vm_scopeBuilder');
			targetScopeItem.setID(itemId);

			return targetScopeItem;
		},

		_populateVariableAndNamedConstantHashes: function(scopeItem, variableNameByIdHash, namedConstantNameByIdHash) {
			const variableItems = scopeItem.getRelationships('Variable');
			const variableCount = variableItems.getItemCount();

			for (let variableIndex = 0; variableIndex < variableCount; variableIndex++) {
				const variableItem = variableItems.getItemByIndex(variableIndex);
				const variableId = variableItem.getID();
				const variableName = variableItem.getProperty('name');
				variableNameByIdHash[variableId] = variableName;

				const namedConstantItems = variableItem.getRelationships('NamedConstant');
				const namedConstantCount = namedConstantItems.getItemCount();

				for (let namedConstantIndex = 0; namedConstantIndex < namedConstantCount; namedConstantIndex++) {
					const namedConstantItem = namedConstantItems.getItemByIndex(namedConstantIndex);
					const namedConstantId = namedConstantItem.getID();
					const namedConstantName = namedConstantItem.getProperty('name');
					namedConstantNameByIdHash[namedConstantId] = namedConstantName;
				}
			}
		},

		_populateOptionDetailsCollection: function(rows, optionDetailsByUniqueElementId, processedFeatureIds) {
			processedFeatureIds = processedFeatureIds || new Set();

			rows.forEach(function(row) {
				const rowInfo = row.rowInfo;

				if (rowInfo.itemTypeName === 'vm_Feature') {
					const featureId = rowInfo.itemId;

					if (processedFeatureIds.has(featureId)) {
						return;
					}

					row.children.forEach(function(childRow) {
						optionDetailsByUniqueElementId.set(childRow.uniqueElementId,
							{
								id: childRow.rowInfo.itemId,
								featureId: featureId
							});
					});

					processedFeatureIds.add(featureId);
				} else {
					this._populateOptionDetailsCollection(row.children, optionDetailsByUniqueElementId, processedFeatureIds);
				}
			}.bind(this));
		},

		_getReasonsButtonOnClickHandler: function() {
			const selectionExpression = this._selectionTree.getSelectionExpression();
			const conflictsItem = this._getConflicts(this._variabilityItemId, selectionExpression);

			if (conflictsItem.isError()) {
				this._aras.AlertError(conflictsItem);
				return;
			}

			const conflictsScopeItem = this._aras.newIOMItem(this._variabilityItemNode.getAttribute('type'));
			conflictsScopeItem.setID(this._variabilityItemId);
			conflictsScopeItem.setProperty('keyed_name', this._aras.getItemProperty(this._variabilityItemNode, 'keyed_name'));

			this._aras.evalMethod('vm_showConflicts', conflictsScopeItem, {
				'conflictsItem': conflictsItem,
				'variableNames': this._variableNameByIdHash,
				'constantNames': this._namedConstantNameByIdHash
			});
		},

		_getConflicts: function(itemId, condition) {
			const targetScopeItem = this._buildTargetScopeItem(itemId);

			const getConflictsItem = this._aras.newIOMItem('Method', 'cfg_GetConflicts');
			getConflictsItem.setPropertyItem('targetScope', targetScopeItem);

			if (condition) {
				getConflictsItem.setProperty('condition', condition);
			}

			return getConflictsItem.apply();
		},

		_produceValidationOutput: function() {
			const selectedOptionIdsByFeatureIds = this._selectionTree.getSelectedOptionIdsPerFeatureIds();
			const rows = this._createValidationResultsAsGridRows(this._selectionTree.hasAvailableOptions(), selectedOptionIdsByFeatureIds);

			this._validationResultGrid.populate(rows);
		},

		_createValidationResultsAsGridRows: function(isValidCombinationExists, selectedOptionIdsByFeatureIds) {
			const gridRows = new Map();

			const type = this._aras.getResource(
				this._vmSampleModuleSolutionBasedRelativePath,
				'variability_item.validation_page.selection-validation-pane.selection_validation_type');

			let uniqueRowId = 0;

			if (isValidCombinationExists) {
				const result = this._aras.getResource(
					this._vmSampleModuleSolutionBasedRelativePath,
					'variability_item.validation_page.selection-validation-pane.selection_validation_result_successful');

				gridRows.set(uniqueRowId, {
					type: type,
					result: result
				});
			} else {
				const result = this._aras.getResource(
					this._vmSampleModuleSolutionBasedRelativePath,
					'variability_item.validation_page.selection-validation-pane.selection_validation_result_failed');

				const errorMessage = this._aras.getResource(
					this._vmSampleModuleSolutionBasedRelativePath,
					'variability_item.validation_page.selection-validation-pane.selection_validation_error_message');

				gridRows.set(uniqueRowId++, {
					type: type,
					result: result,
					message: errorMessage
				});

				selectedOptionIdsByFeatureIds.forEach(function(optionId, featureId) {
					const featureName = this._variableNameByIdHash[featureId];
					const optionName = this._namedConstantNameByIdHash[optionId];

					gridRows.set(uniqueRowId++, {
						message: featureName + ' = ' + optionName
					});
				}.bind(this));
			}

			return gridRows;
		}
	};

	window.SelectionValidationTabViewController = SelectionValidationTabViewController;
}(window));
