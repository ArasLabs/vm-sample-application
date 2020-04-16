define([
	'dojo/_base/declare',
	'dojo/_base/connect',
	'Modules/aras.innovator.VariantManagementSample/Scripts/variantTree/labeledRangeSlider',
	'Controls/conflicts'
],
function(declare, connect, ScaleSlider, Conflicts) {
	return declare(null, {
		scopeId: null,
		scopeType: null,
		effectiveAt: null,
		conflictsItem: null,
		variableNames: null,
		constantNames: null,
		scaleSlider: null,
		ruleSources: null,
		variableSources: null,
		conflictsControl: null,
		conflictsControlParentNode: null,
		containerNode: null,
		conflictsControlsNode: null,
		infoNode: null,
		scaleTimer: null,
		panCoordinates: null,
		settings: null,
		resizeTimer: null,

		constructor: function(initialParameters) {
			this.scopeId = initialParameters.scopeItem.getID();
			this.scopeType = initialParameters.scopeItem.getType();
			this.effectiveAt = initialParameters.scopeItem.getProperty('effectiveAt');
			this.conflictsItem = initialParameters.conflictsItem;
			this.variableNames = initialParameters.variableNames;
			this.constantNames = initialParameters.constantNames;
			this.scaleSlider = new ScaleSlider({
				connectId: 'conflictsControls', label: 'Scale:', minValue: 0.1, maxValue: 2, step: 0.02, value: 1,
				valueFormatter: function(sliderValue) { return Math.floor(sliderValue * 100) + '%'; },
			});
			this.ruleSources = {};
			this.variableSources = {};

			this.conflictsControl = new Conflicts({
				connectId: 'conflictsContainer',
				layerVisualizationParameters: {
					'groups': {sourceMargin: 75}
				}
			});
			this.conflictsControlParentNode = this.conflictsControl.getParentNode();
			this.containerNode = document.querySelector('#conflictsContainer');
			this.conflictsControlsNode = document.querySelector('#conflictsControls');
			this.infoNode = document.querySelector('#variantTreeInfo');

			this.settings = {};
		},

		init: function() {
			this.scaleSlider.domNode.addEventListener('onValueChanged', this.onScaleSliderChange.bind(this), false);
			connect.connect(this.conflictsControl, 'onScaleChanged', this.onTreeScaleChange.bind(this));

			window.addEventListener('resize', this.onWindowResize.bind(this));

			// attach pan event listeners to the viewer svg node
			this.conflictsControlParentNode.addEventListener('mousedown', this.onViewerStartPan.bind(this));
			this.conflictsControlParentNode.addEventListener('selectstart', this.onViewerSelectStart.bind(this));
			document.addEventListener('mousemove', this.onViewerPan.bind(this));
			document.addEventListener('mouseleave', this.onViewerEndPan.bind(this));
			document.addEventListener('mouseup', this.onViewerEndPan.bind(this));
			document.addEventListener('keydown', this.onKeyDownHandler.bind(this));
			document.oncontextmenu = function(menuEvent) {
				menuEvent.preventDefault();
			};

			window.addEventListener('beforeunload', this.onBeforeUnload.bind(this));
			this.containerNode.addEventListener('wheel', this.onWheelEventHandler.bind(this));

			this.loadView();
		},

		loadView: function() {
			var conflicts = this.parseConflicts(this.conflictsItem);
			if (this.conflictsControl.isLoaded()) {
				this.conflictsControl.setTreeLayerData('conflicts', conflicts);
				this.conflictsControl.centerView();
			} else {
				this.conflictsControl.loadConflicts(conflicts);
			}
		},

		parseConflicts: function(conflictsItem) {
			var conflicts = [];
			var conflictNodes = conflictsItem.dom.selectNodes(SoapConstants.EnvelopeBodyXPath + '/Result/Conflict');
			for (var i = 0; i < conflictNodes.length; i++) {
				var conflictNode = conflictNodes[i];
				var conflict = this.parseConflict(conflictNode);
				conflicts.push(conflict);
			}
			return conflicts;
		},

		parseConflict: function(conflictNode) {
			// create empty conflict
			var conflict = {
				sources: [],
				terms: [],
			};

			// parse sources
			for (var i = 0; i < conflictNode.childNodes.length; i++) {
				var sourceNode = conflictNode.childNodes[i];
				var source = this.parseSource(sourceNode);
				conflict.sources.push(source);
			}

			// extract variables
			var variables = {};
			for (var s = 0; s < conflict.sources.length; s++) {
				var terms = conflict.sources[s].terms;
				for (var t = 0; t < terms.length; t++) {
					var termVariableId = terms[t].variableId;
					var constantId = terms[t].constantId;
					if (!variables[termVariableId]) {
						variables[termVariableId] = [];
					}
					if (variables[termVariableId].indexOf(constantId) < 0) {
						variables[termVariableId].push(constantId);
					}
				}
			}

			// extract all conflict contants, grouped by variables
			var variableIds = Object.keys(variables);
			for (var v = 0; v < variableIds.length; v++) {
				var variableId = variableIds[v];
				var constants = variables[variableId];
				for (var h = 0; h < constants.length; h++) {
					conflict.terms.push({
						variableId: variableId,
						constantId: constants[h],
					});
				}
			}

			// update certain conflicts according to new terms list
			for (var r = 0; r < conflict.sources.length; r++) {
				var oldSource = conflict.sources[r];
				var newSource = {
					propositionalForm: oldSource.propositionalForm,
					configurations: []
				};
				var newIndexes = [];
				for (var u = 0; u < oldSource.terms.length; u++) {
					var newIndex = -1;
					var oldTerm = oldSource.terms[u];
					for (var newT = 0; newT < conflict.terms.length; newT++) {
						if (conflict.terms[newT].variableId == oldTerm.variableId && conflict.terms[newT].constantId == oldTerm.constantId) {
							newIndex = newT;
							break;
						}
					}
					newIndexes.push(newIndex);
				}
				for (var c = 0; c < oldSource.configurations.length; c++) {
					var oldConfiguration = oldSource.configurations[c];
					var newConfiguration = [];
					for (var n = 0; n < conflict.terms.length; n++) {
						newConfiguration.push(undefined);
					}
					for (var j = 0; j < oldConfiguration.length; j++) {
						newConfiguration[newIndexes[j]] = oldConfiguration[j];
					}
					newSource.configurations.push(newConfiguration);
				}
				conflict.sources[r] = newSource;
			}

			// change ids to names
			for (var q = 0; q < conflict.terms.length; q++) {
				var term = conflict.terms[q];
				var newTerm = {
					variableId: this.variableNames[term.variableId] || term.variableId,
					constantId: this.constantNames[term.constantId] || term.constantId
				};
				conflict.terms[q] = newTerm;
			}
			return conflict;
		},

		parseSource: function(sourceNode) {
			// check type of conflict source and try to get it from cache
			var sourceType = sourceNode.getAttribute('source');
			var sourceId;
			var sourceList;
			var isCachable = sourceType == 'variable' || sourceType == 'rule'; // sourceType != 'condition' && sourceType != 'missinginscope'
			if (isCachable) {
				sourceId = sourceNode.getAttribute('id');
				if (sourceType == 'variable') {
					sourceList = this.variableSources;
				} else if (sourceType == 'rule') {
					sourceList = this.ruleSources;
				}
				if (sourceList[sourceId]) {
					return sourceList[sourceId];
				}
			}

			// request for conflict source variants and configurations
			var resultSource = {
				propositionalForm: sourceNode.getAttribute('propositionalForm'),
				terms: [],
				configurations: [],
			};
			var describeItem = aras.newIOMItem('Method', 'cfg_GetExpressionTruthTable'); // sourceNode.selectNodes('text()')
			describeItem.setAttribute('responseFormat', 'XML');
			describeItem.setProperty('condition', '');
			var conditionPrepertyNode = describeItem.node.selectSingleNode('condition');
			//There is the IR-056720 known issue of Configurator Services API, when a simple term is passed as a condition
			//the cfg_GetExpressionTruthTable API method returns wrong result. That's why the workaround is applied here, namely, any expression is wrapped into <AND>
			conditionPrepertyNode.text = sourceNode.selectSingleNode('text()').data.replace(/(<expression>)(.*)(<\/expression>)/i, '$1<AND>$2</AND>$3');
			describeItem = describeItem.apply();
			var describeNode = describeItem.dom.selectSingleNode('descendant::Result');
			var termNodes = describeNode.selectNodes('truth-table-meta/terms/term');
			for (var v = 0; v < termNodes.length; v++) {
				var cdata = termNodes[v].selectSingleNode('text()');
				var variablePattern = 'variable id="';
				var constantPattern = 'named-constant id="';
				var variableIdStartIndex = cdata.text.indexOf(variablePattern) + variablePattern.length;
				var constantIdStartIndex = cdata.text.indexOf(constantPattern) + constantPattern.length;
				var variableIdEndIndex = cdata.text.indexOf('"', variableIdStartIndex);
				var constantIdEndIndex = cdata.text.indexOf('"', constantIdStartIndex);
				var variableId = cdata.text.substring(variableIdStartIndex, variableIdEndIndex);
				var constantId = cdata.text.substring(constantIdStartIndex, constantIdEndIndex);
				resultSource.terms.push({'variableId': variableId, 'constantId': constantId});
			}
			var configurationsNodes = describeNode.selectNodes('truth-table/combination');
			for (var c = 0; c < configurationsNodes.length; c++) {
				var configuration = [];
				var configurationTermNodes = configurationsNodes[c].selectNodes('term');
				for (var q = 0; q < configurationTermNodes.length; q++) {
					configuration.push(configurationTermNodes[q].text == '1');
				}
				resultSource.configurations.push(configuration);
			}

			// store result in cache
			if (isCachable) {
				sourceList[sourceId] = resultSource;
			}

			return resultSource;
		},

		onWindowResize: function() {
			if (this.conflictsControl.isViewCreated) {
				if (this.resizeTimer) {
					clearTimeout(this.resizeTimer);
				}

				this.resizeTimer = setTimeout(function() {
					this.conflictsControl.adjustViewBounds();
					this.resizeTimer = null;
				}.bind(this), 100);
			}
		},

		onBeforeUnload: function() {
			this.conflictsControlParentNode.removeEventListener('mousedown', this.onViewerStartPan);
			this.conflictsControlParentNode.removeEventListener('selectstart', this.onViewerSelectStart);

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

			if (this.conflictsControl.getScale() !== newScale) {
				this.setTreeScale(newScale);
			}
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
				this.conflictsControlsNode.classList.toggle('active', true);
			}

			this.scaleTimer = setTimeout(function() {
				var currentCenterX = (this.containerNode.scrollLeft + this.containerNode.clientWidth / 2) / this.containerNode.scrollWidth;
				var currentCenterY = (this.containerNode.scrollTop + this.containerNode.clientHeight / 2) / this.containerNode.scrollHeight;

				this.conflictsControl.setScale(newScale);

				this.containerNode.scrollLeft = currentCenterX * this.containerNode.scrollWidth - this.containerNode.clientWidth / 2;
				this.containerNode.scrollTop = currentCenterY * this.containerNode.scrollHeight - this.containerNode.clientHeight / 2;

				this.conflictsControlsNode.classList.toggle('active', false);
				this.scaleTimer = null;
			}.bind(this), 100);
		},

		onViewerStartPan: function(mouseEvent) {
			var isLeftButton = mouseEvent.button === 0;

			if (isLeftButton) {
				this.panCoordinates = {x: mouseEvent.clientX, y: mouseEvent.clientY};
				aras.showStatusMessage('status', 'Pan view mode');
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
			aras.clearStatusMessage('status');
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
						if (this.conflictsControl.isViewCreated) {
							this.conflictsControl.centerView();
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
