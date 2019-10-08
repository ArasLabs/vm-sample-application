define([], function() {
	return {
		template: ['UsageConditionGroup'],
		templateGroups: {
			'UsageConditionGroup': {
				type: 'csGrammar',
				grammarFile: 'Modules/aras.innovator.Configurator/Scripts/RuleEditor/UsageGrammar.txt',
				title: 'Enter Usage condition expression',
				lexemStyles: {}
			}
		}
	};
});
