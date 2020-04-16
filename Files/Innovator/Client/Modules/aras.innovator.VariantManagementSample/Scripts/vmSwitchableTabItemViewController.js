(function(window) {
	'use strict';

	function VmSwitchableTabItemViewController(sidebarWidget, switcherManager) {
		this._sidebarWidget = sidebarWidget;
		this._switcherManager = switcherManager;

		this._init();
	}

	VmSwitchableTabItemViewController.prototype = {
		constructor: VmSwitchableTabItemViewController,

		_sidebarWidget: null,

		_switcherManager: null,

		_init: function() {
			document.addEventListener('switchActivePane', function(e) {
				this._switchActivePane(e.detail.paneId, e.detail.contentPath, e.detail.additionalData);
			}.bind(this));
		},

		get activePaneId() {
			return this._switcherManager.activePaneId;
		},

		get activePaneElement() {
			return this._switcherManager.activePaneElement;
		},

		get paneManagerId() {
			return this._switcherManager.switcherId;
		},

		isPaneAvailable: function(paneId) {
			return true;
		},

		refreshSidebarButtonsAvailability: function() {
			const activePaneId = this.activePaneId;

			this._sidebarWidget.getChildren().forEach(function(control) {
				if (control.paneId !== activePaneId) {
					const isPaneAvailable = this.isPaneAvailable(control.paneId);
					control.setDisabled(!isPaneAvailable);
					control.domNode.style.opacity = isPaneAvailable ? '1' : '0.4';
				}
			}.bind(this));
		},

		switchActivePane: function(paneId, additionalData) {
			const sidebarButton = this._sidebarWidget.getChildren().find(function(control) {
				return control.paneId === paneId;
			});

			if (!sidebarButton) {
				return false;
			}

			const contentPath = sidebarButton.contentPath;

			return this._switchActivePane(paneId, contentPath, additionalData);
		},

		_switchActivePane: function(paneId, contentPath, additionalData) {
			let isActivePaneSwitched = false;

			if (!this.isPaneAvailable(paneId)) {
				return isActivePaneSwitched;
			}

			isActivePaneSwitched = this._switcherManager.switchActivePane(paneId, contentPath, additionalData);

			if (isActivePaneSwitched) {
				this._switchSidebarButton(paneId);
			}

			return isActivePaneSwitched;
		},

		_switchSidebarButton: function(paneId) {
			this._sidebarWidget.getChildren().forEach(function(control) {
				const isControlSelected = control.paneId === paneId;
				const image = isControlSelected ? control.imageBtnOn : control.imageBtnOff;

				this._sidebarWidget.switchSidebarButton(control.id, image, isControlSelected);
			}.bind(this));
		}
	};

	window.VmSwitchableTabItemViewController = VmSwitchableTabItemViewController;
}(window));
