ModulesManager.define(
	['aras.innovator.core.ItemWindow/DefaultItemWindowView'],
	'aras.innovator.core.ItemWindow/CsSampleItemWindowView',
	function(DefaultItemWindowView) {
		function CsSampleItemWindowView(inDom, inArgs) {
			this.inDom = inDom;
			this.inArgs = inArgs;
		}

		CsSampleItemWindowView.prototype = new DefaultItemWindowView();

		CsSampleItemWindowView.prototype.getWindowUrl = function(formHeight) {
			var result = aras.getBaseURL() + '/Modules/aras.innovator.core.ItemWindow/CsSampleView?state=' + encodeURI('tabs on');
			if (formHeight !== undefined) {
				result += '&formHeight=' + formHeight;
			}
			return result;
		};

		return CsSampleItemWindowView;
	});
