define('Modules/aras.innovator.VariantManagementSample/Scripts/variantTree/variantTreeApplicationBase', [
	'dojo/_base/declare',
	'dojo/_base/connect',
	'Modules/aras.innovator.VariantManagementSample/Scripts/variantTree/labeledRangeSlider',
	'Modules/aras.innovator.VariantManagementSample/Scripts/variantTree/variantTreeDataBuilder',
	'Controls/VariantsTree/VariantsTree',
	'Modules/aras.innovator.VariantManagementSample/Scripts/variantTree/print/variantTreePrint'
],
function(declare, connect, LabeledRangeSlider, DataBuilder, VariantsTree, VariantTreePrint) {
	return declare(null, {
		scaleSlider: null,
		treeControl: null,
		treeControlParentNode: null,
		containerNode: null,
		treeControlsNode: null,
		infoNode: null,
		scaleTimer: null,
		spacingTimer: null,
		panCoordinates: null,
		settings: null,
		resizeTimer: null,
		dataBuilder: null,
		variantTreePrint: null,

		constructor: function(initialParameters) {
			this.scaleSlider = new LabeledRangeSlider({
				sliderId: 'scaleSlider',
				connectId: 'variantTreeControls', label: 'Scale:', minValue: 0.1, maxValue: 2, step: 0.02, value: 1,
				valueFormatter: function(sliderValue) {
					return Math.floor(sliderValue * 100) + '%';
				}
			});

			this.spacingSlider = new LabeledRangeSlider({
				sliderId: 'spacingSlider',
				connectId: 'variantTreeControls', label: 'Spacing:', minValue: 180, maxValue: 400, step: 2, value: 200,
				valueFormatter: function(sliderValue) {
					return Math.floor(sliderValue) + 'px';
				}
			});

			this.dataBuilder = new DataBuilder();

			this.treeControl = new VariantsTree({
				connectId: 'variantTreeContainer',
				layerVisualizationParameters: {
					'groups': {sourceMargin: 75}
				}
			});
			this.treeControlParentNode = this.treeControl.getParentNode();
			this.containerNode = document.querySelector('#variantTreeContainer');
			this.treeControlsNode = document.querySelector('#variantTreeControls');
			this.infoNode = document.querySelector('#variantTreeInfo');

			this.variantTreePrint = new VariantTreePrint({
				connectId: 'variantTreeControls',
				displayItemName: aras.getItemProperty(initialParameters.item, 'name')
			});
			this.settings = initialParameters.settings || {};
		},

		init: function() {
			this.scaleSlider.domNode.addEventListener('onValueChanged', this.onScaleSliderChange.bind(this), false);
			this.spacingSlider.domNode.addEventListener('onValueChanged', this.onSpacingSliderChange.bind(this), false);

			connect.connect(this.treeControl, 'onScaleChanged', this.onTreeScaleChange.bind(this));
			connect.connect(this.treeControl, 'onGroupsSwitched', this.onGroupsSwitched.bind(this));

			window.addEventListener('resize', this.onWindowResize.bind(this));

			// attach pan event listeners to the viewer svg node
			this.treeControlParentNode.addEventListener('mousedown', this.onViewerStartPan.bind(this));
			this.treeControlParentNode.addEventListener('selectstart', this.onViewerSelectStart.bind(this));
			document.addEventListener('mousemove', this.onViewerPan.bind(this));
			document.addEventListener('mouseleave', this.onViewerEndPan.bind(this));
			document.addEventListener('mouseup', this.onViewerEndPan.bind(this));
			document.addEventListener('keydown', this.onKeyDownHandler.bind(this));
			document.oncontextmenu = function(menuEvent) {
				menuEvent.preventDefault();
			};

			window.addEventListener('beforeunload', this.onBeforeUnload.bind(this));
			this.containerNode.addEventListener('wheel', this.onWheelEventHandler.bind(this));
		},

		onGroupsSwitched: function(sourceGroupId, targetGroupId, insertAfter) {
			var groupsList = this.settings.affectedGroups;
			var fromIndex = this.getSettingsGroupIndex(sourceGroupId);
			var toIndex = this.getSettingsGroupIndex(targetGroupId);
			var groupDescriptor = groupsList.splice(fromIndex, 1)[0];

			// correct toIndex position, because it shifts after splice operation
			toIndex -= toIndex > fromIndex ? 1 : 0;
			groupsList.splice(toIndex + (insertAfter ? 1 : 0), 0, groupDescriptor);

			// update group sequence for dataLoader
			this.dataBuilder.setNodeItemsSortOrder(this.getSelectedVariableNamedConstantPairs());
			this.treeControl.setTreeLayerData('variantsTree', this.dataBuilder.getVariantTreeData());
			this.treeControl.adjustViewBounds();

			this.updateInfoPanel();
		},

		getSettingsGroupIndex: function(groupId) {
			var groupsList = this.settings.affectedGroups || [];
			var i;

			for (i = 0; i < groupsList.length; i++) {
				if (groupsList[i].itemId == groupId) {
					return i;
				}
			}

			return -1;
		},

		getSelectedGroupsList: function() {
			var groupsList = this.settings.affectedGroups || [];
			var resultList = [];
			var groupDescriptor;
			var i;

			for (i = 0; i < groupsList.length; i++) {
				groupDescriptor = groupsList[i];

				if (groupDescriptor.selected) {
					resultList.push(groupDescriptor.itemId);
				}
			}

			return resultList;
		},

		getSelectedVariableNamedConstantPairs: function() {
			var groupsList = this.settings.affectedGroups || [];
			var resultList = [];
			var groupDescriptor;
			var childItems;
			var i;
			var j;

			for (i = 0; i < groupsList.length; i++) {
				groupDescriptor = groupsList[i];

				if (groupDescriptor.selected) {
					childItems = groupDescriptor.children;

					for (j = 0; j < childItems.length; j++) {
						if (childItems[j].selected) {
							var idList = childItems[j].idPath.split(',');
							resultList.push({
								namedConstantId: childItems[j].itemId,
								variableId: idList[idList.length - 2]
							});
						}
					}
				}
			}

			return resultList;
		},

		updateInfoPanel: function() {
			this.infoNode.textContent = 'Combinations count: ' +
				this.treeControl.getLeafDataNodesCount('variantsTree');
		},

		onWindowResize: function() {
			if (this.treeControl.isTreeLoaded()) {
				if (this.resizeTimer) {
					clearTimeout(this.resizeTimer);
				}

				this.resizeTimer = setTimeout(function() {
					this.treeControl.adjustViewBounds();
					this.resizeTimer = null;
				}.bind(this), 100);
			}
		},

		onBeforeUnload: function() {
			this.treeControlParentNode.removeEventListener('mousedown', this.onViewerStartPan);
			this.treeControlParentNode.removeEventListener('selectstart', this.onViewerSelectStart);

			document.removeEventListener('mousemove', this.onViewerPan);
			document.removeEventListener('mouseleave', this.onViewerEndPan);
			document.removeEventListener('mouseup', this.onViewerEndPan);
			document.removeEventListener('keydown', this.onKeyDownHandler);

			window.removeEventListener('beforeunload', this.onBeforeUnload);
			this.containerNode.removeEventListener('wheel', this.onWheelEventHandler);
		},

		onViewerSelectStart: function(targetEvent) {
			this.stopEvent(targetEvent);
		},

		stopEvent: function(targetEvent) {
			targetEvent.stopPropagation();
			targetEvent.preventDefault();
		},

		onScaleSliderChange: function(changeEvent) {
			var newScale = parseFloat(changeEvent.detail.newValue);

			if (this.treeControl.getScale() !== newScale) {
				this.setTreeScale(newScale);
			}
		},

		onSpacingSliderChange: function(changeEvent) {
			var newSpacing = parseFloat(changeEvent.detail.newValue);

			this.setTreeSpacing(newSpacing);
		},

		onTreeScaleChange: function(newScale) {
			newScale = parseFloat(newScale);

			if (this.scaleSlider.getValue() !== newScale) {
				this.scaleSlider.setValue(newScale);
			}
		},

		setTreeScale: function(newScale) {
			if (this.scaleTimer) {
				clearTimeout(this.scaleTimer);
				this.scaleTimer = null;
			} else {
				this.treeControlsNode.classList.toggle('active', true);
			}

			this.scaleTimer = setTimeout(function() {
				var currentCenterX = (this.containerNode.scrollLeft + this.containerNode.clientWidth / 2) / this.containerNode.scrollWidth;
				var currentCenterY = (this.containerNode.scrollTop + this.containerNode.clientHeight / 2) / this.containerNode.scrollHeight;

				this.treeControl.setScale(newScale);

				this.containerNode.scrollLeft = currentCenterX * this.containerNode.scrollWidth - this.containerNode.clientWidth / 2;
				this.containerNode.scrollTop = currentCenterY * this.containerNode.scrollHeight - this.containerNode.clientHeight / 2;

				this.treeControlsNode.classList.toggle('active', false);
				this.scaleTimer = null;
			}.bind(this), 100);
		},

		setTreeSpacing: function(newSpacing) {
			if (this.spacingTimer) {
				clearTimeout(this.spacingTimer);
				this.spacingTimer = null;
			} else {
				this.treeControlsNode.classList.toggle('active', true);
			}

			this.spacingTimer = setTimeout(function() {
				this.treeControl.setSpacing('variantsTree', newSpacing);
				this.treeControlsNode.classList.toggle('active', false);

				this.spacingTimer = null;
			}.bind(this), 100);
		},

		onViewerStartPan: function(mouseEvent) {
			var isLeftButton = mouseEvent.button === 0;

			if (isLeftButton) {
				this.panCoordinates = {x: mouseEvent.clientX, y: mouseEvent.clientY};
			}
		},

		onViewerPan: function(mouseEvent) {
			if (this.panCoordinates) {
				var containerNode = this.containerNode;
				var deltaX = mouseEvent.clientX - this.panCoordinates.x;
				var deltaY = mouseEvent.clientY - this.panCoordinates.y;

				if (deltaX) {
					containerNode.scrollLeft -= deltaX * 2;
				}

				if (deltaY) {
					containerNode.scrollTop -= deltaY * 2;
				}

				this.panCoordinates.x = mouseEvent.clientX;
				this.panCoordinates.y = mouseEvent.clientY;
			}
		},

		onViewerEndPan: function(mouseEvent) {
			this.panCoordinates = null;
		},

		onWheelEventHandler: function(wheelEvent) {
			var isShiftPressed = wheelEvent.shiftKey;
			var isCtrlPressed = wheelEvent.metaKey || wheelEvent.ctrlKey;
			var containerNode = this.containerNode;

			if (isShiftPressed) {
				containerNode.scrollLeft = containerNode.scrollLeft + wheelEvent.deltaY;
				this.stopEvent(wheelEvent);
			} else if (isCtrlPressed) {
				var scaleSliderStep = this.scaleSlider.getStep();
				var scaleDelta = (wheelEvent.deltaY > 0 ? -scaleSliderStep : scaleSliderStep);

				this.scaleSlider.setValue(this.scaleSlider.getValue() + scaleDelta * 2);
				this.stopEvent(wheelEvent);
			}
		},

		onKeyDownHandler: function(keyEvent) {
			if (keyEvent.ctrlKey) {

				switch (keyEvent.keyCode) {
					case 109:
					case 189:
						this.scaleSlider.setValue(this.scaleSlider.getValue() - this.scaleSlider.getStep());
						this.stopEvent(keyEvent);
						break;
					case 107:
					case 187:
						this.scaleSlider.setValue(this.scaleSlider.getValue() + this.scaleSlider.getStep());
						this.stopEvent(keyEvent);
						break;
					case 48:
					case 96:
						if (this.treeControl.isTreeLoaded()) {
							this.treeControl.centerView();
						}

						this.stopEvent(keyEvent);
						break;
					default:
						break;
				}
			}
		}
	});
});
