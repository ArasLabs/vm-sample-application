ModulesManager.define(
	['aras.innovator.core.ItemWindow/DefaultItemWindowView'],
	'aras.innovator.VariantManagementSample/variableComponentItemWindowView',
	function(DefaultItemWindowView) {
		function VariableComponentItemWindowView(inDom, inArgs) {
			DefaultItemWindowView.call(this, inDom, inArgs);
		}

		VariableComponentItemWindowView.prototype = Object.assign(Object.create(DefaultItemWindowView.prototype), {
			constructor: VariableComponentItemWindowView,

			getViewUrl: function() {
				return '/Modules/aras.innovator.VariantManagementSample/variableComponentItemView';
			}
		});

		return VariableComponentItemWindowView;
	});
