define('Configurator/Scripts/VariantsTree/VariantsTreeApplicationPublish', [
	'dojo/_base/declare',
	'Configurator/Scripts/VariantsTree/VariantsTreeApplicationBase'
],
function(declare, VariantsTreeApplicationBase) {
	return declare([VariantsTreeApplicationBase], {
		constructor: function(initialParameters) {
			this.dataBuilder.setGeneratedData(initialParameters);
		},

		loadView: function() {
			this.dataBuilder.setNodeItemsSortOrder(this.getSelectedVariableNamedConstantPairs());
			this.treeControl.loadTree(this.dataBuilder.getVariantTreeData());
			this.updateInfoPanel();
		}
	});
});
