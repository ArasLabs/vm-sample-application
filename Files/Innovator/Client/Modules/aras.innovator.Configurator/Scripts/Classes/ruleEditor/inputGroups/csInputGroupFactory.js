define([
	'dojo/_base/declare',
	'Controls/RuleEditor/InputGroups/InputGroupFactory',
	'./csGrammarInputGroup'
],
function(declare, InputGroupFactory, CsGrammarInputGroup) {
	return declare([InputGroupFactory], {
		createGroup: function(groupDescriptor) {
			const groupType = groupDescriptor && groupDescriptor.type;

			if (groupType === 'csGrammar') {
				return new CsGrammarInputGroup(this.owner, groupDescriptor);
			}

			return this.inherited(arguments);
		}
	});
});
