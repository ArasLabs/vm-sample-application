(function(window) {
	'use strict';

	function VmSwitcherManager(aras, switcherElement) {
		this._aras = aras;
		this._switcherElement = switcherElement;
	}

	VmSwitcherManager.prototype = {
		constructor: VmSwitcherManager,

		_aras: null,

		_switcherElement: null,

		get activePaneId() {
			return this._switcherElement.activePaneId;
		},

		get switcherId() {
			return this._switcherElement.id;
		},

		get activePaneElement() {
			return this._getPaneById(this.activePaneId);
		},

		switchActivePane: function(paneId, contentPath, additionalData) {
			if (this.activePaneId === paneId) {
				return false;
			}

			this._aras.browserHelper.toggleSpinner(document, true);

			this._dispatchSwitchPaneEventOnActivePane('deactivate', additionalData);

			let nextActivePane = this._getPaneById(paneId);
			let loadPaneContentPromise = Promise.resolve();

			if (!nextActivePane) {
				nextActivePane = this._createPane(paneId);
				loadPaneContentPromise = this._loadPaneContent(nextActivePane, contentPath, additionalData);

				this._switcherElement.appendChild(nextActivePane);
			}

			this._switcherElement.activePaneId = paneId;

			loadPaneContentPromise.then(function() {
				this._dispatchSwitchPaneEventOnActivePane('activate', additionalData);
				this._aras.browserHelper.toggleSpinner(document, false);
			}.bind(this));

			return true;
		},

		_getPaneById: function(paneId) {
			return Array.prototype.find.call(this._switcherElement.children, function(item) {
				return item.getAttribute('switcher-pane-id') === paneId;
			});
		},

		_createPane: function(paneId) {
			const pane = document.createElement('iframe');
			pane.classList.add('aras-switcher-pane_border_none');
			pane.setAttribute('switcher-pane-id', paneId);

			return pane;
		},

		_loadPaneContent: function(pane, contentPath, additionalData) {
			return new Promise(function(resolve) {
				if (!contentPath) {
					resolve();
					return;
				}

				pane.addEventListener('load', function() {
					this._dispatchSwitchPaneEventOnActivePane('load', additionalData);
					resolve();
				}.bind(this));

				pane.src = this._aras.getBaseURL() + contentPath;
			}.bind(this));
		},

		_dispatchSwitchPaneEventOnActivePane: function(action, additionalData) {
			const activePaneElement = this.activePaneElement;

			if (!activePaneElement) {
				return;
			}

			const activePaneDocument = activePaneElement.contentDocument || activePaneElement.ownerDocument;

			const event = new CustomEvent(
				'switchPane',
				{
					detail: {
						action: action,
						paneId: this.activePaneId,
						switcherId: this.switcherId,
						additionalData: additionalData
					}
				}
			);

			activePaneDocument.dispatchEvent(event);
		}
	};

	window.VmSwitcherManager = VmSwitcherManager;
}(window));
