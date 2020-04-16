/* global define */
define([
	'dojo/_base/declare'
],
function(declare) {
	return declare(null, {
		sortingActive: null,

		constructor: function(initialArguments) {
			this.sortingActive = initialArguments.sortingActive || true;
		},

		itemSorter: function(firstItem, secondItem) {
			var firstItemName = aras.getItemProperty(firstItem.node, 'name');
			var secondItemName = aras.getItemProperty(secondItem.node, 'name');

			return firstItemName.localeCompare(secondItemName);
		}
	});
});
