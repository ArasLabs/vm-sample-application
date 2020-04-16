(function(window) {
	'use strict';

	function AutoValidationTabViewController(parameters) {
		this._aras = parameters.aras;
		this._gridContainerElement = parameters.gridContainerElement;
		this._toolbarContainerElement = parameters.toolbarContainerElement;
	}

	AutoValidationTabViewController.prototype = {
		constructor: AutoValidationTabViewController,

		_aras: null,

		_validationResultGrid: null,

		_gridContainerElement: null,

		_toolbarContainerElement: null,

		_variabilityItemId: null,

		loadView: function(variabilityItemNode) {
			this._variabilityItemId = variabilityItemNode.getAttribute('id');

			if (!this._validationResultGrid) {
				this._validationResultGrid = new window.VmValidationResultGrid({
					aras: this._aras,
					gridContainerElement: this._gridContainerElement
				});

				this._loadToolbar(this._toolbarContainerElement);
			}

			this._produceValidationOutput();
		},

		_produceValidationOutput: function() {
			const validationResults = this._validate(this._variabilityItemId);

			if (validationResults.isError()) {
				this._aras.AlertError(validationResults);
				return;
			}

			const rows = this._translateValidationResultsToGridRows(validationResults);

			this._validationResultGrid.populate(rows);
		},

		_loadToolbar: function(toolbarContainerElement) {
			const toolbar = new window.Toolbar();
			toolbarContainerElement.appendChild(toolbar);

			const toolbarMetadata = this._getToolbarMetadata();

			window.cuiToolbar(toolbar, 'vm_variabilityItemAutoValidationTabToolbar', {itemTypeName: 'vm_VariabilityItem', metadata: toolbarMetadata});
		},

		_getToolbarMetadata: function() {
			return {
				autoValidationPane: {
					reload: function() {
						this._produceValidationOutput();
					}.bind(this)
				}
			};
		},

		_translateValidationResultsToGridRows: function(validationResults) {
			// Method cfg_ValidateScope returns one Validation node in Result node
			// and IE do not allow to use unknown namespaces (SOAP-ENV:) in querySelector
			// so firstChild is used to get into SOAP-ENV:Envelope/SOAP-ENV:Body/Result/Validation
			const validationNode = validationResults.dom.firstChild.firstChild.firstChild.firstChild;
			const gridRows = new Map();
			let uniqueRowId = 0;

			const validationResultRowObject = {
				type: validationNode.getAttribute('type'),
				result: validationNode.getAttribute('result')
			};
			gridRows.set(uniqueRowId++, validationResultRowObject);

			const addMessageRow = function(id, message) {
				gridRows.set(
					id,
					{
						message: message
					}
				);
			};

			const getNodeTextContent = function(node, nodeNameToSeek) {
				return node.selectSingleNode(nodeNameToSeek).text;
			};

			const deserializeTermNode = function(node) {
				const featureName = getNodeTextContent(node, 'variable/@name');
				const optionName = getNodeTextContent(node, 'named-constant/@name');

				return featureName + ' = ' + optionName;
			};

			if ('false' === validationResultRowObject.result) {
				const errorNode = validationNode.selectSingleNode('Error');

				// This message is hardcoded on server side. Make it more user friendly.
				validationResultRowObject.message = getNodeTextContent(errorNode, 'Name')
					.replace('Scope Named Constants Availability Validate', 'Option Availability Validation');

				// This message is hardcoded on server side. Make it more user friendly.
				const errorMessage = getNodeTextContent(errorNode, 'Message')
					.replace('values are not available', 'option(s) are not available for selection')
					.replace('The problem does not have an optimal solution!', 'There are no valid option combinations for this Variability Item.');
				addMessageRow(uniqueRowId++, errorMessage);

				const errorDetailsNode = errorNode.selectSingleNode('details');
				if (errorDetailsNode) {
					Array.prototype.forEach.call(errorDetailsNode.childNodes, function(termNode) {
						addMessageRow(uniqueRowId++, deserializeTermNode(termNode));
					});
				}
			}

			return gridRows;
		},

		_validate: function(variabilityItemId) {
			const targetScopeItem = this._aras.newIOMItem('Method', 'vm_scopeBuilder');
			targetScopeItem.setID(variabilityItemId);

			const validateScopeItem = this._aras.newIOMItem('Method', 'cfg_ValidateScope');
			validateScopeItem.setPropertyItem('targetScope', targetScopeItem);

			return validateScopeItem.apply();
		}
	};

	window.AutoValidationTabViewController = AutoValidationTabViewController;
}(window));
