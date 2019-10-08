define([
	'dojo/_base/declare',
	'Controls/RuleEditor/RuleEditorControl',
	'./inputGroups/csInputGroupFactory'
],
function(declare, RuleEditorControl, CsInputGroupFactory) {
	return declare([RuleEditorControl], {
		constructor: function() {
			this._groupFactory = new CsInputGroupFactory(this);
		}
	});
});
