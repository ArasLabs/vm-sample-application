define([
	'dojo/_base/declare',
	'Vendors/d3.min',
	'Controls/VariantsTree/Layers/VisualizationLayer'
],
function(declare, d3Framework, VisualizationLayer) {
	return declare('Aras.Controls.CFG.ConflictsVisualizationLayer', [VisualizationLayer], {
		treeLayout: null,
		_treeHeight: 0,
		visualization: {
			transitionDuration: 150
		},
		svg: null,
		canvas: null,
		allConflicts: null,
		selectedConflictIndex: undefined,
		selectedConfigurationIndexes: [],
		variantBoxes: [],
		sourceLabels: [],
		conflictBounds: [],
		drawingSettings: {
			headerBoxHeight: 200,
			sourcePadding: 5,
			configurationBoxHeight: 50,
			variantBoxHeight: 50,
			variantBoxWidth: 250,
			variantPadding: 10,
			verticalGap: 5,
			horizontalGap: 20,
			arrowLength: 150,
			arrowMinWidth: 500,
			activeVariantBackground: '#D8D8D8',
			activeVariantForeground: 'black',
			passiveVariantBackground: 'white',
			passiveVariantForeground: 'silver',
			sourceHeaderBackground: '#D8D8D8', // === activeVariantBackground
			sourceHeaderForeground: 'black', // === activeVariantForeground
			borderColor: 'black',
			borderThickness: '1',
			arrowColor: '#D8D8D8',
			trueColor: 'green',
			trueSymbol: '+',
			falseColor: 'red',
			falseSymbol: '-',
			conflictForegroundColor: 'transparent',
			conflictBorderColor: 'red',
			conflictBorderIndent: 5,
			fontSize: 14,
			symbolFontSize: 40,
			longTextLength: 30,
			longTextSize: 11,
		},

		constructor: function(initialArguments) {
		},

		_initializeProperties: function(initialArguments) {
			this.inherited(arguments);

			this.treeLayout = d3Framework.tree().nodeSize([2, 200]).separation(function(a, b) {
				return a.parent === b.parent ? ((a.children && b.children) || a.depth === this._treeHeight ? 10 : 30) : 20;
			}.bind(this));
		},

		_preprocessData: function(layerData) {
			var preparedData = layerData ? d3Framework.hierarchy(layerData) : this.generateTreeData(100, 5)[0];

			this._treeHeight = preparedData.height;
			this.treeLayout(preparedData);
			return preparedData;
		},

		_getTextTransform: function(d) {
			return 'translate(' + (d.children || d.data.collapsed ? '-8,-8)' : '7,4)');
		},

		_getGroupTransform: function(d) {
			return 'translate(' + (d.y + ',' + d.x) + ')';
		},

		_getGroupTransformNearParent: function(d) {
			return 'translate(' + ((d.y - 200) + ',' + d.x) + ') scale(0.1)';
		},

		_getLinkCoordinatesStart: function(d) {
			var points = [
				{x: -15, y: 0},
				{x: -16, y: 0},
				{x: -17, y: 0}
			];

			return 'M ' + points[0].x + ' ' + points[0].y + ' H ' + points[1].x + ' L ' + points[2].x + ' ' + points[2].y;
		},

		_getLinkCoordinatesDefault: function(dataItem) {
			dataItem = dataItem.target || dataItem;

			if (dataItem.depth) {
				var parentItem = dataItem.parent;
				var parentOffsetX = parentItem.y - dataItem.y;
				var parentOffsetY = parentItem.x - dataItem.x;
				var angle = Math.atan2(40, parentOffsetY);

				return 'M -15 0' +
					' H ' + (parentOffsetX + 40) +
					' L ' + (parentOffsetX + Math.round(15 * Math.sin(angle))) + ' ' + (parentOffsetY - Math.round(15 * Math.cos(angle)));
			}
		},

		getLeafDataNodes: function() {
			return this.layerData ? this.layerData.leaves() : [];
		},

		clickPrevConflict: function() {
			if (this.selectedConflictIndex > 0) {
				this.selectedConflictIndex--;
				this.renderSelectedConflict();
				this.ownerControl.centerView();
			}
		},

		clickNextConflict: function() {
			if (this.selectedConflictIndex < (this.allConflicts.length - 1)) {
				this.selectedConflictIndex++;
				this.renderSelectedConflict();
				this.ownerControl.centerView();
			}
		},

		clickPrevConfiguration: function() {
			var conflict = this.allConflicts[this.selectedConflictIndex];
			var sourceIndex = d3Framework.event.currentTarget.getAttribute('sourceIndex');
			var source = conflict.sources[sourceIndex];
			var configurationIndex = this.selectedConfigurationIndexes[sourceIndex];
			if (configurationIndex > 0) {
				configurationIndex--;
				this.selectedConfigurationIndexes[sourceIndex] = configurationIndex;
				this.updateConflictConfiguration(conflict, sourceIndex, configurationIndex);
				this.updateConfigurationIndex(conflict, sourceIndex, configurationIndex);
				this.highlightConflictRows();
			}
		},

		clickNextConfiguration: function() {
			var conflict = this.allConflicts[this.selectedConflictIndex];
			var sourceIndex = d3Framework.event.currentTarget.getAttribute('sourceIndex');
			var source = conflict.sources[sourceIndex];
			var configurationIndex = this.selectedConfigurationIndexes[sourceIndex];
			if (configurationIndex < (source.configurations.length - 1)) {
				configurationIndex++;
				this.selectedConfigurationIndexes[sourceIndex] = configurationIndex;
				this.updateConflictConfiguration(conflict, sourceIndex, configurationIndex);
				this.updateConfigurationIndex(conflict, sourceIndex, configurationIndex);
				this.highlightConflictRows();
			}
		},

		renderHandler: function() {
			this.svg = d3Framework.select(this.contentNode);
			this.allConflicts = this.layerData.descendants()[0].data;
			if (this.allConflicts.length > 0) {
				this.selectedConflictIndex = 0;
				this.renderSelectedConflict();
			}
		},

		renderConflictSwitchingArrow: function(fromX, toX, itemsCount) {
			var topY = 0;
			var bottomY = this.drawingSettings.configurationBoxHeight +
						this.drawingSettings.verticalGap * 2 +
						this.drawingSettings.headerBoxHeight +
						itemsCount * this.drawingSettings.variantBoxHeight;
			var arrowLegHalfWidth = Math.max((bottomY - topY) * 0.2, this.drawingSettings.variantBoxHeight / 2);
			var arrowCenterY = (topY + bottomY) / 2;
			var arrowGroundingX = fromX + (toX - fromX) / 2;
			var arrowTopDashY = arrowCenterY - arrowLegHalfWidth;
			var arrowBottomDashY = arrowCenterY + arrowLegHalfWidth;
			var points = '';

			points += (fromX + ',' + arrowTopDashY + ' ');
			points += (arrowGroundingX + ',' + arrowTopDashY + ' ');
			points += (arrowGroundingX + ',' + topY + ' ');
			points += (toX + ',' + arrowCenterY + ' ');
			points += (arrowGroundingX + ',' + bottomY + ' ');
			points += (arrowGroundingX + ',' + arrowBottomDashY + ' ');
			points += (fromX + ',' + arrowBottomDashY);

			var arrowItself = this.canvas.append('polygon')
				.style('fill', this.drawingSettings.arrowColor)
				.style('stroke', this.drawingSettings.borderColor)
				.style('stroke-width', this.drawingSettings.borderThickness)
				.attr('points', points);
			return {
				polygon: arrowItself,
				width: Math.abs(toX - fromX),
				height: arrowLegHalfWidth * 2,
				translate: 'translate(' + (Math.min(fromX, toX) + Math.abs(toX - fromX) / 3 + 25) + ',' + (arrowCenterY - this.drawingSettings.variantBoxHeight / 8) + ')'
			};
		},

		renderSelectedConflict: function() {
			if (this.canvas) {
				this.canvas.remove();
			}
			this.canvas = this.svg.append('g');
			this.variantBoxes = [];
			this.sourceLabels = [];

			var conflict = this.allConflicts[this.selectedConflictIndex];
			if (this.allConflicts.length > 1) {
				var conflictWidthWithArrows = conflict.sources.length * this.drawingSettings.variantBoxWidth + this.drawingSettings.arrowLength * 2 +
					this.drawingSettings.horizontalGap * (conflict.sources.length + 1);

				// draw next/previous conflict buttons
				var arrow = this.renderConflictSwitchingArrow(this.drawingSettings.arrowLength, 0, conflict.terms.length);
				arrow.polygon.on('click', this.clickPrevConflict.bind(this));
				arrow.polygon.append('svg:title').text('Show previous found conflict');
				this.canvas.append('text')
					.attr('width', arrow.width)
					.attr('height', arrow.height)
					.attr('text-anchor', 'middle')
					.attr('font-size', this.drawingSettings.fontSize)
					.style('color', this.drawingSettings.sourceHeaderForeground)
					.text('< Previous conflict')
					.attr('transform', arrow.translate)
					.on('click', this.clickNextConflict.bind(this));
				arrow = this.renderConflictSwitchingArrow(conflictWidthWithArrows - this.drawingSettings.arrowLength, conflictWidthWithArrows, conflict.terms.length);
				arrow.polygon.on('click', this.clickNextConflict.bind(this));
				arrow.polygon.append('svg:title').text('Show next found conflict');
				this.canvas.append('text')
					.attr('width', arrow.width)
					.attr('height', arrow.height)
					.attr('text-anchor', 'middle')
					.attr('font-size', this.drawingSettings.fontSize)
					.style('color', this.drawingSettings.sourceHeaderForeground)
					.text('Next conflict >')
					.attr('transform', arrow.translate)
					.on('click', this.clickNextConflict.bind(this));
			} else {
				this.drawingSettings.arrowLength = 0;
			}

			// draw sources
			this.selectedConfigurationIndexes = [];
			for (var s = 0; s < conflict.sources.length; s++) {
				this.selectedConfigurationIndexes.push(0);
				this.renderConflictSource(conflict, conflict.sources[s]);
			}

			// select direct conflicts
			this.highlightConflictRows();

			//wrap text
			this.canvas.selectAll('text').call(this.wrapSvgText.bind(this));
		},

		renderConflictSource: function(conflict, source) {
			var sourceIndex = conflict.sources.indexOf(source);
			var x = sourceIndex * this.drawingSettings.variantBoxWidth + this.drawingSettings.arrowLength + this.drawingSettings.horizontalGap * (sourceIndex + 1);
			this.variantBoxes.push([]);

			// draw next/previous configuration buttons
			var arrowsTop = this.drawingSettings.headerBoxHeight + this.drawingSettings.verticalGap;
			var arrowsBottom = this.drawingSettings.headerBoxHeight + this.drawingSettings.verticalGap + this.drawingSettings.configurationBoxHeight;
			var arrowsCenterY = (arrowsTop + arrowsBottom) / 2;
			var arrowWidth = this.drawingSettings.variantBoxHeight * 2 / 3;
			var arrowRight = x + this.drawingSettings.variantBoxWidth;
			var arrowPrev = '' + x + ',' + arrowsCenterY + ' ' + (x + arrowWidth) + ',' + arrowsTop + ' ' + (x + arrowWidth) + ',' + arrowsBottom;
			var arrowNext = '' + (arrowRight - arrowWidth) + ',' + arrowsTop + ' ' + arrowRight + ',' + arrowsCenterY + ' ' + (arrowRight - arrowWidth) +
							',' + arrowsBottom;
			this.canvas.append('polygon')
				.style('fill', this.drawingSettings.arrowColor)
				.style('stroke', this.drawingSettings.borderColor)
				.style('stroke-width', this.drawingSettings.borderThickness)
				.attr('points', arrowPrev)
				.on('click', this.clickPrevConfiguration.bind(this))
				.attr('sourceIndex', sourceIndex)
				.append('svg:title')
				.text('Show previous valid configuration');
			this.canvas.append('polygon')
				.style('fill', this.drawingSettings.arrowColor)
				.style('stroke', this.drawingSettings.borderColor)
				.style('stroke-width', this.drawingSettings.borderThickness)
				.attr('points', arrowNext)
				.on('click', this.clickNextConfiguration.bind(this))
				.attr('sourceIndex', sourceIndex)
				.append('svg:title')
				.text('Show next valid configuration');
			var sourceLabel = this.canvas.append('text')
				.attr('width', this.drawingSettings.variantBoxWidth)
				.attr('height', this.drawingSettings.headerBoxHeight)
				.attr('text-anchor', 'middle')
				.attr('font-size', this.drawingSettings.fontSize)
				.style('color', this.drawingSettings.sourceHeaderForeground)
				.attr('transform', 'translate(' + (x + this.drawingSettings.horizontalGap + arrowWidth * 3 / 2 + 50) + ',' + (arrowsTop + 30) + ')');
			this.sourceLabels.push(sourceLabel);
			var configurationIndex = this.selectedConfigurationIndexes[sourceIndex];
			this.updateConfigurationIndex(conflict, sourceIndex, configurationIndex);

			// draw configuration header (propositional form)
			var y = 0;
			var transform = 'translate(' + (sourceIndex * this.drawingSettings.variantBoxWidth) + ', 0)';
			this.canvas.append('rect')
				.attr('width', this.drawingSettings.variantBoxWidth)
				.attr('height', this.drawingSettings.headerBoxHeight)
				.style('fill', this.drawingSettings.sourceHeaderBackground)
				.style('stroke', this.drawingSettings.borderColor)
				.attr('transform', 'translate(' + x + ', ' + y + ')');
			x += 100;
			y += 25;
			this.canvas.append('text')
				.attr('width', this.drawingSettings.variantBoxWidth - this.drawingSettings.sourcePadding * 2)
				.attr('height', this.drawingSettings.headerBoxHeight)
				.attr('text-anchor', 'middle')
				.attr('font-size', this.drawingSettings.fontSize)
				.style('color', this.drawingSettings.sourceHeaderForeground)
				.text(source.propositionalForm)
				.attr('transform', 'translate(' + (x + this.drawingSettings.horizontalGap + this.drawingSettings.sourcePadding) + ', ' + y + ')');

			// draw configurations
			if (source.configurations.length > 0) {
				this.renderConflictConfiguration(conflict, source, source.configurations[configurationIndex]);
			}
		},

		renderConflictConfiguration: function(conflict, source, configuration) {
			for (var t = 0; t < conflict.terms.length; t++) {
				this.renderConflictTerm(conflict, source, configuration, conflict.terms[t], t);
			}
		},

		renderConflictTerm: function(conflict, source, configuration, term, termIndex) {
			var sourceIndex = conflict.sources.indexOf(source);
			var x = sourceIndex * this.drawingSettings.variantBoxWidth + this.drawingSettings.arrowLength/*because of left-arrow*/ +
					this.drawingSettings.horizontalGap * (sourceIndex + 1);
			var y = termIndex * this.drawingSettings.variantBoxHeight + this.drawingSettings.headerBoxHeight + this.drawingSettings.configurationBoxHeight +
					this.drawingSettings.verticalGap * 2;
			var boundingRect = this.canvas.append('rect')
				.attr('width',this.drawingSettings.variantBoxWidth)
				.attr('height', this.drawingSettings.variantBoxHeight)
				.style('stroke', this.drawingSettings.borderColor)
				.attr('transform', 'translate(' + x + ', ' + y + ')');
			x += (this.drawingSettings.variantBoxWidth / 2);
			y += (this.drawingSettings.variantBoxHeight / 2);
			var text = term.variableId + ' = ' + term.constantId;
			var textSize;
			var textY;
			var isActive = typeof configuration[termIndex] !== 'undefined';
			if (text.length < this.drawingSettings.longTextLength) {
				textSize = this.drawingSettings.fontSize;
				textY = y + 5;
			} else {
				textSize = this.drawingSettings.longTextSize;
				textY = y - 10;
			}
			var textField = this.canvas.append('text')
				.attr('width', this.drawingSettings.variantBoxWidth - this.drawingSettings.variantPadding * 2 - (!isActive ? 0 : 30)) /* 30px is a padding for the sign */
				.attr('height', this.drawingSettings.variantBoxHeight)
				.attr('text-anchor', 'middle')
				.attr('font-size', textSize)
				.text(text)
				.attr('transform', 'translate(' + (!isActive ? x : x - 15) + ', ' + textY + ')');
			var valueSign = this.canvas.append('text')
				.attr('width', this.drawingSettings.variantBoxWidth)
				.attr('height', this.drawingSettings.variantBoxHeight)
				.attr('text-anchor', 'start')
				.attr('font-size', this.drawingSettings.symbolFontSize)
				.attr('transform', 'translate(' + (x + 90) + ', ' + (y + 15) + ')');
			this.variantBoxes[sourceIndex].push({
				boundingRect: boundingRect,
				textField: textField,
				valueSign: valueSign
			});
			this.updateConflictTerm(configuration, sourceIndex, termIndex);
		},

		updateConflictTerm: function(configuration, sourceIndex, termIndex) {
			var isActive = typeof configuration[termIndex] !== 'undefined';
			var isTrue = isActive && configuration[termIndex];
			var variantBox = this.variantBoxes[sourceIndex][termIndex];
			variantBox.boundingRect.style('fill', isActive ? this.drawingSettings.activeVariantBackground : this.drawingSettings.passiveVariantBackground);
			variantBox.textField.style('fill', isActive ? this.drawingSettings.activeVariantForeground : this.drawingSettings.passiveVariantForeground);
			if (isActive) {
				variantBox.valueSign
					.style('fill', isTrue ? this.drawingSettings.trueColor : this.drawingSettings.falseColor)
					.text(isTrue ? this.drawingSettings.trueSymbol : this.drawingSettings.falseSymbol);
			} else {
				variantBox.valueSign.text('');
			}
		},

		updateConflictConfiguration: function(conflict, sourceIndex, configurationIndex) {
			var source = conflict.sources[sourceIndex];
			var configuration = source.configurations[configurationIndex];
			for (var t = 0; t < conflict.terms.length; t++) {
				this.updateConflictTerm(configuration, sourceIndex, t);
			}
		},

		updateConfigurationIndex: function(conflict, sourceIndex, configurationIndex) {
			this.sourceLabels[sourceIndex].text('' + (configurationIndex + 1) + ' of ' +  conflict.sources[sourceIndex].configurations.length);
		},

		highlightConflictRows: function() {
			for (var i = 0; i < this.conflictBounds.length; i++) {
				this.conflictBounds[i].remove();
			}
			this.conflictBounds = [];
			var conflict = this.allConflicts[this.selectedConflictIndex];
			var conflictBorderWidth = conflict.sources.length * this.drawingSettings.variantBoxWidth +
									(conflict.sources.length - 1) * this.drawingSettings.horizontalGap +
									this.drawingSettings.conflictBorderIndent * 2;
			for (var t = 0; t < conflict.terms.length; t++) {
				var value = undefined;
				var error = false;
				for (var s = 0; s < conflict.sources.length; s++) {
					var configurationIndex = this.selectedConfigurationIndexes[s];
					var cValue = conflict.sources[s].configurations[configurationIndex][t];
					if (cValue !== undefined) {
						if (value !== undefined) {
							if (value !== cValue) {
								error = true;
								break;
							}
						} else {
							value = cValue;
						}
					}
				}
				if (error) {
					var variantLeftX = this.drawingSettings.arrowLength + this.drawingSettings.horizontalGap - this.drawingSettings.conflictBorderIndent;
					var variantRightX = variantLeftX + conflict.sources.length * this.drawingSettings.variantBoxWidth +
										(conflict.sources.length - 1) * this.drawingSettings.horizontalGap + 2 * this.drawingSettings.conflictBorderIndent;
					var variantTopY = this.drawingSettings.headerBoxHeight + this.drawingSettings.configurationBoxHeight +
										this.drawingSettings.verticalGap * 2 + t * this.drawingSettings.variantBoxHeight -
										this.drawingSettings.conflictBorderIndent;
					var variantBottomY = variantTopY + this.drawingSettings.variantBoxHeight + 2 * this.drawingSettings.conflictBorderIndent;
					this.conflictBounds.push(this.canvas.append('polygon')
						.style('fill', this.drawingSettings.conflictForegroundColor)
						.style('stroke', this.drawingSettings.conflictBorderColor)
						.style('stroke-width', '3')
						.style('stroke-dasharray', '9, 5')
						.attr('points', '' + variantLeftX + ',' + variantBottomY + ' ' + variantLeftX + ',' + variantTopY + ' ' + variantRightX + ',' +
								variantTopY + ' ' + variantRightX + ',' + variantBottomY + ''));
				}
			}
		},

		wrapSvgText: function(text) {
			var self = this;
			var textOverflowEllipsis = '...';
			text.each(function() {
				var text = d3Framework.select(this);
				var originalFullText = text.text();
				var blockWidth = parseFloat(text.attr('width') || self.drawingSettings.variantBoxWidth) - 2 * self.drawingSettings.sourcePadding;
				var blockHeight = parseFloat(text.attr('height') || self.drawingSettings.variantBoxHeight);
				var blockFontSize = parseFloat(text.attr('font-size') || self.drawingSettings.fontSize);
				if (self.getTextWidth(originalFullText, blockFontSize) >= blockWidth) {
					text.text(null);
					var isTooltipRequired = false;
					var lineNumber = 0;
					var lineHeight = 1.1 * blockFontSize;
					var lineNumberMax = Math.max(Math.floor(blockHeight / lineHeight) - 1, 1);
					var y = text.attr('y') || '0';
					var dy = parseFloat(text.attr('dy') || '0');
					var processedText = originalFullText;
					while (lineNumber < lineNumberMax && processedText.length > 0) {
						var singleLineText = processedText;
						var singleLineTextWidth = self.getTextWidth(singleLineText, blockFontSize);
						while (singleLineTextWidth >= blockWidth) {
							singleLineText = singleLineText.slice(0, -1);
							singleLineTextWidth = self.getTextWidth(singleLineText, blockFontSize);
						}
						if (lineNumber === lineNumberMax - 1 && processedText.slice(singleLineText.length).length > 0) {
							singleLineText = singleLineText.slice(0, -3) + textOverflowEllipsis;
							isTooltipRequired = true;
						} else {
							processedText = processedText.slice(singleLineText.length);
						}
						text.append('tspan').attr('x', 0).attr('y', y).attr('dy', lineNumber++ * lineHeight + dy + 'px').text(singleLineText);
					}
					if (isTooltipRequired) {
						text.raise().append('svg:title').text(originalFullText);
					}
				}
			});
		},

		getTextWidth: function(text, fontSize) {
			var canvas = this.getTextWidth.canvas || (this.getTextWidth.canvas = document.createElement('canvas'));
			var context = canvas.getContext('2d');
			context.font = fontSize + 'px sans-serif';
			var metrics = context.measureText(text);
			return metrics.width;
		},

		generateTreeData: function(elementCount, childrenCount, targetLevelElements) {
			var i;
			var j;

			targetLevelElements = targetLevelElements || [{id: 'root', name: 'root', children: []}];
			nextLevelElements = [];

			if (elementCount) {
				var elementChildren;
				var expectedChildrenCount;
				var currentElement;
				var newElement;

				for (i = 0; i < targetLevelElements.length; i++) {
					currentElement = targetLevelElements[i];

					expectedChildrenCount = elementCount - childrenCount;
					expectedChildrenCount = expectedChildrenCount >= 0 ? childrenCount : expectedChildrenCount;

					if (expectedChildrenCount > 0) {
						elementChildren = currentElement.children = [];

						for (j = 0; j < expectedChildrenCount; j++) {
							newElement = {id: elementCount.toString(), name: 'Element-' + elementCount};
							elementChildren.push(newElement);
							nextLevelElements.push(newElement);

							elementCount--;
						}
					}
				}

				this.generateTreeData(elementCount, childrenCount, nextLevelElements);
			}

			return targetLevelElements;
		},

		collapseNode: function(targetNode) {
			if (targetNode) {
				targetNode.data.collapsed = true;
				targetNode._children = targetNode.children;
				targetNode.children = null;

				this.invalidateLayer(targetNode);
			}
		},

		expandNode: function(targetNode) {
			if (targetNode) {
				targetNode.data.collapsed = false;
				targetNode.children = targetNode._children;
				targetNode._children = null;

				this.invalidateLayer(targetNode);
			}
		},

		_dataItemComparer: function(dataItem) {
			return dataItem.data.id;
		},

		invalidateLayer: function(targetNode) {
			var d3ContenNode = d3Framework.select(this.contentNode);
			var allNodes = d3ContenNode.selectAll('.Node');
			var transitionDuration = this.visualization.transitionDuration;
			var hiddenDataItems;
			var visibleDomNodes;
			var targetDomNode;
			var nodeEnter;
			var currentNode;
			var i;

			this.treeLayout(this.layerData);

			visibleDomNodes = allNodes.data(this.layerData.descendants(), this._dataItemComparer);
			hiddenDataItems = visibleDomNodes.exit().data();

			// hiding and deleting collapsed nodes
			visibleDomNodes.exit()
				.transition().duration(transitionDuration)
				.style('opacity', '0')
				.attr('transform', this._getGroupTransformNearParent)
				.remove();

			for (i = 0; i < hiddenDataItems.length; i++) {
				currentNode = hiddenDataItems[i];
				currentNode.x = 0;
				currentNode.y = 0;
			}

			// creating expanded nodes
			nodeEnter = visibleDomNodes.enter().append('g')
				.attr('class', this.calculateNodeClasses)
				.attr('transform', this._getGroupTransformNearParent)
				.on('mousedown', this.clickHandler.bind(this));

			nodeEnter.append('circle')
				.attr('r', this.calculateCircleRadius);

			nodeEnter.append('path')
				.attr('d', this._getLinkCoordinatesDefault);

			nodeEnter.append('text')
				.attr('transform', this._getTextTransform)
				.text(function(d) { return d.data.itemData.name; });

			nodeEnter.transition().duration(transitionDuration)
				.attr('transform', this._getGroupTransform);

			// positioning visible nodes
			visibleDomNodes.transition().duration(transitionDuration)
				.style('opacity', '1')
				.attr('transform', this._getGroupTransform);

			visibleDomNodes.selectAll('path')
				.transition().duration(transitionDuration)
				.attr('d', this._getLinkCoordinatesDefault);

			// updating target node properties
			targetDomNode = visibleDomNodes.filter(function(d) { return d.data.id === targetNode.data.id; });
			targetDomNode.attr('class', this.calculateNodeClasses);
			targetDomNode.select('circle')
				.attr('r', this.calculateCircleRadius);

			this._updateLayerBounds();
			this.raiseEvent('onResizeLayer');
		},

		calculateCircleRadius: function(targetNode) {
			var nodeData = targetNode.data;

			if (targetNode.children || nodeData.collapsed) {
				return nodeData.collapsed ? 5 : 8;
			} else {
				return 3;
			}
		},

		calculateNodeClasses: function(targetNode) {
			var nodeClasses = ['Node'];
			var nodeData = targetNode.data;

			if (!targetNode.children && !nodeData.collapsed) {
				nodeClasses.push('LeafNode');
			}

			if (nodeData.collapsed) {
				nodeClasses.push('CollapsedNode');
			}

			return nodeClasses.join(' ');
		}
	});
});
