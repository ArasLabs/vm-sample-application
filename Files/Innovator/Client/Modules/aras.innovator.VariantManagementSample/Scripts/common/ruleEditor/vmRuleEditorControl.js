define([
	'dojo/_base/declare',
	'Controls/RuleEditor/RuleEditorControl',
	'./inputGroups/vmInputGroupFactory'
],
function(declare, RuleEditorControl, VmInputGroupFactory) {
	return declare([RuleEditorControl], {
		constructor: function() {
			this._groupFactory = new VmInputGroupFactory(this);
		}
	});
});
