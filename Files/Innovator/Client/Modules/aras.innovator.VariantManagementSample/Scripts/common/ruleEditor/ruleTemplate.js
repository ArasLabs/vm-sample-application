define([], function() {
	return {
		template: ['RuleConditionGroup'],
		templateGroups: {
			'RuleConditionGroup': {
				type: 'vmGrammar',
				grammarFile: 'Modules/aras.innovator.VariantManagementSample/Scripts/common/ruleEditor/ruleGrammar.txt',
				title: 'Enter condition expression',
				lexemStyles: {}
			}
		}
	};
});
