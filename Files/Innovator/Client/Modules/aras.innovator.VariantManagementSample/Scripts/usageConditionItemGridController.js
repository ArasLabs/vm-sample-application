(function(window) {
	'use strict';

	const GRID_COLUMN_NAMES = {
		variabilityItem: 'variabilityItem',
		usageCondition: 'usageCondition'
	};

	function UsageConditionItemGridController(parameters) {
		this._aras = parameters.aras;
		this._title = parameters.title;
		this._usageConditionItemsLoader = parameters.usageConditionItemsLoader;
		this._usageConditionSourceItemId = parameters.usageConditionSourceItemId;
		this._closeButtonClickHandler = parameters.closeButtonClickHandler;
		this._getDefaultVariabilityItem = parameters.getDefaultVariabilityItem;
		this._init(parameters.closeButtonElement, parameters.titleElement, parameters.toolbarElement, parameters.gridElement);
	}

	UsageConditionItemGridController.prototype = {
		constructor: UsageConditionItemGridController,

		controllerPublicApi: null,

		_aras: null,

		_arasModules: null,

		_usageConditionSourceItemId: null,

		_usageConditionItemsLoader: null,

		_title: null,

		_grid: null,

		_closeButtonClickHandler: null,

		_vmModuleSolutionBasedRelativePath: '../Modules/aras.innovator.VariantManagementSample',

		_getDefaultVariabilityItem: null,

		_init: function(closeButtonElement, titleElement, toolbarElement, gridElement) {
			this._arasModules = this._aras.getMostTopWindowWithAras(window).ArasModules;
			this.controllerPublicApi = this._constructControllerApi();

			this._setTitle(titleElement);
			this._toggleCloseButton(closeButtonElement);
			this._loadGrid(gridElement);
			this._initGridContextMenu();
			this._loadToolbar(toolbarElement);
		},

		_setTitle: function(titleElement) {
			titleElement.textContent = this._title;
		},

		_toggleCloseButton: function(closeButtonElement) {
			if (!this._closeButtonClickHandler) {
				return;
			}

			closeButtonElement.title = this._aras.getResource(this._vmModuleSolutionBasedRelativePath, 'splitter_pane_view.close_button.tooltip');
			closeButtonElement.addEventListener('click', this._closeButtonClickHandler);
			closeButtonElement.classList.toggle('aras-hide', false);
		},

		_loadToolbar: function(toolbarElement) {
			this._toolbar = new window.Toolbar();
			toolbarElement.appendChild(this._toolbar);

			window.cuiToolbar(this._toolbar, 'vm_usageConditionItemGridToolbar', {
				usageConditionsContext: this.controllerPublicApi
			});
		},

		_initGridContextMenu: function() {
			window.cuiContextMenu(
					new ArasModules.ContextMenu(),
					'vm_usageConditionItemGridCtxMenu',
					{usageConditionsContext: this.controllerPublicApi}
				)
				.then(function(contextMenu) {
					const gridRowContextMenuHandler = function(rowId, e) {
						e.preventDefault();

						contextMenu.show({x: e.clientX, y: e.clientY}, {usageConditionItemId: rowId});
					};

					this._grid.on('contextmenu', gridRowContextMenuHandler, 'row');
				}.bind(this));
		},

		_constructControllerApi: function() {
			const controller = this;

			return {
				grid: {
					get selectedRowIds() {
						return controller._grid.settings.selectedRows.slice();
					},
					on: function(eventName, callback) {
						controller._grid.on(eventName, callback);
					}
				},
				showUsageConditionItem: function(viewMode, usageConditionItemId) {
					controller._showUsageConditionItem(viewMode, usageConditionItemId);
				},
				setDeleteButtonState: function() {
					const deleteButtonId = 'vm_usageConditionItemGridToolbarDeleteItemButton';
					controller._toolbar.data.set(
						deleteButtonId,
						Object.assign({}, controller._toolbar.data.get(deleteButtonId), {
							disabled: controller._grid.settings.selectedRows.length === 0
						})
					);
					controller._toolbar.render();
				},
				deleteSelectedUsageConditions: function() {
					const dialogSettings = {
						title: controller._aras.getResource(
							controller._vmModuleSolutionBasedRelativePath,
							'usage_condition_item_grid_view.delete_confirmation.title')
					};
					const dialogMessage = controller._aras.getResource(
						controller._vmModuleSolutionBasedRelativePath,
						'usage_condition_item_grid_view.delete_confirmation.message');

					controller._arasModules.Dialog.confirm(dialogMessage, dialogSettings).then(function(result) {
						if (result !== 'ok') {
							return;
						}

						const itemIdsToDelete = controller._grid.settings.selectedRows.slice();

						const itemCount = itemIdsToDelete.length;
						for (let i = 0; i < itemCount; i++) {
							const itemIdToDelete = itemIdsToDelete[i];
							const isDeleteSucceeded = controller._aras.deleteItem('vm_VarComponentAssetUsage', itemIdToDelete, true);
							if (isDeleteSucceeded) {
								controller._grid.rows.delete(itemIdToDelete);
							}
						}

						controller.controllerPublicApi.setDeleteButtonState();
					});
				}
			};
		},

		_generateGridRowData: function(expressionItem) {
			const row = {};

			const defaultVariabilityItem = expressionItem.getRelationships(this._usageConditionItemsLoader.usageConditionVariabilityItemRelationshipItemType);
			if (defaultVariabilityItem.getItemCount()) {
				row[GRID_COLUMN_NAMES.variabilityItem] = defaultVariabilityItem.getItemByIndex(0).getRelatedItem().getProperty('keyed_name');
			}
			row[GRID_COLUMN_NAMES.usageCondition] = expressionItem.getProperty(
				'string_notation'
			);

			return row;
		},

		_loadGrid: function(gridElement) {
			const head = new Map();
			head.set(GRID_COLUMN_NAMES.variabilityItem, {
				label: this._aras.getResource(this._vmModuleSolutionBasedRelativePath, 'usage_condition_item_grid_view.grid.variability_item_column_label'),
				width: Math.floor(window.innerWidth / 5)
			});
			head.set(GRID_COLUMN_NAMES.usageCondition, {
				label: this._aras.getResource(this._vmModuleSolutionBasedRelativePath, 'usage_condition_item_grid_view.grid.usage_condition_column_label'),
				width: Math.floor(window.innerWidth * 4 / 5)
			});

			const rows = new Map();
			const expressionItems = this._usageConditionItemsLoader.getExpressionItems(this._usageConditionSourceItemId);
			const expressionItemCount = expressionItems.getItemCount();

			for (let i = 0; i < expressionItemCount; i++) {
				const curentExpressionItem = expressionItems.getItemByIndex(i);
				rows.set(curentExpressionItem.getId(), this._generateGridRowData(curentExpressionItem));
			}

			this._grid = new window.Grid(gridElement);
			this._grid.head = head;
			this._grid.rows = rows;
		},

		_showUsageConditionItem: function(viewMode, usageConditionItemId) {
			const title = this._aras.getResource(
				this._vmModuleSolutionBasedRelativePath,
				'usage_condition_editor_view.title');

			let usageConditionItemNode;

			if (viewMode === 'add') {
				const defaultVariabilityItem = this._getDefaultVariabilityItem();
				const usageConditionItem = this._constructNewUsageConditionItem(defaultVariabilityItem);

				usageConditionItemNode = usageConditionItem.node;
			} else {
				usageConditionItemNode = this._aras.getItemById(
					this._usageConditionItemsLoader.usageConditionItemType,
					usageConditionItemId);
			}

			const dialogArguments = {
				aras: this._aras,
				usageConditionItemNode: usageConditionItemNode,
				viewMode: viewMode,
				usageConditionVariabilityItemRelationshipItemType: this._usageConditionItemsLoader.usageConditionVariabilityItemRelationshipItemType,
				content: this._aras.getBaseURL() + '/Modules/aras.innovator.VariantManagementSample/Views/vmUsageConditionEditorDialog.html',
				title: title,
				dialogWidth: 760,
				dialogHeight: 504
			};

			this._arasModules.MaximazableDialog.show('iframe', dialogArguments)
				.promise.then(function(savedUsageConditionItem) {
					if (!savedUsageConditionItem) {
						return;
					}

					const usageConditionItemGridRow = this._generateGridRowData(savedUsageConditionItem);

					this._grid.rows.set(
						savedUsageConditionItem.getID(),
						usageConditionItemGridRow
					);
				}.bind(this));
		},

		_constructNewUsageConditionItem: function(variabilityItem) {
			const usageConditionItem = this._aras.newIOMItem(this._usageConditionItemsLoader.usageConditionItemType, 'add');
			usageConditionItem.setProperty('source_id', this._usageConditionSourceItemId);

			if (variabilityItem) {
				const usageConditionVariabilityItemRelationshipItem = usageConditionItem.createRelationship(
					this._usageConditionItemsLoader.usageConditionVariabilityItemRelationshipItemType,
					'add'
				);
				usageConditionVariabilityItemRelationshipItem.setRelatedItem(variabilityItem);
			}

			return usageConditionItem;
		}
	};

	window.UsageConditionItemGridController = UsageConditionItemGridController;
}(window));
