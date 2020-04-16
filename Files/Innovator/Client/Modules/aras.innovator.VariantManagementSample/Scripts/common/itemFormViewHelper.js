define([
	'dojo/_base/declare'
],
function(declare) {
	return declare('Aras.CFG.Common.ItemFormViewHelper', null, {
		aras: null,
		formsCache: null,
		defaultMode: 'view',
		containerNode: null,

		constructor: function(inputArguments) {
			inputArguments = inputArguments || {};

			this.aras = inputArguments.aras;
			this.containerNode = inputArguments.containerNode || (inputArguments.containerId && document.getElementById(inputArguments.containerId));
			this.formsCache = [];
		},

		showItemForm: function(itemTypeName, formMode, itemNode, containerElement, userChangeHandler) {
			var cachedForm;

			containerElement = containerElement || this.containerNode;

			if (itemTypeName && containerElement) {
				var classification = this.aras.getItemProperty(itemNode, 'classification');

				cachedForm = this.getItemForm(itemTypeName, formMode, classification, containerElement);

				if (!cachedForm) {
					var formId = itemTypeName + '_' + formMode + (classification ? '_' + classification : '');

					cachedForm = document.createElement('iframe');
					cachedForm.setAttribute('id', formId);
					cachedForm.setAttribute('frameBorder', '0');
					cachedForm.setAttribute('width', '100%');
					cachedForm.setAttribute('height', '100%');
					cachedForm.style.position = 'relative';

					cachedForm.formContentLoaded = false;
					cachedForm.itemTypeName = itemTypeName;
					containerElement.appendChild(cachedForm);
					cachedForm.containerElement = containerElement;

					this.addFormToCache({
						itemType: itemTypeName,
						mode: formMode,
						classification: classification,
						container: containerElement,
						formFrame: cachedForm
					});
				}

				// if user send item, then fill form with item properties
				if (itemNode) {
					propsFReady = false;
					var topWindow = this.aras.getMostTopWindowWithAras();

					if (cachedForm.formContentLoaded) {
						window.startPopulateFormWithItemEx = true;
						this.aras.uiPopulateFormWithItemEx(cachedForm.contentDocument, itemNode, '', formMode == 'edit');
						delete window.startPopulateFormWithItemEx;
						propsFReady = true;
					} else {
						this.aras.uiShowItemInFrameEx(cachedForm.contentWindow, itemNode, formMode);

						cachedForm.onload = function() {
							topWindow.ITEM_WINDOW.registerStandardShortcuts(this.contentWindow);
							if (topWindow.returnBlockerHelper) {
								topWindow.returnBlockerHelper.attachBlocker(this.contentWindow);
							}

							cachedForm.contentDocument.userChangeHandler = userChangeHandler;
							cachedForm.formContentLoaded = true;
							propsFReady = true;
						};
					}
				}
			}

			this.hideAllItemForms(containerElement);

			if (cachedForm) {
				cachedForm.style.display = '';
			}

			return cachedForm;
		},

		showFormById: function(formId, formMode, itemNode, containerElement, userChangeHandler) {
			var cachedForm;

			containerElement = containerElement || this.containerNode;

			if (itemTypeName && containerElement) {
				var classification = this.aras.getItemProperty(itemNode, 'classification');

				cachedForm = this.getFormById(formId, formMode, containerElement);

				if (!cachedForm) {
					var formDisplay = this.aras.getFormForDisplay(formId);

					cachedForm = document.createElement('iframe');
					cachedForm.setAttribute('id', formId);
					cachedForm.setAttribute('frameBorder', '0');
					cachedForm.setAttribute('width', formDisplay.getProperty('width') + 'px');
					cachedForm.setAttribute('height', formDisplay.getProperty('height') + 'px');
					cachedForm.style.position = 'relative';

					cachedForm.formContentLoaded = false;
					cachedForm.itemTypeName = itemTypeName;
					containerElement.appendChild(cachedForm);
					cachedForm.containerElement = containerElement;
					cachedForm.formItem = formDisplay;

					this.addFormToCache({
						id: formId,
						itemType: itemTypeName,
						mode: formMode,
						classification: classification,
						container: containerElement,
						formFrame: cachedForm
					});
				}

				// if user send item, then fill form with item properties
				if (itemNode) {
					propsFReady = false;
					var topWindow = this.aras.getMostTopWindowWithAras();

					if (cachedForm.formContentLoaded) {
						window.startPopulateFormWithItemEx = true;
						this.aras.uiPopulateFormWithItemEx(cachedForm.contentDocument, itemNode, '', formMode == 'edit');
						delete window.startPopulateFormWithItemEx;
						propsFReady = true;
					} else {
						this.aras.uiShowItemInFrameEx(cachedForm.contentWindow, itemNode, formMode, 0, cachedForm.formItem.node);

						cachedForm.onload = function() {
							topWindow.ITEM_WINDOW.registerStandardShortcuts(this.contentWindow);
							if (topWindow.returnBlockerHelper) {
								topWindow.returnBlockerHelper.attachBlocker(this.contentWindow);
							}

							cachedForm.contentDocument.userChangeHandler = userChangeHandler;
							cachedForm.formContentLoaded = true;
							propsFReady = true;
						};
					}
				}
			}

			this.hideAllItemForms(containerElement);

			if (cachedForm) {
				cachedForm.style.display = '';
			}

			return cachedForm;
		},

		getItemForm: function(itemTypeName, formMode, classification, containerNode) {
			var foundForms;

			classification = classification || 'default';
			containerNode = containerNode || this.containerNode;
			foundForms = this.formsCache.filter(function(formDescriptor) {
				if (formDescriptor.itemType === itemTypeName && formDescriptor.mode === formMode && formDescriptor.classification === classification &&
					formDescriptor.container === containerNode) {
					return true;
				}
			});

			return foundForms.length ? foundForms[0].formFrame : null;
		},

		getFormById: function(formId, formMode, containerNode) {
			var foundForms;

			containerNode = containerNode || this.containerNode;
			foundForms = this.formsCache.filter(function(formDescriptor) {
				if (formDescriptor.id === formId && formDescriptor.mode === formMode && formDescriptor.container === containerNode) {
					return true;
				}
			});

			return foundForms.length ? foundForms[0].formFrame : null;
		},

		addFormToCache: function(formDescriptor) {
			if (formDescriptor) {
				formDescriptor.classification = formDescriptor.classification || 'default';
				formDescriptor.container = formDescriptor.container || this.containerNode;

				if (!formDescriptor.id || !this.getFormById(formDescriptor.id, formDescriptor.mode, formDescriptor.container)) {
					this.formsCache.push(formDescriptor);
				}
			}
		},

		hideAllItemForms: function(formContainer) {
			var formDescriptor;
			var i;

			for (i = 0; i < this.formsCache.length; i++) {
				formDescriptor = this.formsCache[i];

				if (formDescriptor.container === formContainer) {
					formDescriptor.formFrame.style.display = 'none';
				}
			}
		}
	});
});
