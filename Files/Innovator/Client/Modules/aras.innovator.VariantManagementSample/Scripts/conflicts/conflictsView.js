var item = window.opener[paramObjectName].item;
var isEditMode = window.opener[paramObjectName].isEditMode;
var setupParameters = window.opener[paramObjectName].viewSetupParameters || {};
var conflictsItem = window.opener[paramObjectName].conflictsItem;
var variableNames = window.opener[paramObjectName].variableNames;
var constantNames = window.opener[paramObjectName].constantNames;
window.opener[paramObjectName] = undefined;

///////// Default Windows Functions /////////
function turnWindowReadyOn() {
	window.windowReady = true;

	if (window.updateMenuState) {
		window.updateMenuState = function() {};
	}
}

function setTitle(isEditMode) {
	const label = window.aras.getResource(
		'../Modules/aras.innovator.VariantManagementSample/',
		'conflicts_page.title',
		item.getProperty('keyed_name'));

	if (window.arasTabsobj) {
		var winName = paramObjectName.replace('_params', '');
		window.arasTabsobj.updateTitleTab(winName, {
			label: label
		});
	} else {
		document.title = label;
	}
}

document.addEventListener('loadWidgets', function() {
	turnWindowReadyOn();
});
///////// END Default Windows Functions /////////

window.addEventListener('load', function() {
	setTitle();
	require(['Modules/aras.innovator.VariantManagementSample/Scripts/conflicts/conflictsApplicationCore'],
	function(ConflictsApplicationCore) {
		var applicationCore = new ConflictsApplicationCore({
			scopeItem: item,
			conflictsItem: conflictsItem,
			variableNames: variableNames,
			constantNames: constantNames
		});

		applicationCore.init();
		aras.browserHelper.toggleSpinner(document, false);
	});
});
