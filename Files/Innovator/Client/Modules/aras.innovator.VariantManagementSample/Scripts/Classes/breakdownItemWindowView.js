ModulesManager.define(
	['aras.innovator.core.ItemWindow/DefaultItemWindowView'],
	'aras.innovator.VariantManagementSample/breakdownItemWindowView',
	function(DefaultItemWindowView) {
		function BreakdownItemWindowView(inDom, inArgs) {
			DefaultItemWindowView.call(this, inDom, inArgs);
		}

		BreakdownItemWindowView.prototype = Object.assign(Object.create(DefaultItemWindowView.prototype), {
			constructor: BreakdownItemWindowView,

			getViewUrl: function() {
				return '/Modules/aras.innovator.VariantManagementSample/breakdownItemView';
			}
		});

		return BreakdownItemWindowView;
	});
