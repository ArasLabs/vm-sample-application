(function(window, expressionBuilder) {
	'use strict';

	const GRID_FIXED_COLUMN_NAMES = {
		state: 'state',
		asset: 'asset'
	};

	const ASSET_COLUMN_WIDTH = 128;
	const SUBHEADER_HEIGHT = 160;
	const DEFAULT_COLUMN_WIDTH = 32;

	function VmUsageConditionTableEditorGrid(parameters) {
		this._gridContainerElement = parameters.gridContainerElement;
		this._aras = parameters.aras;
		this._utils = parameters.utils;
		this._assetColumnLabel = parameters.assetColumnLabel;

		this._optionsInfoByFeatureId = new Map();
		this._selectedOptionIdsByFeatureIdByRowId = new Map();
		this._invalidRowIds = new Set();
		this._modifiedRowIds = new Set();

		this._init();
	}

	VmUsageConditionTableEditorGrid.prototype = {
		constructor: VmUsageConditionTableEditorGrid,

		_gridContainerElement: null,

		_aras: null,

		_utils: null,

		_assetColumnLabel: null,

		_grid: null,

		_focusedBooleanCell: null,

		_optionsInfoByFeatureId: null,

		_selectedOptionIdsByFeatureIdByRowId: null,

		_invalidRowIds: null,

		_modifiedRowIds: null,

		_warningIconPath: '../images/Warning.svg',

		_editIconPath: '../images/Edit.svg',

		_vmModuleSolutionBasedRelativePath: '../Modules/aras.innovator.VariantManagementSample',

		_init: function() {
			this._gridContainerElement.classList.add('vm-usage-condition-table-editor');

			const gridElement = document.createElement('div');
			gridElement.classList.add('vm-usage-condition-table-editor__grid');

			this._gridContainerElement.appendChild(gridElement);

			const warningMessage = this._aras.getResource(
				this._vmModuleSolutionBasedRelativePath,
				'usage_condition_table_editor_grid.complex_usage_condition_warning_message');

			this._tooltipAnchorElement = document.createElement('div');
			this._tooltipAnchorElement.classList.add(
				'vm-usage-condition-table-editor__tooltip-anchor',
				'vm-usage-condition-table-editor__tooltip-anchor_hidden',
				'aras-tooltip');
			this._tooltipAnchorElement.setAttribute('data-tooltip', warningMessage);
			this._tooltipAnchorElement.setAttribute('data-tooltip-pos', 'right');
			this._tooltipAnchorElement.setAttribute('data-tooltip-show', true);

			this._gridContainerElement.appendChild(this._tooltipAnchorElement);

			this._grid = new window.Grid(gridElement, {search: true, editable: true, sortable: false, freezableColumns: true});

			this._grid.settings.frozenColumns = Object.keys(GRID_FIXED_COLUMN_NAMES).length;

			this._grid.on('resizeHead', this._onResizeHeadHandler.bind(this));

			this._grid.on('applyEdit', this._onApplyEditHandler.bind(this));

			this._grid.getCellMetadata = function(headId, rowId, type) {
				if (rowId === 'searchRow') {
					const optionsInfo = this._optionsInfoByFeatureId.get(headId);
					const optionNames = optionsInfo ? optionsInfo.optionNames : [];

					return {
						subheaderHeight: SUBHEADER_HEIGHT,
						subheaders: optionNames,
						subheaderContainerClassName: 'vm-aras-grid-row-cell-subheaders__subheader-container_vertical',
						subheaderTextClassName: 'vm-aras-grid-row-cell-subheaders__subheader-text_vertical'
					};
				}

				if (headId === GRID_FIXED_COLUMN_NAMES.state) {
					if (this._invalidRowIds.has(rowId)) {
						return {
							onMouseOverHandler: function(e) {
								const iconElementBoundingClientRect = e.target.getBoundingClientRect();

								this._tooltipAnchorElement.style.left = iconElementBoundingClientRect.left + iconElementBoundingClientRect.width + 'px';
								this._tooltipAnchorElement.style.top = iconElementBoundingClientRect.top + 'px';
								this._tooltipAnchorElement.style.height = iconElementBoundingClientRect.height + 'px';

								this._tooltipAnchorElement.classList.remove('vm-usage-condition-table-editor__tooltip-anchor_hidden');
							}.bind(this),
							onMouseOutHandler: function(e) {
								this._tooltipAnchorElement.classList.add('vm-usage-condition-table-editor__tooltip-anchor_hidden');
							}.bind(this)
						};
					}

					return null;
				}

				if (headId === GRID_FIXED_COLUMN_NAMES.asset) {
					const row = this._grid.rows.get(rowId);
					const assetItemTypeName = row.assetItemTypeName;

					if (!assetItemTypeName) {
						return null;
					}

					return {
						iconUrl: this._utils.getItemTypeIconUrl(assetItemTypeName)
					};
				}

				return {
					focusedBoolean: this._focusedBooleanCell,
					isBooleanValuesSelectionAvailable: !this._invalidRowIds.has(rowId)
				};
			}.bind(this);

			this._grid.getCellType = function(headId, rowId, value, type) {
				if (headId === GRID_FIXED_COLUMN_NAMES.state) {
					return 'vm_icon';
				}

				if (headId === GRID_FIXED_COLUMN_NAMES.asset) {
					const row = this._grid.rows.get(rowId);

					if (!row.assetItemTypeName) {
						return 'text';
					}

					return 'vm_iconText';
				}

				return 'vm_multipleBooleanValuesSelection';
			}.bind(this);

			this._grid.getEditorType = function() {
				return 'nonEditable';
			};

			this._grid.checkEditAvailability = function(headId, itemId, grid) {
				return this.isGridEditable();
			}.bind(this);
		},

		isGridEditable: function() {
			return true;
		},

		on: function(type, eventListener) {
			this._grid.on(type, eventListener);
		},

		populate: function(assets, features) {
			this._optionsInfoByFeatureId.clear();
			this._selectedOptionIdsByFeatureIdByRowId.clear();
			this._invalidRowIds.clear();
			this._modifiedRowIds.clear();
			this._focusedBooleanCell = {};

			this._populateHead(features, this._optionsInfoByFeatureId);

			const rows = new Map();

			assets.forEach(function(asset) {
				const rowId = asset.rowId;

				const row = {
					assetItemTypeName: asset.itemTypeName
				};
				row[GRID_FIXED_COLUMN_NAMES.asset] = asset.keyedName;

				const selectedOptionIdsByFeatureId = this._getSelectedOptionIdsByFeatureIdFromAssetUsages(asset.usages);

				this._selectedOptionIdsByFeatureIdByRowId.set(rowId, selectedOptionIdsByFeatureId);

				this._populateRowWithSelectedOptions(row, selectedOptionIdsByFeatureId);

				rows.set(rowId, row);
			}.bind(this));

			this._grid.rows = rows;

			this._updateAssetState();
		},

		populateHeader: function(features) {
			this._optionsInfoByFeatureId.clear();
			this._invalidRowIds.clear();

			this._populateHead(features, this._optionsInfoByFeatureId);

			this._grid.rows._store.forEach(function(row, rowId) {
				const selectedOptionIdsByFeatureId = this._selectedOptionIdsByFeatureIdByRowId.get(rowId);
				this._populateRowWithSelectedOptions(row, selectedOptionIdsByFeatureId);
			}.bind(this));

			this._updateAssetState();
		},

		_populateHead: function(features, optionsInfoByFeatureId) {
			if (!features.length) {
				this._gridContainerElement.classList.add('vm-usage-condition-table-editor_hidden');
				return;
			}

			this._gridContainerElement.classList.remove('vm-usage-condition-table-editor_hidden');

			const head = new Map();

			head.set(GRID_FIXED_COLUMN_NAMES.state, {
				label: '',
				width: DEFAULT_COLUMN_WIDTH,
				resizable: false,
				searchType: 'vm_subheaders'
			});

			head.set(GRID_FIXED_COLUMN_NAMES.asset, {
				label: this._assetColumnLabel,
				width: ASSET_COLUMN_WIDTH,
				searchType: 'vm_subheaders'
			});

			features.forEach(function(feature) {
				optionsInfoByFeatureId.set(feature.id, {
					optionIds: feature.optionIds,
					optionNames: feature.optionNames
				});

				const headWidth = DEFAULT_COLUMN_WIDTH * feature.optionNames.length;

				head.set(feature.id, {
					label: feature.name,
					width: headWidth,
					minWidth: headWidth,
					searchType: 'vm_subheaders'
				});
			});

			this._grid.head = head;
		},

		_populateRowWithSelectedOptions: function(row, selectedOptionIdsByFeatureId) {
			this._optionsInfoByFeatureId.forEach(function(optionsInfo, featureId) {
				const optionCellValues = {};
				const selectedOptionIds = selectedOptionIdsByFeatureId && selectedOptionIdsByFeatureId.get(featureId) || new Set();

				optionsInfo.optionIds.forEach(function(optionId) {
					optionCellValues[optionId] = selectedOptionIds.has(optionId);
				});

				row[featureId] = optionCellValues;
			});
		},

		_updateAssetState: function() {
			this._selectedOptionIdsByFeatureIdByRowId.forEach(function(selectedOptionIdsByFeatureId, rowId) {
				let isUsageConditionComplex = !selectedOptionIdsByFeatureId;

				if (!isUsageConditionComplex) {
					const usageConditionFeatureIds = Array.from(selectedOptionIdsByFeatureId.keys());

					isUsageConditionComplex = usageConditionFeatureIds.some(function(usageConditionFeatureId) {
						return !this._optionsInfoByFeatureId.has(usageConditionFeatureId);
					}.bind(this));
				}

				let iconPath;

				if (isUsageConditionComplex) {
					this._invalidRowIds.add(rowId);

					iconPath = this._warningIconPath;
				} else if (this._modifiedRowIds.has(rowId)) {
					iconPath = this._editIconPath;
				}

				this._setStateIcon(rowId, iconPath);
			}.bind(this));
		},

		_onResizeHeadHandler: function(e) {
			const headId = this._grid.settings.indexHead[e.detail.index];
			const head = this._grid.head.get(headId);
			if (head && head.minWidth) {
				head.width = Math.max(head.width, head.minWidth);
				this._grid.head.set(headId, head);
			}
		},

		_onApplyEditHandler: function(e) {
			const rowId = e.detail.rowId;
			const featureId = e.detail.headId;
			const optionCellValues = e.detail.value;

			const selectedOptionIds = new Set();
			const optionIds = Object.keys(optionCellValues);
			optionIds.forEach(function(optionId) {
				if (optionCellValues[optionId]) {
					selectedOptionIds.add(optionId);
				}
			});

			const selectedOptionIdsByFeatureId = this._selectedOptionIdsByFeatureIdByRowId.get(rowId);
			if (selectedOptionIds.size) {
				selectedOptionIdsByFeatureId.set(featureId, selectedOptionIds);
			} else {
				selectedOptionIdsByFeatureId.delete(featureId);
			}

			this._setStateIcon(rowId, this._editIconPath);
			this._modifiedRowIds.add(rowId);

			const definition = expressionBuilder.buildExpression(selectedOptionIdsByFeatureId, true);
			this._dispatchUsageConditionChangeEvent(rowId, definition);
		},

		_dispatchUsageConditionChangeEvent: function(rowId, definition) {
			const usageConditionChangeEventData = {
				detail: {
					rowId: rowId,
					definition: definition
				}
			};

			this._grid.dom.dispatchEvent(new CustomEvent('usageConditionChange', usageConditionChangeEventData));
		},

		_setStateIcon: function(rowId, iconUrl) {
			const row = this._grid.rows.get(rowId);
			row[GRID_FIXED_COLUMN_NAMES.state] = iconUrl;
			this._grid.rows.set(rowId, row);
		},

		_getSelectedOptionIdsByFeatureIdFromAssetUsages: function(usages) {
			const selectedOptionIdsByFeatureId = new Map();

			if (usages.length === 0) {
				return selectedOptionIdsByFeatureId;
			}

			if (usages.length > 1) {
				return null;
			}

			const expressionNode = this._getExpressionNode(usages[0].definition);
			if (!expressionNode) {
				return selectedOptionIdsByFeatureId;
			}

			const isExpressionParsedSuccessfully = this._tryParseExpressionAndFillMapWithSelectedOptionIds(expressionNode.childNodes, selectedOptionIdsByFeatureId);

			return isExpressionParsedSuccessfully ? selectedOptionIdsByFeatureId : null;
		},

		_tryParseExpressionAndFillMapWithSelectedOptionIds: function(expressionRootNodes, selectedOptionIdsByFeatureId) {
			let isExpressionParsedSuccessfully = false;

			const rootNodeCount = expressionRootNodes.length;
			if (rootNodeCount === 1) {
				const rootNode = expressionRootNodes[0];
				const rootNodeName = rootNode.nodeName.toUpperCase();

				switch (rootNodeName) {
					case 'AND':
						isExpressionParsedSuccessfully = this._tryParseAndNodeChildrenAsFeatureGroups(rootNode.childNodes, selectedOptionIdsByFeatureId);
						break;
					case 'OR':
						isExpressionParsedSuccessfully = this._tryParseOrNodeAsOptionGroup(rootNode, selectedOptionIdsByFeatureId);
						break;
					case 'EQ':
						isExpressionParsedSuccessfully = this._tryParseEqNodeAsOptionGroup(rootNode, selectedOptionIdsByFeatureId);
						break;
				}
			} else if (rootNodeCount > 1) {
				isExpressionParsedSuccessfully = this._tryParseAndNodeChildrenAsFeatureGroups(expressionRootNodes, selectedOptionIdsByFeatureId);
			} else {
				isExpressionParsedSuccessfully = true;
			}

			return isExpressionParsedSuccessfully;
		},

		_parseEqNodeToFeatureOptionPair: function(node) {
			const getNodeTextContent = function(nodeXPath) {
				return node.selectSingleNode(nodeXPath).text;
			};

			return {
				featureId: getNodeTextContent('variable/@id'),
				optionId: getNodeTextContent('named-constant/@id')
			};
		},

		_tryParseEqNodeAsOptionGroup: function(node, selectedOptionIdsByFeatureId) {
			const featureOptionPair = this._parseEqNodeToFeatureOptionPair(node);

			if (selectedOptionIdsByFeatureId.has(featureOptionPair.featureId)) {
				return false;
			}

			const selectedOptionIds = new Set([featureOptionPair.optionId]);
			selectedOptionIdsByFeatureId.set(featureOptionPair.featureId, selectedOptionIds);

			return true;
		},

		_tryParseOrNodeAsOptionGroup: function(node, selectedOptionIdsByFeatureId) {
			let firstFeatureId;

			const selectedOptionIds = new Set();
			const childNodes = node.childNodes;

			for (let i = 0; i < childNodes.length; i++) {
				const childNode = childNodes[i];

				if (!this._isNodeNameEqualsToStringCaseInsensitive(childNode, 'EQ')) {
					return false;
				}

				const featureOptionPair = this._parseEqNodeToFeatureOptionPair(childNode);

				if (i === 0) {
					firstFeatureId = featureOptionPair.featureId;

					if (selectedOptionIdsByFeatureId.has(firstFeatureId)) {
						return false;
					}

					selectedOptionIdsByFeatureId.set(firstFeatureId, selectedOptionIds);
				} else if (featureOptionPair.featureId !== firstFeatureId) {
					return false;
				}

				selectedOptionIds.add(featureOptionPair.optionId);
			}

			return true;
		},

		_tryParseAndNodeChildrenAsFeatureGroups: function(andNodeChildren, selectedOptionIdsByFeatureId) {
			for (let i = 0; i < andNodeChildren.length; i++) {
				const childNode = andNodeChildren[i];
				const childNodeName = childNode.nodeName.toUpperCase();

				switch (childNodeName) {
					case 'OR':
						if (!this._tryParseOrNodeAsOptionGroup(childNode, selectedOptionIdsByFeatureId)) {
							return false;
						}
						break;
					case 'EQ':
						if (!this._tryParseEqNodeAsOptionGroup(childNode, selectedOptionIdsByFeatureId)) {
							return false;
						}
						break;
					default:
						return false;
				}
			}

			return true;
		},

		_getExpressionNode: function(expressionXml) {
			const expressionDocument = new window.XmlDocument();
			const isXmlLoadedSuccessfully = expressionDocument.loadXML(
				expressionXml.replace(/[\r\n\t]/g, '')
			);

			return isXmlLoadedSuccessfully &&
				this._isNodeNameEqualsToStringCaseInsensitive(
					expressionDocument.documentElement,
					'expression'
				) ? expressionDocument.documentElement :
					null;
		},

		_isNodeNameEqualsToStringCaseInsensitive: function(node, name) {
			return node.nodeName.toUpperCase() === name.toUpperCase();
		}
	};

	window.VmUsageConditionTableEditorGrid = VmUsageConditionTableEditorGrid;
}(window, window.VmExpressionBuilder));
