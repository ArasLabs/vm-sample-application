define('Modules/aras.innovator.VariantManagementSample/Scripts/common/settingsDialog', [
	'dojo/_base/declare',
	'dojo/dom-construct'
],
function(declare, domConstruct) {
	return declare(null, {
		templateString:
			'<div class="settingsButton" title="Change Settings">' +
				'<div class="rotateImage">' +
					'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 64 64" ' +
						'xmlns:xlink="http://www.w3.org/1999/xlink" enable-background="new 0 0 64 64">' +
						'<path fill="#606060" d="m59,37v-10h-8c-.481-1.902-1.27-3.363-2.257-5l5.721-5.721-6.69-6.691-5.717,' +
						'5.715c-1.646-.991-3.141-1.631-5.057-2.103v-8.2h-10v8.2c-1.916,.473-3.481,1.094-5.124,2.086l-5.672-5.673-6.704,' +
						'6.704 5.664,5.664c-.996,1.655-1.586,3.088-2.064,5.019h-8.1v10h8.1c.481,1.922 1.075,3.583 2.08,5.236l-5.563,' +
						'5.564 6.699,6.698 5.58-5.58c1.651,.993 3.187,1.61 5.104,2.082v8h10v-8c1.905-.484 3.477-1.15 5.111-2.148l5.611,' +
						'5.611 6.69-6.691-5.634-5.633c.981-1.642 1.751-3.235 2.222-5.139h8zm-26.982,7c-6.628,' +
						'.008-12.009-5.358-12.018-11.982-.009-6.629 5.355-12.009 11.983-12.018 6.623-.01 12.007,5.354 12.017,' +
						'11.981 .01,6.623-5.356,12.007-11.982,12.019z"/>' +
					'</svg>' +
				'</div>' +
			'</div>',
		title: null,
		formId: null,
		scopeId: null,
		settingsButton: null,
		affectedGroups: null,
		formParameters: null,

		constructor: function(initialParameters) {
			var connectNode = document.getElementById(initialParameters.connectId);

			domConstruct.place(this.templateString, connectNode, 'first');

			this.settingsButton = document.querySelector('.settingsButton');
			this.settingsButton.addEventListener('click', this.show.bind(this));
			this.title = initialParameters.title;
			this.formId = initialParameters.formId;
			this.scopeId = initialParameters.scopeId;
			this.formParameters = initialParameters.formParameters || {};
		},

		show: function() {
			var dialogParameters = {
				title: this.title,
				formId: this.formId,
				aras: aras,
				isEditMode: true,
				documentItem: this,
				scopeId: this.scopeId,
				formParameters: this.formParameters,
				affectedGroups: this.affectedGroups ? this.affectedGroups : null,
				dialogWidth: 385, dialogHeight: 447, resizable: false,
				content: 'ShowFormAsADialog.html'
			};

			this.settingsButton.classList.toggle('activeButton', true);

			// timeout here is required for button css animation
			setTimeout(function() {
				parent.ArasModules.Dialog.show('iframe', dialogParameters).promise.then(function(selectedSettings) {
					if (selectedSettings) {
						this.affectedGroups = selectedSettings.affectedGroups;

						this.onSettingsChange(selectedSettings);
					}

					this.settingsButton.classList.toggle('activeButton', false);
				}.bind(this));
			}.bind(this), 100);
		},

		onSettingsChange: function(selectedSettings) {
		}
	});
});
