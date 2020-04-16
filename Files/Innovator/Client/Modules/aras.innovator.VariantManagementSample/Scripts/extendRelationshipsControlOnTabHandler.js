document.addEventListener('beforeLoadWidgets', function() {
	const relationshipsWithSplitters = new Set([
		// "vm_VariableComponentAsset" relationshiptype ID
		'1582D53C2B9E409E8AE64AEDD473A6F7'
	]);

	window.RelationshipsOverriddenFunctions = Object.assign(
		window.RelationshipsOverriddenFunctions || {},
		{
			onTab: function(targetTabId) {
				const relationshipsControl = window.relationshipsControl;

				if (!relationshipsWithSplitters.has(targetTabId)) {
					return;
				}

				const iframesCollection = relationshipsControl.iframesCollection;
				const relationshipMainIframe = iframesCollection && iframesCollection[targetTabId] || document.getElementById(targetTabId);
				const relationshipIframeContainer = relationshipMainIframe.parentElement;

				if (relationshipIframeContainer.classList.contains('effs-relationship-container')) {
					return;
				}

				relationshipMainIframe.classList.add('effs-relationship-container__pane-container');
				relationshipMainIframe.classList.add('effs-relationship-container__pane-content-iframe');
				relationshipMainIframe.classList.add('aras-flex-grow');

				const splitter = document.createElement('div');
				splitter.id = targetTabId + '_splitter';
				splitter.classList.add('aras-splitter');
				splitter.classList.add('aras-hide');

				const rightSplitterPane = document.createElement('div');
				rightSplitterPane.id = targetTabId + '_right_splitter_pane';
				rightSplitterPane.classList.add('effs-relationship-container__pane-container');
				rightSplitterPane.classList.add('effs-relationship-container__pane-container-right');
				rightSplitterPane.classList.add('effs-relationship-container__pane-container_min-width-100');
				rightSplitterPane.classList.add('aras-hide');

				relationshipIframeContainer.classList.add('effs-relationship-container');
				relationshipIframeContainer.appendChild(splitter);
				relationshipIframeContainer.appendChild(rightSplitterPane);

				window.ArasModules.splitter(splitter);

				const populateRelationshipTabEvent = new CustomEvent('vmPopulateRelationshipTab', {
					detail: {
						tabId: targetTabId
					}
				});

				document.dispatchEvent(populateRelationshipTabEvent);
			}
		}
	);
});
