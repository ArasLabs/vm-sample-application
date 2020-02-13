define([
	'dojo/_base/declare',
	'dojo/_base/connect',
	'dijit/popup',
	'Controls/conflictsVisualizationLayer',
	'Vendors/d3.min',
],
function(declare, connect, popup, ConflictsLayer, d3Framework) {
	return declare(null, {
		containerNode: null,
		domNode: null,
		svgNode: null,
		zoomListener: null,
		_layers: null,
		_layerVisualizationParameters: null,

		constructor: function(initialArguments) {
			initialArguments = initialArguments || {};

			if (initialArguments.connectId) {
				this.containerNode = typeof initialArguments.connectId == 'string' ? document.getElementById(initialArguments.connectId) : initialArguments.connectId;
				this.svgNode = d3Framework.select(this.containerNode).append('svg');
				this.domNode = this.svgNode.append('g').node();
				this._layers = {};
				this.zoomListener = d3Framework.zoom().scaleExtent(initialArguments.scaleExtent || [0.2, 2]).on('zoom', this.zoomHandler.bind(this));

				d3Framework.select(this.containerNode).call(this.zoomListener)
					.on('.zoom',  null);
			}

			this._layerVisualizationParameters = initialArguments.layerVisualizationParameters || {};
			this.onGroupsSwitched = initialArguments.onGroupsSwitched;
		},

		cleanupView: function() {
			var currentLayer;
			var layerName;

			for (layerName in this._layers) {
				currentLayer = this._layers[layerName];
				currentLayer.destroy();
			}

			this._layers = {};
		},

		addLayer: function(layerName, visualizationLayer) {
			if (layerName, visualizationLayer) {
				if (!this._layers[layerName]) {
					var layerD3DomNode;

					this._layers[layerName] = visualizationLayer;

					visualizationLayer.setOwner(this);
					visualizationLayer.renderLayer();
					visualizationLayer.domNode.setAttribute('layerName', layerName);
				}
			}
		},

		removeLayer: function(layerName) {
			var existingLayer = this._layers[layerName];

			if (existingLayer) {
				existingLayer.setOwner(null);
				delete this._layers[layerName];
			}
		},

		getLayer: function(layerName) {
			return this._layers[layerName];
		},

		showLayer: function(layerName) {
			var existingLayer = this._layers[layerName];

			if (existingLayer) {
				existingLayer.showLayer();
				this.adjustViewBounds();
			}
		},

		hideLayer: function(layerName) {
			var existingLayer = this._layers[layerName];

			if (existingLayer) {
				existingLayer.hideLayer();
				this.adjustViewBounds();
			}
		},

		isLayerVisible: function(layerName) {
			var existingLayer = this._layers[layerName];

			return existingLayer && existingLayer.isVisible;
		},

		getDataNodeByDomNode: function(targetDomNode) {
			var foundNode = null;

			if (targetDomNode) {
				while (!foundNode && targetDomNode && targetDomNode !== this.containerNode) {
					foundNode = d3Framework.select(targetDomNode).datum();
					targetDomNode = targetDomNode.parentNode;
				}
			}

			return foundNode;
		},

		getLayerName: function(targetLayer) {
			if (targetLayer) {
				var layerName;

				for (layerName in this._layers) {
					if (targetLayer === this._layers[layerName]) {
						return layerName;
					}
				}
			}
		},

		getLayerByDomNode: function(targetDomNode) {
			if (targetDomNode) {
				var layerDomNode;

				while (targetDomNode) {
					if (targetDomNode.nodeName === 'g' && targetDomNode.getAttribute('groupType') === 'layer') {
						layerDomNode = targetDomNode;
						break;
					}

					targetDomNode = targetDomNode.parentNode;
				}

				return layerDomNode && this.getLayer(layerDomNode.getAttribute('layerName'));
			}
		},

		adjustViewBounds: function() {
			var currentScale = this.currentTransform.k;
			var viewBounds = this.getViewBounds();
			var svgDomNode = this.svgNode.node();
			var calculatedViewHeight = (viewBounds.height + 160) * currentScale;
			var calculatedViewWidth = (viewBounds.width + 200) * currentScale;
			var calculatedTopPosition = (Math.abs(viewBounds.y) + 80) * currentScale;
			var containerHeight = this.containerNode.offsetHeight - 20;
			var containerWidth = this.containerNode.offsetWidth - 20;
			var newWidth = Math.max(calculatedViewWidth, containerWidth);
			var newHeight = Math.max(calculatedViewHeight, containerHeight);

			svgDomNode.setAttribute('width', newWidth);
			svgDomNode.setAttribute('height', newHeight);

			if (calculatedViewHeight < containerHeight) {
				var viewCenterOffset = (calculatedTopPosition * 2 - calculatedViewHeight) / 2;

				this.setTransform(currentScale, (newWidth - viewBounds.width * currentScale) / 2, newHeight / 2 + viewCenterOffset);
			} else {
				this.setTransform(currentScale, (newWidth - viewBounds.width * currentScale) / 2, calculatedTopPosition);
			}
		},

		_stopEvent: function(targetEvent) {
			if (targetEvent) {
				targetEvent.preventDefault();
				targetEvent.stopPropagation();
			}
		},

		onScaleChanged: function(newScale) {
		},

		zoomHandler: function() {
			var eventTransform = d3Framework.event.transform;

			this.domNode.setAttribute('transform', eventTransform.toString());
			this.currentTransform = eventTransform;
		},

		setScale: function(newScale) {
			this.zoomListener.scaleTo(this.svgNode, newScale);
			this.adjustViewBounds();

			this.onScaleChanged(newScale);
		},

		setTransform: function(scale, offsetX, offsetY) {
			var zoomTransform = d3Framework.zoomTransform(this.svgNode.node());

			zoomTransform.k = scale;
			zoomTransform.x = offsetX;
			zoomTransform.y = offsetY;

			this.zoomListener.transform(this.svgNode, zoomTransform);
		},

		getScale: function() {
			var zoomTransform = d3Framework.zoomTransform(this.svgNode.node());
			var currentScale = zoomTransform.k;
			return currentScale;
		},

		clickHandler: function(targetNode) {
		},

		centerNode: function(targetNode) {
			var zoomTransform = d3Framework.zoomTransform(this.svgNode.node());
			var currentScale = zoomTransform.k;
			var x = -targetNode.y;
			var y = -targetNode.x;

			x = x * currentScale + this.containerNode.clientWidth / 2;
			y = y * currentScale + this.containerNode.clientHeight / 2;

			zoomTransform = zoomTransform.translate(x, y);
			this.zoomListener.transform(this.svgNode, zoomTransform);
		},

		createConflicts: function(conflicts) {
			var conflictsLayer = new ConflictsLayer({data: conflicts});

			this.addLayer('conflicts', conflictsLayer);

			this.centerView();
		},

		getViewBounds: function() {
			var currentLayer;
			var layerBounds;
			var viewBounds;
			var layerName;

			for (layerName in this._layers) {
				currentLayer = this._layers[layerName];

				if (currentLayer.isVisible) {
					layerBounds = currentLayer.getActualLayerBounds();

					if (layerBounds) {
						if (!viewBounds) {
							viewBounds = layerBounds;
						} else {
							viewBounds.x = Math.min(viewBounds.x, layerBounds.x);
							viewBounds.y = Math.min(viewBounds.y, layerBounds.y);
							viewBounds.width = Math.max(viewBounds.width, layerBounds.width);
							viewBounds.height = Math.max(viewBounds.height, layerBounds.height);
						}
					}
				}
			}

			return viewBounds || this.svgNode.node().getBBox();
		},

		centerView: function() {
			var viewBounds = this.getViewBounds();
			var containerBounds = this.containerNode.getBoundingClientRect();
			var requiredScale = Math.min((containerBounds.width - 300) / viewBounds.width, (containerBounds.height - 200) / viewBounds.height);

			this.setScale(requiredScale);
		}
	});
});
