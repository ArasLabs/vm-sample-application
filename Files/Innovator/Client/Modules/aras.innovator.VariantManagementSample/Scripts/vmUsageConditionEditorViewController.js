(function(window) {
	'use strict';

	function VmUsageConditionEditorViewController(parameters) {
		this._aras = parameters.aras;
		this._itemPresenter = parameters.itemPresenter;
		this._usageConditionItemNode = parameters.usageConditionItemNode;
		this._usageConditionItem = this._convertItemNodeToIomItem(this._usageConditionItemNode);
		this._closeHandler = parameters.closeHandler;
		this._isEditMode = parameters.viewMode !== 'view';
		this._usageConditionVariabilityItemRelationshipItemType = parameters.usageConditionVariabilityItemRelationshipItemType;

		this._init(
			parameters.viewMode,
			parameters.applyButtonElement,
			parameters.cancelButtonElement,
			parameters.editButtonElement,
			parameters.editorIframeElement);
	}

	VmUsageConditionEditorViewController.prototype = {
		constructor: VmUsageConditionEditorViewController,

		_aras: null,

		_arasModules: null,

		_itemPresenter: null,

		_closeHandler: null,

		_isEditMode: false,

		_applyButtonElement: null,

		_editButtonElement: null,

		_editorFrameElement: null,

		_usageConditionVariabilityItemRelationshipItemType: null,

		_usageConditionItemNode: null,

		_usageConditionItem: null,

		_isVariabilityItemSelected: false,

		_isUsageConditionValid: false,

		_vmModuleSolutionBasedRelativePath: '../Modules/aras.innovator.VariantManagementSample',

		_init: function(
				viewMode,
				applyButtonElement,
				cancelButtonElement,
				editButtonElement,
				editorIframeElement) {
			this._arasModules = this._aras.getMostTopWindowWithAras(window).ArasModules;

			this._setupApplyButton(applyButtonElement);
			this._setupCancelButton(cancelButtonElement);
			this._setupEditButton(editButtonElement);
			this._setupEditorPresentation(viewMode, editorIframeElement);
		},

		_setupApplyButton: function(applyButtonElement) {
			this._applyButtonElement = applyButtonElement;

			this._setupButton(
				this._applyButtonElement,
				'usage_condition_editor_view.apply_button_label',
				this._usageConditionEditorApplyButtonOnClickHandler.bind(this));

			this._setElementEnabledState(this._applyButtonElement, false);
			this._setElementVisibility(this._applyButtonElement, this._isEditMode);
			this._setupListenerForUpdatingApplyButtonState();
		},

		_setupListenerForUpdatingApplyButtonState: function() {
			const updateApplyButtonState = function() {
				this._setElementEnabledState(this._applyButtonElement, this._isExpressionItemValid());
			}.bind(this);

			document.addEventListener(
				'usageConditionInputChange',
				function(e) {
					this._isUsageConditionValid = e.detail.isInputExpressionValid;
					updateApplyButtonState();
				}.bind(this));

			document.addEventListener(
				'variabilityItemChange',
				function(e) {
					this._isVariabilityItemSelected = !!this._aras.uiGetItemByKeyedName('vm_VariabilityItem', e.detail.variabilityItemInputValue, true);
					updateApplyButtonState();
				}.bind(this));
		},

		_setupCancelButton: function(cancelButtonElement) {
			this._setupButton(
				cancelButtonElement,
				'usage_condition_editor_view.cancel_button_label',
				this._usageConditionEditorCancelButtonOnClickHandler.bind(this));
		},

		_setupEditButton: function(editButtonElement) {
			this._editButtonElement = editButtonElement;

			this._setupButton(
				editButtonElement,
				'usage_condition_editor_view.edit_button_label',
				this._usageConditionEditorEditButtonOnClickHandler.bind(this));

			this._setElementVisibility(editButtonElement, !this._isEditMode);
		},

		_setupButton: function(buttonElement, textContentResource, onClickEventListener) {
			buttonElement.querySelector('.aras-button__text').textContent = this._aras.getResource(this._vmModuleSolutionBasedRelativePath, textContentResource);
			buttonElement.addEventListener('click', onClickEventListener);
		},

		_setElementVisibility: function(element, isVisible) {
			element.classList.toggle('aras-hide', !isVisible);
		},

		_setElementEnabledState: function(element, isEnabled) {
			element.disabled = !isEnabled;
		},

		_isExpressionItemValid: function() {
			return this._isVariabilityItemSelected && this._isUsageConditionValid;
		},

		_setupEditorPresentation: function(viewMode, editorIframeElement) {
			const formId = this._aras.getFormId('vm_Expression');
			const formItem = this._aras.getFormForDisplay(formId);
			const formItemNode = formItem.node.cloneNode(true);

			const variabilityItemNode = this._usageConditionItemNode.selectSingleNode(
				'Relationships/Item[@type="' + this._usageConditionVariabilityItemRelationshipItemType + '"]/related_id/Item');

			if (variabilityItemNode) {
				this._usageConditionItem.setPropertyItem('variability_item', this._convertItemNodeToIomItem(variabilityItemNode));
			}

			const itemTypeName = this._usageConditionItemNode.getAttribute('type');
			const itemTypeItemNode = this._aras.getItemTypeNodeForClient(itemTypeName, 'name').cloneNode(true);

			this._editorFrameElement = editorIframeElement;

			this._bindVariabilityItemFieldToFakeItemTypeItemProperty(formItemNode, itemTypeItemNode);

			this._itemPresenter.showInFrame(formItemNode, this._editorFrameElement, viewMode, this._usageConditionItemNode, itemTypeItemNode);
		},

		_bindVariabilityItemFieldToFakeItemTypeItemProperty: function(formItemNode, itemTypeItemNode) {
			const fakePropertyId = '87AE6042FABD48CD96B4C118485A2A7B';

			const itemTypeItem = this._convertItemNodeToIomItem(itemTypeItemNode);
			const variabilityItemFakePropertyItem = this._aras.newIOMItem();
			variabilityItemFakePropertyItem.loadAML('<Item type="Property" id="' + fakePropertyId + '">' +
				'<data_source keyed_name="vm_VariabilityItem" type="ItemType" name="vm_VariabilityItem">A2A374A6028444A58989E0A38E7222B7</data_source>' +
				'<data_type>item</data_type>' +
				'<is_required>1</is_required>' +
				'<name>variability_item</name>' +
			'</Item>');
			itemTypeItem.addRelationship(variabilityItemFakePropertyItem);

			const fieldNode = formItemNode.selectSingleNode('Relationships/Item[@type="Body"]' +
						'/Relationships/Item[@type="Field" and field_type="item" and name="variability_item"]');

			const propertyTypeIdNode = fieldNode.selectSingleNode('propertytype_id');
			ArasModules.xml.setText(propertyTypeIdNode, fakePropertyId);
			propertyTypeIdNode.removeAttribute('is_null');
		},

		_convertItemNodeToIomItem: function(itemNode) {
			const iomItem = this._aras.newIOMItem();
			iomItem.dom = itemNode.ownerDocument;
			iomItem.node = itemNode;

			return iomItem;
		},

		_updateUsageConditionVariabilityItem: function(variabilityItemId) {
			const usageVariabilityItemRelationshipItems = this._usageConditionItem.getRelationships(this._usageConditionVariabilityItemRelationshipItemType);

			if (!usageVariabilityItemRelationshipItems.getItemCount()) {
				const usageVariabilityItemRelationshipItem = this._usageConditionItem.createRelationship(
					this._usageConditionVariabilityItemRelationshipItemType,
					'add');
				usageVariabilityItemRelationshipItem.setProperty('related_id', variabilityItemId);
				return;
			}

			const oldUsageVariabilityItemRelationshipItem = usageVariabilityItemRelationshipItems.getItemByIndex(0);
			if (oldUsageVariabilityItemRelationshipItem.getProperty('related_id') === variabilityItemId) {
				return;
			}

			oldUsageVariabilityItemRelationshipItem.setProperty('related_id', variabilityItemId);

			if (!oldUsageVariabilityItemRelationshipItem.getAction()) {
				oldUsageVariabilityItemRelationshipItem.setAction('edit');
			}
		},

		_usageConditionEditorApplyButtonOnClickHandler: function() {
			this._aras.browserHelper.toggleSpinner(document, true);

			this._updateUsageConditionVariabilityItem(this._usageConditionItem.getProperty('variability_item'));

			this._usageConditionItem.applyAsync('merge')
				.then(function(savedUsageConditionItem) {
					this._aras.browserHelper.toggleSpinner(document, false);

					this._aras.updateInCache(savedUsageConditionItem.node.cloneNode(true));

					this._aras.AlertSuccess(this._aras.getResource(
						'',
						'item_methods_ex.item_saved_successfully',
						'\'' + savedUsageConditionItem.getProperty('keyed_name') + '\' '));

					this._addVariabilityItemRelationshipToSavedUsageCondition(
						savedUsageConditionItem,
						this._usageConditionItem.getPropertyItem('variability_item'));

					this._closeHandler(savedUsageConditionItem);
				}.bind(this))
				.catch(function(soapResponse) {
					this._aras.browserHelper.toggleSpinner(document, false);

					const errorItem = this._aras.newIOMItem();
					errorItem.loadAML(soapResponse.responseText);
					this._aras.AlertError(errorItem);
				}.bind(this));
		},

		_usageConditionEditorCancelButtonOnClickHandler: function() {
			if (!this._aras.isDirtyEx(this._usageConditionItemNode)) {
				this._closeHandler();
				return;
			}

			const confirmDialogParams = {
				additionalButton: [
					{
						text: this._aras.getResource('', 'common.discard'),
						actionName: 'discard'
					}
				],
				okButtonText: this._aras.getResource('', 'common.save'),
				title: this._aras.getResource('', 'item_methods_ex.unsaved_changes')
			};

			if (!this._isExpressionItemValid()) {
				confirmDialogParams.okButtonModifier = 'aras-button_primary effs-button_disabled effs-button-primary_disabled';
			}

			const confirmDialogMessage = this._aras.getResource(this._vmModuleSolutionBasedRelativePath, 'usage_condition_editor_view.changes_not_saved');

			this._arasModules.Dialog.confirm(confirmDialogMessage, confirmDialogParams)
				.then(function(dialogResult) {
					if (dialogResult === 'ok') {
						this._usageConditionEditorApplyButtonOnClickHandler(this._usageConditionItemNode);
					} else if (dialogResult === 'discard') {
						this._aras.removeFromCache(this._usageConditionItemNode);
						this._closeHandler();
					}
				}.bind(this));
		},

		_usageConditionEditorEditButtonOnClickHandler: function() {
			this._isEditMode = true;

			this._itemPresenter.setViewModeInFrame(this._editorFrameElement, this._isEditMode);
			this._setElementVisibility(this._editButtonElement, !this._isEditMode);
			this._setElementVisibility(this._applyButtonElement, this._isEditMode);
		},

		_addVariabilityItemRelationshipToSavedUsageCondition: function(savedUsageConditionItem, variabilityItem) {
			const usageConditionVariabilityItemRelationshipItem = savedUsageConditionItem.createRelationship(
				this._usageConditionVariabilityItemRelationshipItemType);

			usageConditionVariabilityItemRelationshipItem.removeAttribute('isNew');
			usageConditionVariabilityItemRelationshipItem.removeAttribute('isTemp');
			usageConditionVariabilityItemRelationshipItem.removeAttribute('action');

			usageConditionVariabilityItemRelationshipItem.setRelatedItem(variabilityItem);
		}
	};

	window.VmUsageConditionEditorViewController = VmUsageConditionEditorViewController;
}(window));
