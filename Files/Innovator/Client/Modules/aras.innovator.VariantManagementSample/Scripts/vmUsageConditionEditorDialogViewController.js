(function(window) {
	'use strict';

	const _super = window.VmUsageConditionEditorViewController.prototype;

	function VmUsageConditionEditorDialogViewController(parameters) {
		this._dialog = parameters.dialog;

		_super.constructor.call(this, Object.assign({closeHandler: this._dialog.close.bind(this._dialog)}, parameters));
	}

	VmUsageConditionEditorDialogViewController.prototype = Object.assign(Object.create(_super), {
		constructor: VmUsageConditionEditorDialogViewController,

		_dialog: null,

		_init: function() {
			_super._init.apply(this, arguments);

			this._overrideDialogCloseButtonBehavior();
		},

		_overrideDialogCloseButtonBehavior: function() {
			const dialogCloseButtonEventInfo = this._dialog.attachedEvents.onCloseBtn;

			const dialogCloseButtonHandler = this._usageConditionEditorCancelButtonOnClickHandler.bind(this);

			dialogCloseButtonEventInfo.node.removeEventListener(
				dialogCloseButtonEventInfo.eventName,
				dialogCloseButtonEventInfo.callback);
			dialogCloseButtonEventInfo.node.addEventListener(
				dialogCloseButtonEventInfo.eventName,
				dialogCloseButtonHandler);

			dialogCloseButtonEventInfo.callback = dialogCloseButtonHandler;
		}
	});

	window.VmUsageConditionEditorDialogViewController = VmUsageConditionEditorDialogViewController;
}(window));
