define([], function() {
	return {
		template: ['UsageConditionGroup'],
		templateGroups: {
			'UsageConditionGroup': {
				type: 'vmGrammar',
				grammarFile: 'Modules/aras.innovator.VariantManagementSample/Scripts/common/ruleEditor/vmUsageConditionGrammar.txt',
				title: 'Enter condition expression',
				lexemStyles: {}
			}
		}
	};
});
