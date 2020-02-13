ModulesManager.define(
	['aras.innovator.core.ItemWindow/DefaultItemWindowView'],
	'aras.innovator.VariantManagementSample/componentItemWindowView',
	function(DefaultItemWindowView) {
		function ComponentItemWindowView(inDom, inArgs) {
			DefaultItemWindowView.call(this, inDom, inArgs);
		}

		ComponentItemWindowView.prototype = Object.assign(Object.create(DefaultItemWindowView.prototype), {
			constructor: ComponentItemWindowView,

			getViewUrl: function() {
				return '/Modules/aras.innovator.VariantManagementSample/componentItemView';
			}
		});

		return ComponentItemWindowView;
	});
