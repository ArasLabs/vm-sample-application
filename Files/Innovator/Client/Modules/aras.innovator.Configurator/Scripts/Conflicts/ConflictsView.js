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
	var labelTemplate = '{0} - Conflicts';
	var label = labelTemplate.replace('{0}', item.getProperty('name'));

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
	require(['Configurator/Scripts/Conflicts/ConflictsApplicationCore'],
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
