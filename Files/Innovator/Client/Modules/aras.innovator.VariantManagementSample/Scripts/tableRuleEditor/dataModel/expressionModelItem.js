/* global define */
define([
	'dojo/_base/declare',
	'Modules/aras.innovator.VariantManagementSample/Scripts/tableRuleEditor/dataModel/groupedModelItem',
	'Controls/Common/RenderUtils'
],
function(declare, BaseModelItem, RenderUtils) {
	return declare(BaseModelItem, {
		_expressionTree: null,

		constructor: function(initialParameters) {
			this.deserializeExpression();
		},

		deserializeExpression: function() {
			var propertyValue = this.getContentOfExpressionNode(this.getItemProperty('definition'));

			this._expressionTree = this._deserializeExpressionTree(propertyValue);
		},

		getContentOfExpressionNode: function(xmlString) {
			return xmlString.replace(/\r?\n|\t/g, '').replace('<expression>', '').replace('</expression>', '');
		},

		deserializeExpressionToString: function(optionalParameters) {
			var definitionPropertyValue = this.getContentOfExpressionNode(this.getItemProperty('definition'));
			var deserializedValue = '';

			optionalParameters = optionalParameters || {};

			if (definitionPropertyValue) {
				var expressionDocument = new XmlDocument();
				var rootNode;

				expressionDocument.loadXML(definitionPropertyValue);
				rootNode = expressionDocument.documentElement;

				if (rootNode.nodeName === 'IMPLICATION') {
					var conditionNode = rootNode.firstChild;
					var consequenceNode = conditionNode.nextSibling;

					optionalParameters.expressionBranch = 'condition';
					deserializedValue = 'IF ' + this._deserializeExpressionNodeToString(conditionNode.firstChild, null, optionalParameters);

					optionalParameters.expressionBranch = 'consequence';
					deserializedValue += ' THEN ' + this._deserializeExpressionNodeToString(consequenceNode.firstChild, null, optionalParameters);
				} else {
					deserializedValue = this._deserializeExpressionNodeToString(rootNode, null, optionalParameters);
				}
			}

			return deserializedValue;
		},

		_deserializeExpressionNodeToString: function(targetNode, parentNode, optionalParameters) {
			var deserializedValue = '';

			if (targetNode) {
				var nodeName = targetNode.nodeName;
				var currentChildNode;
				var innerExpressionValues;

				optionalParameters = optionalParameters || {};

				switch (nodeName) {
					case 'EQ':
						var variable = targetNode.firstChild;
						var variableId = variable.getAttribute('id');
						var namedConstantId = variable.nextSibling.getAttribute('id');
						var optionDeserializedValue = optionalParameters.optionDeserializer ?
							optionalParameters.optionDeserializer(variableId, namedConstantId, optionalParameters) : variableId;

						deserializedValue = (parentNode && parentNode.nodeName === 'NOT') ?
							'(' + optionDeserializedValue + ')' : optionDeserializedValue;
						break;
					case 'NOT':
						deserializedValue += nodeName + ' ' + this._deserializeExpressionNodeToString(targetNode.firstChild, targetNode, optionalParameters);
						break;
					case 'EXACTLY-ONE':
					case 'AT-LEAST-ONE':
					case 'AT-MOST-ONE':
						currentChildNode = targetNode.firstChild;
						innerExpressionValues = [];

						while (currentChildNode) {
							innerExpressionValues.push(this._deserializeExpressionNodeToString(currentChildNode, targetNode, optionalParameters));
							currentChildNode = currentChildNode.nextSibling;
						}

						deserializedValue += nodeName + ' (' + innerExpressionValues.join(' | ') + ')';
						break;
					default:
						var innerExpression;

						currentChildNode = targetNode.firstChild;
						innerExpressionValues = [];

						while (currentChildNode) {
							innerExpressionValues.push(this._deserializeExpressionNodeToString(currentChildNode, targetNode, optionalParameters));
							currentChildNode = currentChildNode.nextSibling;
						}

						innerExpression = innerExpressionValues.join(' ' + nodeName + ' ');
						deserializedValue += parentNode ? '(' + innerExpression + ')' : innerExpression;
						break;
				}
			}

			return deserializedValue;
		},

		serializeExpression: function(targetTree) {
			var serializedValue = '';

			targetTree = targetTree || this._expressionTree;

			if (targetTree) {
				if (targetTree.condition) {
					serializedValue += '<expression>';
					serializedValue += '<IMPLICATION>';
					serializedValue += this._serializeExpressionNode(targetTree.condition);
					serializedValue += this._serializeExpressionNode(targetTree.consequence);
					serializedValue += '</IMPLICATION>';
					serializedValue += '</expression>';
				} else if (targetTree.consequence) {
					serializedValue += this._serializeExpressionNode(targetTree.consequence.operands[0]);
				}
			}

			this.setItemProperty('definition', serializedValue);
		},

		_serializeExpressionNode: function(targetExpressionNode) {
			var serializedValue = '';

			if (targetExpressionNode) {
				switch (targetExpressionNode.type) {
					case 'variant':
						break;
					case 'variable':
						serializedValue += '<variable id="' + targetExpressionNode.itemId + '"></variable>';
						break;
					case 'named-constant':
						serializedValue += '<named-constant id="' + targetExpressionNode.itemId + '"></named-constant>';
						break;
					default:
						var operationName = targetExpressionNode.operator;
						var relatedOperands = targetExpressionNode.operands;
						var i;

						serializedValue += '<' + operationName + '>';

						for (i = 0; i < relatedOperands.length; i++) {
							serializedValue += this._serializeExpressionNode(relatedOperands[i]);
						}

						serializedValue += '</' + operationName + '>';
						break;
				}
			}

			return serializedValue;
		},

		_deserializeExpressionTree: function(propertyValue) {
			var resultValue;

			if (propertyValue) {
				var expressionDocument = new XmlDocument();
				var rootNode;

				expressionDocument.loadXML(propertyValue);
				rootNode = expressionDocument.documentElement;
				resultValue = {type: 'root'};

				if (rootNode.nodeName === 'IMPLICATION') {
					var conditionNode = rootNode.firstChild;
					var consequenceNode = conditionNode.nextSibling;

					resultValue.condition = this._deserializeExpressionXmlNode(conditionNode);
					resultValue.consequence = this._deserializeExpressionXmlNode(consequenceNode);
				} else {
					resultValue.consequence = this._deserializeExpressionXmlNode(rootNode);
				}
			}

			return resultValue;
		},

		_deserializeExpressionXmlNode: function(targetNode, parentExpression) {
			var deserializedValue;

			if (targetNode) {
				var nodeName = targetNode.nodeName;

				parentExpression = parentExpression || null;

				switch (nodeName) {
					case 'named-constant':
						deserializedValue = {
							type: 'named-constant',
							itemId: targetNode.getAttribute('id'),
							parent: parentExpression
						};

						break;
					case 'variable':
						deserializedValue = {
							type: 'variable',
							itemId: targetNode.getAttribute('id'),
							parent: parentExpression
						};

						break;
					default:
						var currentChildNode = targetNode.firstChild;

						deserializedValue = {
							type: 'operation',
							operator: nodeName,
							parent: parentExpression,
							operands: []
						};

						while (currentChildNode) {
							deserializedValue.operands.push(this._deserializeExpressionXmlNode(currentChildNode, deserializedValue));
							currentChildNode = currentChildNode.nextSibling;
						}

						break;
				}
			}

			return deserializedValue;
		},

		isExcludeExpression: function() {
			var consequenceExpression = this._expressionTree && this._expressionTree.consequence;
			var consequenceOperand = (consequenceExpression && consequenceExpression.operands[0]) || {};

			return consequenceOperand.operator === 'NOT';
		},

		getExpressionTree: function() {
			return this._expressionTree;
		},

		getAllExpressionOptions: function() {
			var conditionOptions = this.getConditionOptions();
			var consequenceOptions = this.getConsequenceOptions();

			return conditionOptions.concat(consequenceOptions);
		},

		getConditionOptions: function() {
			return this._getOptionsFromExpressionNode(this._expressionTree && this._expressionTree.condition);
		},

		getConsequenceOptions: function() {
			return this._getOptionsFromExpressionNode(this._expressionTree && this._expressionTree.consequence);
		},

		_getOptionsFromExpressionNode: function(expressionNode, foundItems) {
			foundItems = foundItems || [];

			if (expressionNode) {
				switch (expressionNode.type) {
					case 'named-constant':
						foundItems.push(expressionNode.itemId);
						break;
					case 'operation':
						var expressionOperands = expressionNode.operands;
						var i;

						for (i = 0; i < expressionOperands.length; i++) {
							this._getOptionsFromExpressionNode(expressionOperands[i], foundItems);
						}

						break;
					default:
				}
			}

			return foundItems;
		},

		getConsequenceExpressionNodes: function(nodeType, rootNode, foundNodes) {
			rootNode = rootNode || (this._expressionTree && this._expressionTree.consequence);
			foundNodes = foundNodes || [];

			if (rootNode) {
				var expressionOperands = rootNode.operands || [];
				var i;

				if (rootNode.type === nodeType) {
					foundNodes.push(rootNode);
				}

				for (i = 0; i < expressionOperands.length; i++) {
					this.getConsequenceExpressionNodes(nodeType, expressionOperands[i], foundNodes);
				}
			}

			return foundNodes;
		},

		hasConditionOption: function(itemId) {
			var conditionOptionIds = this.getConditionOptions();

			return conditionOptionIds.indexOf(itemId) > -1;
		},

		hasConsequenceOption: function(itemId) {
			var consequenceOptionIds = this.getConsequenceOptions();

			return consequenceOptionIds.indexOf(itemId) > -1;
		},

		setItemProperty: function(propertyName, propertyValue, optionalParameters) {
			this.inherited(arguments);

			if (propertyName === 'definition') {
				this.deserializeExpression();
			}
		}
	});
});
