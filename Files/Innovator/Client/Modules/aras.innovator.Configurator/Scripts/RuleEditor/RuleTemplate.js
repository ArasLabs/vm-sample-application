define([], function() {
	return {
		template: ['RuleConditionGroup'],
		templateGroups: {
			'RuleConditionGroup': {
				type: 'grammar',
				grammarFile: 'Configurator/Scripts/RuleEditor/RuleGrammar.txt',
				title: 'Enter Rule condition expression',
				lexemStyles: {}
			},
		}
	};
});
