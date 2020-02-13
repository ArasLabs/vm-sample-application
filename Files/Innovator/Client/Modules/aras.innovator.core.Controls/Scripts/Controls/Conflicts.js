define([
	'dojo/_base/declare',
	'dojo/_base/connect',
	'Controls/conflictsRenderer'
],
function(declare, connect, ConflictsRenderer) {
	return declare('Controls.Conflicts', null, {
		conflictsRenderer: null,
		isViewCreated: null,

		constructor: function(initialParameters) {
			initialParameters = initialParameters || {};

			this.conflictsRenderer = new ConflictsRenderer({
				connectId: initialParameters.connectId || 'conflictsContainer',
				scaleExtent: [0.1, 2],
				onGroupsSwitched: function(sourceGroupId, targetGroupId, insertAfter) {
					this.onGroupsSwitched(sourceGroupId, targetGroupId, insertAfter);
				}.bind(this),
				layerVisualizationParameters: initialParameters.layerVisualizationParameters
			});

			connect.connect(this.conflictsRenderer, 'onMenuInit',
				function() {return this.onTreeMenuInit();}.bind(this));
			connect.connect(this.conflictsRenderer, 'onMenuSetup',
				function(menuControl, targetLayer, targetDataNode) {this.onTreeMenuSetup(menuControl, targetLayer, targetDataNode);}.bind(this));
			connect.connect(this.conflictsRenderer, 'onMenuItemClick',
				function(commandId, targetDataNode) {this.onMenuItemClick(commandId, targetDataNode);}.bind(this));
			connect.connect(this.conflictsRenderer, 'onScaleChanged',
				function(newScale) {this.onScaleChanged(newScale);}.bind(this));

			this.isViewCreated = false;
		},

		loadConflicts: function(conflicts) {
			this.conflictsRenderer.createConflicts(conflicts);
			this.isViewCreated = true;
		},

		isLoaded: function() {
			return this.isViewCreated;
		},

		getParentNode: function() {
			return this.conflictsRenderer.domNode.parentNode;
		},

		onTreeMenuInit: function() {
			return [
				{id: 'centerview', name: 'Center View'},
				{id: 'hidegroups', name: 'Hide Group Names'},
				{id: 'showgroups', name: 'Show Group Names'}
			];
		},

		onTreeMenuSetup: function(menuControl, targetLayer, targetDataNode) {
			var layerName = this.conflictsRenderer.getLayerName(targetLayer);
			var visibleMenuItemsHash = {'centerview': true};
			var menuItemId;

			visibleMenuItemsHash[this.groupsLayerVisible ? 'hidegroups' : 'showgroups'] = true; // groupsLayerVisible константа была мной удалена

			for (menuItemId in menuControl.collectionMenu) {
				menuControl.setHide(menuItemId, !visibleMenuItemsHash[menuItemId]);
			}
		},

		onMenuItemClick: function(commandId, targetDataNode) {
			switch (commandId) {
				case 'centerview':
					this.conflictsRenderer.centerView();
					break;
				case 'hidegroups':
					this.setGroupsLayerVisibility(false);
					break;
				case 'showgroups':
					this.setGroupsLayerVisibility(true);
					break;
			}
		},

		setGroupsLayerVisibility: function(isVisible) {
			var layer = this.conflictsRenderer.getLayer('groups');
			if (layer) {
				layer.domNode.style.opacity = isVisible ? '1' : '0';
				this.groupsLayerVisible = isVisible; // groupsLayerVisible константа была мной удалена
			}
		},

		onScaleChanged: function(newScale) {
		},

		onGroupsSwitched: function(sourceGroupId, targetGroupId, insertAfter) {
		},

		setConflictsData: function(layerName, newData) {
			var conflictsLayer = this.conflictsRenderer.getLayer(layerName);
			conflictsLayer.setData(newData);
		},

		getLeafDataNodesCount: function(layerName) {
			var treeLayer = this.conflictsRenderer.getLayer(layerName);
			var leafNodes = treeLayer.getLeafDataNodes();
			return leafNodes.length;
		},

		setScale: function(newScale) {
			this.conflictsRenderer.setScale(newScale);
		},

		getScale: function() {
			return this.conflictsRenderer.getScale();
		},

		centerView: function() {
			this.conflictsRenderer.centerView();
		},

		adjustViewBounds: function() {
			this.conflictsRenderer.adjustViewBounds();
		}
	});
});
