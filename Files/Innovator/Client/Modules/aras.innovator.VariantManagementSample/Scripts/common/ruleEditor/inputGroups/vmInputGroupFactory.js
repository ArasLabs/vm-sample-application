define([
	'dojo/_base/declare',
	'Controls/RuleEditor/InputGroups/InputGroupFactory',
	'./vmGrammarInputGroup'
],
function(declare, InputGroupFactory, VmGrammarInputGroup) {
	return declare([InputGroupFactory], {
		createGroup: function(groupDescriptor) {
			const groupType = groupDescriptor && groupDescriptor.type;

			if (groupType === 'vmGrammar') {
				return new VmGrammarInputGroup(this.owner, groupDescriptor);
			}

			return this.inherited(arguments);
		}
	});
});
