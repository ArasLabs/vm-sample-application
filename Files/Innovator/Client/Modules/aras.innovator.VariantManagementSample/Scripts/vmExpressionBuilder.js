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

		const equalityTermOperands = [];

		namedConstantIdByVariableId.forEach(function(namedConstantId, variableId) {
			equalityTermOperands.push(constructEqualityTermAsJson(variableId, namedConstantId));
		});

		return ArasModules.jsonToXml({
			eq: equalityTermOperands
		});
	},

	buildExpression: function(namedConstantIdByVariableId, shouldReturnExpressionIfEmpty) {
		if (!namedConstantIdByVariableId.size && !shouldReturnExpressionIfEmpty) {
			return '';
		}

		return '<expression>' + this.buildExpressionDefinition(namedConstantIdByVariableId) + '</expression>';
	}
};
