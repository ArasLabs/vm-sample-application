(function(window) {
	'use strict';

	const _super = window.VmBooleanMutuallyExclusiveSelectionTree.prototype;

	function VmBooleanMutuallyExclusiveFeatureOptionSelectionTree(parameters) {
		_super.constructor.call(this, parameters.containerElement);

		this._aras = parameters.aras;
		this._dataProvider = parameters.dataProvider;
		this._expressionBuilder = parameters.expressionBuilder;

		this._optionDetailsByUniqueElementId = new Map();
		this._availableOptionIdsByFeatureId = new Map();
	}

	VmBooleanMutuallyExclusiveFeatureOptionSelectionTree.prototype = Object.assign(Object.create(_super), {
		constructor: VmBooleanMutuallyExclusiveFeatureOptionSelectionTree,

		_aras: null,

		_dataProvider: null,

		_expressionBuilder: null,

		_optionDetailsByUniqueElementId: null,

		_availableOptionIdsByFeatureId: null,

		populate: function() {
			const rows = this._dataProvider.fetch();

			_super.populate.call(this, rows);
		},

		clear: function() {
			_super.clear.call(this);

			this._optionDetailsByUniqueElementId.clear();
			this._availableOptionIdsByFeatureId.clear();
		},

		expandAllExceptFirstLevel: function() {
			const allRowIds = this.getAllRowIds();
			const rowIdsToExpand = new Set(allRowIds);

			const rootRowIds = this.getChildRowIds();
			rootRowIds.forEach(function(rootRowId) {
				const firstLevelRowIds = this.getChildRowIds(rootRowId);

				firstLevelRowIds.forEach(rowIdsToExpand.delete, rowIdsToExpand);
			}, this);

			this.expandBranches(Array.from(rowIdsToExpand));
		},

		hasAvailableOptions: function() {
			return this._availableOptionIdsByFeatureId.size > 0;
		},

		getSelectedOptionIdsPerFeatureIds: function() {
			const optionIdByFeatureId = new Map();

			const selectedRowIds = this.getSelectedRowIds();
			selectedRowIds.forEach(function(rowId) {
				const rowData = this.getRowData(rowId);
				const rowInfo = rowData.row.rowInfo;

				if (rowInfo.itemTypeName === 'vm_Option') {
					const optionId = rowInfo.itemId;

					const parentRowData = this.getRowData(rowData.parentId);
					const parentRowInfo = parentRowData.row.rowInfo;
					const featureId = parentRowInfo.itemId;

					if (!optionIdByFeatureId.has(featureId)) {
						optionIdByFeatureId.set(featureId, optionId);
					}
				}
			}.bind(this));

			return optionIdByFeatureId;
		},

		getSelectionExpression: function() {
			const optionIdByFeatureId = this.getSelectedOptionIdsPerFeatureIds();
			return this._expressionBuilder.buildExpression(optionIdByFeatureId);
		},

		getSelectionExpressionDefinition: function() {
			const optionIdByFeatureId = this.getSelectedOptionIdsPerFeatureIds();
			return this._expressionBuilder.buildExpressionDefinition(optionIdByFeatureId);
		},

		_init: function() {
			return _super._init.call(this)
				.then(function() {
					this.on('vmBooleanTreeSelectionChange', this._refreshOptionsAvailability.bind(this));
					this.defineMetadata = this._selectionTreeDefineMetadataHandler.bind(this);
				}.bind(this));
		},

		_buildTree: function(rows) {
			this._populateOptionDetailsCollection(rows, this._optionDetailsByUniqueElementId);
			this._refreshOptionsAvailability();

			_super._buildTree.call(this, rows);
		},

		_refreshOptionsAvailability: function() {
			const scopeItemNode = this._dataProvider.scopeItemNode;

			if (!scopeItemNode) {
				return;
			}

			const scopeItemId = scopeItemNode.getAttribute('id');
			const optionsAvailabilityDetailsItem = this._getOptionsAvailabilityDetailsItem(scopeItemId);

			if (optionsAvailabilityDetailsItem.isError()) {
				this._aras.AlertError(optionsAvailabilityDetailsItem);
				return;
			}

			const optionsAvailabilityDetails = JSON.parse(optionsAvailabilityDetailsItem.getResult());
			const availableOptionsByFeatureId = optionsAvailabilityDetails.availableOptionsByFeatureId;
			const optionsToHighlightByFeatureId = optionsAvailabilityDetails.optionsToHighlightByFeatureId;

			this._availableOptionIdsByFeatureId = new Map(Object.entries(availableOptionsByFeatureId));

			this._optionDetailsByUniqueElementId.forEach(function(optionDetails) {
				const availableOptions = availableOptionsByFeatureId[optionDetails.featureId];
				const optionsToHighlight = optionsToHighlightByFeatureId[optionDetails.featureId];

				optionDetails.isAvailable = availableOptions ? availableOptions.includes(optionDetails.id) : false;
				optionDetails.isToHighlight = optionsToHighlight ? optionsToHighlight.includes(optionDetails.id) : false;
			});
		},

		_selectionTreeDefineMetadataHandler: function(rowId, headId, rowObject) {
			if (rowObject.rowInfo.itemTypeName === 'vm_Option') {
				const oldGetTextBooleanCssClassName = rowObject.metadata.getTextBooleanCssClassName;

				rowObject.metadata.getTextBooleanCssClassName = function(headId, rowId, value, grid, metadata) {
					let className = oldGetTextBooleanCssClassName ? oldGetTextBooleanCssClassName(headId, rowId, value, grid, metadata) : '';

					if (this._optionDetailsByUniqueElementId.get(rowObject.uniqueElementId).isToHighlight) {
						className += ' vm-aras-grid-row-cell-text-boolean_unavailable';
					}

					return className;
				}.bind(this);
			}

			return rowObject.metadata;
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

		_getOptionsAvailabilityDetailsItem: function(scopeItemId) {
			const getOptionsAvailabilityDetailsItem = this._aras.newIOMItem('Method', 'vm_getOptionsAvailabilityDetails');

			getOptionsAvailabilityDetailsItem.setID(scopeItemId);

			const selectedOptionIdsPerFeatureIdsMap = this.getSelectedOptionIdsPerFeatureIds();
			const selectedOptionIdsPerFeatureIdsObject = {};

			selectedOptionIdsPerFeatureIdsMap.forEach(function(value, key) {
				selectedOptionIdsPerFeatureIdsObject[key] = value;
			});

			getOptionsAvailabilityDetailsItem.setProperty('selected_option_id_by_feature_id', JSON.stringify(selectedOptionIdsPerFeatureIdsObject));

			return getOptionsAvailabilityDetailsItem.apply();
		}
	});

	Object.defineProperty(VmBooleanMutuallyExclusiveFeatureOptionSelectionTree, 'createInstance', {
		value: function(parameters) {
			const selectionTree = new VmBooleanMutuallyExclusiveFeatureOptionSelectionTree(parameters);

			return selectionTree
				._init()
				.then(function() {
					return selectionTree;
				});
		}
	});

	window.VmBooleanMutuallyExclusiveFeatureOptionSelectionTree = VmBooleanMutuallyExclusiveFeatureOptionSelectionTree;
}(window));
