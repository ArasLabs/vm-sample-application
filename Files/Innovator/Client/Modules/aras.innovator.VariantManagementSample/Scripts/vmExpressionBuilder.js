window.VmExpressionBuilder = {
	buildExpressionDefinition: function(namedConstantIdByVariableId) {
		const constructEqualityTermAsJson = function(variableId, namedConstantId) {
			return {
				variable: {
					'@attrs': {
						id: variableId
					}
				},
				'named-constant': {
					'@attrs': {
						id: namedConstantId
					}
				}
			};
		};

		const definitionBodyEqNodes = [];
		const definitionBodyOrNodes = [];

		namedConstantIdByVariableId.forEach(function(namedConstantIdOrEnumeration, variableId) {
			if (typeof namedConstantIdOrEnumeration === 'string') {
				definitionBodyEqNodes.push(constructEqualityTermAsJson(variableId, namedConstantIdOrEnumeration));
				return;
			}

			const equalityTermOperands = [];

			namedConstantIdOrEnumeration.forEach(function(namedConstantId) {
				equalityTermOperands.push(constructEqualityTermAsJson(variableId, namedConstantId));
			});

			if (equalityTermOperands.length > 1) {
				definitionBodyOrNodes.push({
					EQ: equalityTermOperands
				});
			} else if (equalityTermOperands.length === 1) {
				definitionBodyEqNodes.push(equalityTermOperands[0]);
			}
		});

		let definitionBody = {};

		if (definitionBodyEqNodes.length) {
			definitionBody.EQ = definitionBodyEqNodes;
		}

		if (definitionBodyOrNodes.length) {
			definitionBody.OR = definitionBodyOrNodes;
		}

		definitionBody = definitionBodyEqNodes.length + definitionBodyOrNodes.length > 1 ? {
			AND: definitionBody
		} : definitionBody;

		return ArasModules.jsonToXml(definitionBody);
	},

	buildExpression: function(namedConstantIdByVariableId, shouldReturnExpressionIfEmpty) {
		if (!namedConstantIdByVariableId.size && !shouldReturnExpressionIfEmpty) {
			return '';
		}

		return '<expression>' + this.buildExpressionDefinition(namedConstantIdByVariableId) + '</expression>';
	}
};
