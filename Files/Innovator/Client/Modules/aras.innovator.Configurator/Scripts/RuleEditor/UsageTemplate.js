define([], function() {
	return {
		template: ['UsageConditionGroup'],
		templateGroups: {
			'UsageConditionGroup': {
				type: 'grammar',
				grammarFile: 'Configurator/Scripts/RuleEditor/UsageGrammar.txt',
				title: 'Enter Usage condition expression',
				lexemStyles: {}
			}
		}
	};
});
