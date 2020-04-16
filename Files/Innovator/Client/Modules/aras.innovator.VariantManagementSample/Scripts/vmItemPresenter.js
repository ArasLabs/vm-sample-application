(function(window) {
	'use strict';

	const _super = window.ItemPresenter.prototype;

	function VmItemPresenter(aras) {
		_super.constructor.call(this, aras);
	}

	VmItemPresenter.prototype = Object.assign(Object.create(_super), {
		constructor: VmItemPresenter,

		showInFrame: function(formItemNode, frameElement, viewMode, itemNode, itemTypeItemNode) {
			this._aras.uiShowItemInFrameEx(frameElement, itemNode, viewMode, 0, formItemNode, itemTypeItemNode);
		}
	});

	window.VmItemPresenter = VmItemPresenter;
}(window));
