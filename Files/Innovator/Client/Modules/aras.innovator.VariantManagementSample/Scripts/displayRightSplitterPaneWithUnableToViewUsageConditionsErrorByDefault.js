document.addEventListener('vmPopulateRelationshipTab', function(e) {
	const aras = window.aras;
	const vmModuleSolutionBasedRelativePath = '../Modules/aras.innovator.VariantManagementSample';
	const informationMessage = aras.getResource(vmModuleSolutionBasedRelativePath,
		'usage_condition_source_item_grid.single_row_must_be_selected_to_view_usage_conditions_error_message');

	aras.evalMethod('vm_showRelsRightSplitterPaneView', '', {
		aras: aras,
		informationMessage: informationMessage,
		relationshipTabId: e.detail.tabId,
		viewPath: aras.getBaseURL() + '/Modules/aras.innovator.VariantManagementSample/Views/vmInformationMessageView.html'
	});
});
