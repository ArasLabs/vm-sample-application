define([], function() {
	return {
		template: ['RuleConditionGroup'],
		templateGroups: {
			'RuleConditionGroup': {
				type: 'csGrammar',
				grammarFile: 'Modules/aras.innovator.Configurator/Scripts/RuleEditor/RuleGrammar.txt',
				title: 'Enter Rule condition expression',
				lexemStyles: {}
			}
		}
	};
});
