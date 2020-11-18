(function(window) {
	'use strict';

	const _super = window.VmItemViewBaseController.prototype;

	function VariableComponentItemViewController(parameters) {
		_super.constructor.call(this, Object.assign({variabilityItemRelationshipItemType: 'vm_VarComponentVariabilityItem'}, parameters));
	}

	VariableComponentItemViewController.prototype = Object.assign(Object.create(_super), {
		constructor: VariableComponentItemViewController,

		_init: function() {
			_super._init.call(this);

			this._switchableTabItemViewController.isPaneAvailable = this._getViewAvailability.bind(this);
		},

		_getViewAvailability: function(viewId) {
			const item = window.item;
			const isDirty = this._aras.isDirtyEx(item);

			switch (viewId) {
				case this._itemViewPaneId:
					return !isDirty;
				default:
					return true;
			}
		}
	});

	window.VariableComponentItemViewController = VariableComponentItemViewController;
}(window));
