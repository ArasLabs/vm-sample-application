(function(window) {
	'use strict';

	function VmSwitchableTabItemViewController(sidebarTabs, switcherManager) {
		this._sidebarTabs = sidebarTabs;
		this._switcherManager = switcherManager;

		this._init();
	}

	VmSwitchableTabItemViewController.prototype = {
		constructor: VmSwitchableTabItemViewController,

		_sidebarTabs: null,

		_switcherManager: null,

		_sidebarTabIdBySwitcherPaneId: null,

		_init: function() {
			this._sidebarTabIdBySwitcherPaneId = new Map([
				['formTab', 'show_form']
			]);

			this._sidebarTabs.data.forEach((sidebarTabData, sidebarTabId) => {
				const paneId = sidebarTabData.paneId;
				if (paneId) {
					this._sidebarTabIdBySwitcherPaneId.set(paneId, sidebarTabId);
				}
			});

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

			this._sidebarTabIdBySwitcherPaneId.forEach((sidebarTabId, paneId) => {
				if (paneId !== activePaneId) {
					const isTabDisabled = !this.isPaneAvailable(paneId);

					const tabSettings = {
						disabled: isTabDisabled,
						cssClass: isTabDisabled ? 'vm-sidebar-tab_disabled' : ''
					};

					this._sidebarTabs.setTabContent(sidebarTabId, tabSettings);
				}
			});
		},

		switchActivePane: function(paneId, additionalData) {
			let isActivePaneSwitched = false;

			const sidebarTabId = this._sidebarTabIdBySwitcherPaneId.get(paneId);
			const sidebarTabData = this._sidebarTabs.data.get(sidebarTabId);

			if (!sidebarTabData) {
				return isActivePaneSwitched;
			}

			const contentPath = sidebarTabData.contentPath;

			isActivePaneSwitched = this._switchActivePane(paneId, contentPath, additionalData);

			if (isActivePaneSwitched) {
				this._sidebarTabs.selectTab(sidebarTabId);
			}

			return isActivePaneSwitched;
		},

		_switchActivePane: function(paneId, contentPath, additionalData) {
			if (!this.isPaneAvailable(paneId)) {
				// sidebar button's onClick CUI handler is executed first when user clicks on sidebar button
				// after that sidebar button is selected automatically
				// so it is required to refresh sidebar buttons availability in order to prevent button selection in case if pane is unavailable
				this.refreshSidebarButtonsAvailability();

				return false;
			}

			return this._switcherManager.switchActivePane(paneId, contentPath, additionalData);
		}
	};

	window.VmSwitchableTabItemViewController = VmSwitchableTabItemViewController;
}(window));
