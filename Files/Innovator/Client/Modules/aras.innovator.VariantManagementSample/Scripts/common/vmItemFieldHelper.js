(function(window) {
	'use strict';

	function VmItemFieldHelper(parameters) {
		this._aras = parameters.aras;
		this._currentRetainedItemNode = parameters.initialItemNode;
		this._changeItemConfirmationMessage = parameters.changeItemConfirmationMessage;
		this._onChangeItemHandler = parameters.onChangeItemHandler;
	}

	VmItemFieldHelper.prototype = {
		constructor: VmItemFieldHelper,

		_aras: null,

		_currentRetainedItemNode: null,

		_changeItemConfirmationMessage: null,

		getItemFieldHandlers: function() {
			const topWnd = this._aras.getMostTopWindowWithAras();
			const self = this;

			const showSearchDialog = function(itemPropertyElement) {
				topWnd.ArasModules.MaximazableDialog.show('iframe', {
					aras: self._aras,
					itemtypeName: itemPropertyElement.state.itemType,
					type: 'SearchDialog'
				}).promise.then(function(result) {
					if (!result) {
						itemPropertyElement.setState({focus: true});
						return;
					}

					if (itemPropertyElement.state.value !== result.keyed_name) {
						itemPropertyElement.setState({value: result.keyed_name});
						itemPropertyElement.state.refs.input.dispatchEvent(new CustomEvent('change', {bubbles: true}));
					}
				});
			};

			return {
				onChangeHandler: function() {
					const itemPropertiesToSelect = 'keyed_name';
					const itemPropertyElement = this;
					const selectedItemKeyedName = itemPropertyElement.state.value;
					const currentRetainedItemKeyedName = self._currentRetainedItemKeyedName;

					if (selectedItemKeyedName === currentRetainedItemKeyedName) {
						return;
					}

					const clearCurrentRetainedItem = selectedItemKeyedName === '';
					const selectedItemNode = clearCurrentRetainedItem ?
						null :
						self._aras.getItemByKeyedName(
							itemPropertyElement.state.itemType,
							selectedItemKeyedName,
							0,
							'',
							itemPropertiesToSelect);

					if (clearCurrentRetainedItem || selectedItemNode) {
						if (currentRetainedItemKeyedName) {
							itemPropertyElement.state.focus = false;

							topWnd.ArasModules.Dialog.confirm(self._changeItemConfirmationMessage).then(function(result) {
								const itemPropertyElementState = {
									focus: true
								};

								if (result === 'ok') {
									self._currentRetainedItemNode = selectedItemNode;
									self._executeOnChangeItemHandler(selectedItemNode);
								} else {
									itemPropertyElementState.value = currentRetainedItemKeyedName;
								}

								itemPropertyElement.setState(itemPropertyElementState);
							});
						} else {
							self._currentRetainedItemNode = selectedItemNode;
							self._executeOnChangeItemHandler(selectedItemNode);
						}
					} else {
						const message = self._aras.getResource('', 'relationshipsgrid.value_not_exist_for_it', itemPropertyElement.state.itemType);

						topWnd.ArasModules.Dialog.confirm(message).then(function(result) {
							const giveAnotherAttemptToEnterItemName = result === 'ok';

							if (giveAnotherAttemptToEnterItemName) {
								itemPropertyElement.setState({focus: true});
							} else {
								itemPropertyElement.setState({value: currentRetainedItemKeyedName});
							}
						});
					}
				},
				onClickHandler: function(e) {
					if (e.target.closest('.aras-filter-list__button_ellipsis')) {
						showSearchDialog(this);
						e.stopPropagation();
					}
				},
				onKeyDownHandler: function(e) {
					const isF2KeyPressed = e.keyCode === 113;

					if (isF2KeyPressed) {
						showSearchDialog(this);
						e.stopPropagation();
					}
				},
				onAddElementNodeHandler: function(itemPropertyElement) {
					itemPropertyElement.setState({value: self._currentRetainedItemKeyedName});
				}
			};
		},

		get _currentRetainedItemKeyedName() {
			return this._aras.getItemProperty(this._currentRetainedItemNode, 'keyed_name') || '';
		},

		_executeOnChangeItemHandler: function(itemNode) {
			if (this._onChangeItemHandler) {
				this._onChangeItemHandler(itemNode);
			}
		}
	};

	window.VmItemFieldHelper = VmItemFieldHelper;
}(window));
