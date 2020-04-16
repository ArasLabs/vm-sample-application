(function(window) {
	'use strict';

	function VariabilityItemStructureSelectionTreeDataProvider(parameters) {
		this._aras = parameters.aras;
		this._dataLoader = parameters.dataLoader;
		this._utils = parameters.utils;
		this._rowObjectByItemId = new Map();
	}

	VariabilityItemStructureSelectionTreeDataProvider.prototype = {
		constructor: VariabilityItemStructureSelectionTreeDataProvider,

		_aras: null,

		_dataLoader: null,

		_utils: null,

		_rowObjectByItemId: null,

		_itemTypesAllowedAsLeafLevel: new Set([
			'vm_Option'
		]),

		_itemTypeTreeToBeCached: new Set([
			'vm_VariabilityItem',
			'vm_Feature'
		]),

		get scopeItemNode() {
			return this._dataLoader.scopeItemNode;
		},

		fetch: function() {
			const variabilityItemNode = this._dataLoader.requestSampleRelationshipData(['vm_VariabilityItemFeature','vm_VariabilityItemStructure']);

			let tree = [];
			if (variabilityItemNode) {
				const variabilityItem = this._convertItemNodeToIomItem(variabilityItemNode);

				tree = this._buildRowTree(variabilityItem);
			}

			return tree;
		},

		_buildRowTree: function(variabilityItem) {
			this._rowObjectByItemId.clear();

			const row = this._translateItemToRowObject(variabilityItem);

			const roots = [];
			if (row.children.length) {
				roots.push(row);
			}

			return roots;
		},

		_convertItemNodeToIomItem: function(itemNode) {
			const iomItem = this._aras.newIOMItem();
			iomItem.dom = itemNode.ownerDocument;
			iomItem.node = itemNode;

			return iomItem;
		},

		_translateItemToRowObject: function(item, sourceRelationshipItem) {
			const itemTypeName = item.getType();
			const itemId = item.getID();

			let rowObject = this._rowObjectByItemId.get(itemId);

			if (rowObject) {
				return rowObject;
			}

			const rowInfo = {
				itemTypeName: itemTypeName,
				itemId: itemId
			};

			if (sourceRelationshipItem) {
				rowInfo.sourceRelationshipItemTypeName = sourceRelationshipItem.getType();
				rowInfo.sourceRelationshipItemId = sourceRelationshipItem.getID();
			}

			const metadata = this._defineMetadata(itemTypeName);

			rowObject = {
				label: this._obtainLabelValue(metadata.formatter, item.getProperty('name')),
				uniqueElementId: this._obtainUniqueElementId(rowInfo),
				rowInfo: rowInfo,
				metadata: metadata,
				children: []
			};

			if (this._itemTypeTreeToBeCached.has(itemTypeName)) {
				this._rowObjectByItemId.set(itemId, rowObject);
			}

			const relationshipItems = item.getRelationships();
			const relationshipItemCount = relationshipItems.getItemCount();

			for (let i = 0; i < relationshipItemCount; i++) {
				const relationshipItem = relationshipItems.getItemByIndex(i);
				const relatedItem = relationshipItem.getRelatedItem();
				const relatedItemTypeName = relatedItem.getType();

				const childRowObject = this._translateItemToRowObject(relatedItem, relationshipItem);

				if (childRowObject.children.length || this._itemTypesAllowedAsLeafLevel.has(relatedItemTypeName)) {
					rowObject.children.push(childRowObject);
				}
			}

			return rowObject;
		},

		_defineMetadata: function(itemTypeName) {
			const iconUrl = this._utils.getItemTypeIconUrl(itemTypeName);
			const metadata = {
				formatter: 'vm_iconText',
				iconUrl: iconUrl
			};

			if (itemTypeName === 'vm_Feature' || itemTypeName === 'vm_Option') {
				metadata.formatter = 'vm_iconTextBoolean';
				metadata.type = 'radio';
				metadata.getTextBooleanCssClassName = this._getIconTextBooleanFormatterClass;

				if (itemTypeName === 'vm_Feature') {
					metadata.isDisabled = function() { return true; };
					metadata.getBooleanCssClassName = this._getFeatureBooleanCssClassName;
				}
			}

			return metadata;
		},

		_getFeatureBooleanCssClassName: function(headId, rowId, value) {
			return value.isChecked ? '' : 'aras-hide';
		},

		_getIconTextBooleanFormatterClass: function() {
			return 'vm-aras-grid-row-cell-text-boolean_boolean-alignment_right';
		},

		_obtainUniqueElementId: function(rowInfo) {
			if (rowInfo.itemTypeName === 'vm_Option') {
				return rowInfo.sourceRelationshipItemId;
			}

			return rowInfo.itemId;
		},

		_obtainLabelValue: function(formatterName, label) {
			let cellValue;

			switch (formatterName) {
				case 'vm_iconText':
					cellValue = label;
					break;
				case 'vm_iconTextBoolean':
					cellValue = {
						text: label
					};
					break;
			}

			return cellValue;
		}
	};

	window.VariabilityItemStructureSelectionTreeDataProvider = VariabilityItemStructureSelectionTreeDataProvider;
}(window));
