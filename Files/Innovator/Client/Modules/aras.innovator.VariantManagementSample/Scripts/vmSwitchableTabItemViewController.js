(function(window) {
	'use strict';

	function VmSwitchableTabItemViewController(sidebarWidget, switcherManager) {
		this._sidebarWidget = sidebarWidget;
		this._switcherManager = switcherManager;
	}

	VmSwitchableTabItemViewController.prototype = {
		constructor: VmSwitchableTabItemViewController,

		_sidebarWidget: null,

		_switcherManager: null,

		get activePaneId() {
			return this._switcherManager.activePaneId;
		},

		get activePaneElement() {
			return this._switcherManager.activePaneElement;
		},

		get paneManagerId() {
			return this._switcherManager.switcherId;
		},

		switchActivePane: function(paneId, contentPath, additionalData) {
			const isActivePaneSwitched = this._switcherManager.switchActivePane(paneId, contentPath, additionalData);

			if (isActivePaneSwitched) {
				this._switchSidebarButton(paneId);
			}
		},

		_switchSidebarButton: function(paneId) {
			this._sidebarWidget.getChildren().forEach(function(control) {
				const isControlSelected = control.paneId === paneId;
				const image = isControlSelected ? control.imageBtnOn : control.imageBtnOff;

				this._sidebarWidget.switchSidebarButton(control.id, image, isControlSelected);
			}.bind(this));
		}
	};

	Object.defineProperty(VmSwitchableTabItemViewController, 'createInstance', {
		value: function(sidebarWidget, switcherManager) {
			const vmSwitchableTabItemViewController = new VmSwitchableTabItemViewController(sidebarWidget, switcherManager);

			document.addEventListener('switchActivePane', function(e) {
				vmSwitchableTabItemViewController.switchActivePane(e.detail.paneId, e.detail.contentPath, e.detail.additionalData);
			});

			return vmSwitchableTabItemViewController;
		}
	});

	window.VmSwitchableTabItemViewController = VmSwitchableTabItemViewController;
}(window));
