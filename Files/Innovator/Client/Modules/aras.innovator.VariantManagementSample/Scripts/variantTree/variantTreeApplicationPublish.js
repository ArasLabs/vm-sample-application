define('Modules/aras.innovator.VariantManagementSample/Scripts/variantTree/variantTreeApplicationPublish', [
	'dojo/_base/declare',
	'Modules/aras.innovator.VariantManagementSample/Scripts/variantTree/variantTreeApplicationBase'
],
function(declare, VariantTreeApplicationBase) {
	return declare([VariantTreeApplicationBase], {
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
