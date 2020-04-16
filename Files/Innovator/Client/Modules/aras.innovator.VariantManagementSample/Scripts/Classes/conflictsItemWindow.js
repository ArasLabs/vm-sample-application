ModulesManager.define(
	['aras.innovator.core.ItemWindow/DefaultItemWindowView'],
	'aras.innovator.VariantManagementSample/conflictsItemWindow',
	function(DefaultItemWindowView) {
		function ConflictsItemWindow(inDom, inArgs) {
			DefaultItemWindowView.call(this, inDom, inArgs);
		}

		ConflictsItemWindow.prototype = Object.assign(Object.create(DefaultItemWindowView.prototype), {
			constructor: ConflictsItemWindow,

			// ovveride default size of window, because it's very small
			getWindowProperties: function() {
				const topWindow = aras.getMainWindow();
				const screenHeight = topWindow.screen.availHeight;
				const screenWidth = topWindow.screen.availWidth;
				const mainWindowHeight = topWindow.outerHeight;
				const mainWindowWidth = topWindow.outerWidth;
				let tempHeight;
				let tempWidth;
				const percentOfScreen = (mainWindowHeight * mainWindowWidth) / (screenWidth * screenHeight);

				// until the main window is more than 80% of the screen square, we calculate the size of the LifeCycle map as 80 percent of the screen size;
				tempHeight = percentOfScreen > 0.8 ? screenHeight : mainWindowHeight;
				tempWidth = percentOfScreen > 0.8 ? screenWidth : mainWindowWidth;

				const sizeTrue = tempHeight > 800 && tempWidth > 1200;
				tempHeight = sizeTrue ? tempHeight : 800;	// 800*0.8= 640px
				tempWidth = sizeTrue ? tempWidth : 1200;	// 1200*0.8= 960px	960*640 is default size if the main window smaller than 1200*800

				const cmfWindowHeight = tempHeight * 0.8;
				const cmfWindowWidth = tempWidth * 0.8;

				// workflowMap window will be center-aligned
				const cmfWindowTop = (screenHeight - cmfWindowHeight) / 2;
				const cmfWindowLeft = (screenWidth - cmfWindowWidth) / 2;

				return {height: cmfWindowHeight, width: cmfWindowWidth, x: cmfWindowLeft, y: cmfWindowTop};
			},

			getWindowUrl: function() {
				return aras.getBaseURL() + '/Modules/aras.innovator.VariantManagementSample/conflictsView';
			},

			getWindowArguments: function() {
				const baseGetWindowArguments = DefaultItemWindowView.prototype.getWindowArguments.bind(this);
				const result = baseGetWindowArguments();
				if (this.inArgs) {
					result.viewSetupParameters = undefined;
					result.conflictsItem = this.inArgs.conflictsItem;
					result.variableNames = this.inArgs.variableNames;
					result.constantNames = this.inArgs.constantNames;
				}
				return result;
			}
		});

		return ConflictsItemWindow;
	});
