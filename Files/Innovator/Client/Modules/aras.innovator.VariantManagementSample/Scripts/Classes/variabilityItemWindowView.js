ModulesManager.define(
	['aras.innovator.core.ItemWindow/DefaultItemWindowView'],
	'aras.innovator.VariantManagementSample/variabilityItemWindowView',
	function(DefaultItemWindowView) {
		function VariabilityItemWindowView(inDom, inArgs) {
			DefaultItemWindowView.call(this, inDom, inArgs);
		}

		VariabilityItemWindowView.prototype = Object.assign(Object.create(DefaultItemWindowView.prototype), {
			constructor: VariabilityItemWindowView,

			getViewUrl: function() {
				return '/Modules/aras.innovator.VariantManagementSample/variabilityItemView';
			}
		});

		return VariabilityItemWindowView;
	});
