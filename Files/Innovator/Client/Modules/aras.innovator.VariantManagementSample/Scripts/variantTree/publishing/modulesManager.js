window.ModulesManager = {
	using: function(classes) {
		return new Promise(function(resolve) {
			require(classes, function(module) {
				resolve(module);
			});
		});
	},
	define: function(classes, classFullName, callback) {
		define(classFullName, classes, callback);
	}
};
