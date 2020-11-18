(function(window) {
	'use strict';

	function VmItemViewBaseController(parameters) {
		this._aras = parameters.aras;
		this._utils = parameters.utils;
		this._switchableTabItemViewController = parameters.switchableTabItemViewController;
		this._variabilityItemRelationshipItemType = parameters.variabilityItemRelationshipItemType;
		this._originalHandlerByCommandName = new Map();
		this._customHandlersByCommandName = new Map();

		this._init();
	}

	VmItemViewBaseController.prototype = {
		constructor: VmItemViewBaseController,

		_aras: null,

		_utils: null,

		_switchableTabItemViewController: null,

		_itemViewPaneId: 'formTab',

		_variabilityItemRelationshipItemType: null,

		_originalHandlerByCommandName: null,

		_customHandlersByCommandName: null,

		_init: function() {
			this.subscribeAfterRootItemCommand('onUnlockCommand', this.refreshSidebarButtonsAvailability.bind(this));
			this.subscribeAfterRootItemCommand('onSaveCommand', this.refreshSidebarButtonsAvailability.bind(this));
			this.subscribeAfterRootItemCommand('onRefresh', this.refreshSidebarButtonsAvailability.bind(this));
		},

		getDefaultVariabilityItem: function() {
			// Check window.item if it already contains loaded default VariabilityItem
			const defaultVariabilityItemNode = window.item.selectSingleNode(
				'./Relationships/Item[@type="' + this._variabilityItemRelationshipItemType + '"]/related_id/Item');

			let defaultVariabilityItem;

			if (defaultVariabilityItemNode) {
				defaultVariabilityItem = this._utils.convertItemNodeToIomItem(defaultVariabilityItemNode);

				return defaultVariabilityItem;
			}

			// Load default VariabilityItem from server
			const sourceItemId = this._aras.getItemProperty(window.item, 'id');

			defaultVariabilityItem = this._aras.newIOMItem('vm_VariabilityItem', 'get');
			defaultVariabilityItem.setAttribute('select', 'id,keyed_name');

			const relationshipItem = this._aras.newIOMItem(this._variabilityItemRelationshipItemType);
			relationshipItem.setProperty('source_id', sourceItemId);

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

			return defaultVariabilityItem;
		},

		setIsDirty: function(isDirty) {
			window.item.setAttribute('isDirty', isDirty ? '1' : '0');

			if (isDirty && !window.thisItem.getAction()) {
				window.thisItem.setAction('update');
			}

			this.refreshSidebarButtonsAvailability();
		},

		subscribeAfterRootItemCommand: function(commandName, customHandler) {
			const originalCommandHandler = window[commandName];

			if (!originalCommandHandler) {
				return false;
			}

			let customHandlers = this._customHandlersByCommandName.get(commandName);

			if (customHandlers) {
				customHandlers.push(customHandler);
				return true;
			}

			customHandlers = [customHandler];

			this._customHandlersByCommandName.set(commandName, customHandlers);
			this._originalHandlerByCommandName.set(commandName, originalCommandHandler);

			window[commandName] = function() {
				const commandHandlerArguments = arguments;
				const commandHandler = this._originalHandlerByCommandName.get(commandName);
				const customHandlers = this._customHandlersByCommandName.get(commandName);
				const commandHandlerResult = commandHandler.apply(window, commandHandlerArguments);

				const applyCustomHandlers = function(commandHandlerResult) {
					customHandlers.forEach(function(customHandler) {
						customHandler(commandHandlerResult, commandHandlerArguments);
					});
				};

				if (commandHandlerResult instanceof Promise) {
					return commandHandlerResult.then(function(result) {
						applyCustomHandlers(result);
						return result;
					});
				} else {
					applyCustomHandlers(commandHandlerResult);
					return commandHandlerResult;
				}
			}.bind(this);

			return true;
		},

		refreshSidebarButtonsAvailability: function() {
			this._switchableTabItemViewController.refreshSidebarButtonsAvailability();
		}
	};

	window.VmItemViewBaseController = VmItemViewBaseController;
}(window));
