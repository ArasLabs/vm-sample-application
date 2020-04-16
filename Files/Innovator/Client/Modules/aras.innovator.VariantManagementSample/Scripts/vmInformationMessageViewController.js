(function(window) {
	'use strict';

	function VmInformationMessageViewController(parameters) {
		this._aras = parameters.aras;
		this._informationMessage = parameters.informationMessage;
		this._informationMessageElement = parameters.informationMessageElement;
		this._closeButtonClickHandler = parameters.closeButtonClickHandler;
		this._closeButtonElement = parameters.closeButtonElement;

		this._init();
	}

	VmInformationMessageViewController.prototype = {
		constructor: VmInformationMessageViewController,

		_aras: null,

		_informationMessage: null,

		_informationMessageElement: null,

		_closeButtonElement: null,

		_closeButtonClickHandler: null,

		_vmModuleSolutionBasedRelativePath: '../Modules/aras.innovator.VariantManagementSample',

		_init: function() {
			this._toggleCloseButton();
			this._loadInformationMessage();
		},

		_loadInformationMessage: function() {
			this._informationMessageElement.textContent = this._informationMessage;
		},

		_toggleCloseButton: function() {
			if (!this._closeButtonClickHandler) {
				return;
			}

			this._closeButtonElement.title = this._aras.getResource(this._vmModuleSolutionBasedRelativePath, 'splitter_pane_view.close_button.tooltip');
			this._closeButtonElement.addEventListener('click', this._closeButtonClickHandler);
			this._closeButtonElement.classList.toggle('aras-hide', false);
		}
	};

	window.VmInformationMessageViewController = VmInformationMessageViewController;
}(window));
