define('Modules/aras.innovator.VariantManagementSample/Scripts/scopeRules/dataStore', [
	'dojo/_base/declare',
	'Modules/aras.innovator.VariantManagementSample/Scripts/scopeRules/modelItem',
	'Controls/Common/RenderUtils',
	'Modules/aras.innovator.VariantManagementSample/Scripts/scopeRules/modelEnums'
],
function(declare, ModelItem, RenderUtils, ModelEnums) {
	return declare(null, {
		_enums: null,
		treeModelCollection: [],
		itemsHash: null,
		aras: null,
		itemSorter: null,
		sortingActive: null,

		constructor: function(initialArguments) {
			this.aras = initialArguments.aras;

			this.itemtypeiconcache = {};
			this.itemsHash = {};
			this._enums = ModelEnums;

			this.sortingActive = false;
			this.itemSorter = initialArguments.itemSorter || this._storeItemSorter.bind(this);
		},

		getChildren: function(element) {
			return element.children.slice();
		},

		getChildIndex: function(targetItem) {
			if (targetItem && targetItem.parent) {
				var sortedChildren = this.getChildren(targetItem.parent);

				return sortedChildren.indexOf(targetItem);
			}

			return -1;
		},

		getChildByIndex: function(targetItem, itemIndex) {
			if (targetItem) {
				var sortedChildren = this.getChildren(targetItem);

				return (itemIndex >= 0 && itemIndex < sortedChildren.length) ? sortedChildren[itemIndex] : null;
			}

			return null;
		},

		registerItem: function(targetItem) {
			if (targetItem) {
				this.itemsHash[targetItem.uniqueId] = targetItem;
			}
		},

		unregisterItem: function(targetItem) {
			if (targetItem) {
				delete this.itemsHash[targetItem.uniqueId];
			}
		},

		_storeItemSorter: function(firstItem, secondItem) {
			var firstItemName = aras.getItemProperty(firstItem.node, 'name');
			var secondItemName = aras.getItemProperty(secondItem.node, 'name');

			return firstItemName.localeCompare(secondItemName);
		},

		getRootElement: function() {
			var rootElements = this.treeModelCollection.filter(function(item) {
				return item.isRoot();
			});

			return rootElements.length && rootElements[0];
		},

		getElementById: function(uniqueId) {
			return this.itemsHash[uniqueId];
		},

		isRecursiveElement: function(sourceElement, itemId) {
			if (sourceElement && itemId) {
				while (sourceElement) {
					if (sourceElement.itemId === itemId) {
						return true;
					}

					sourceElement = this.getElementById(sourceElement.parentId);
				}
			}

			return false;
		},

		getItemByIdPath: function(idPath, searchItemList) {
			if (idPath) {
				var searchItemId;
				var storeItem;
				var foundItem;
				var itemId;
				var uniqueId;
				var shiftedPath;
				var i;

				idPath = Array.isArray(idPath) ? idPath : [idPath];
				shiftedPath = idPath.slice();
				searchItemId = shiftedPath.shift();

				if (!searchItemList) {
					searchItemList = [];

					for (uniqueId in this.itemsHash) {
						searchItemList.push(this.itemsHash[uniqueId]);
					}
				}

				for (i = 0; i < searchItemList.length; i++) {
					storeItem = searchItemList[i];
					itemId = storeItem.isGroup ? storeItem.dataType : storeItem.itemId;

					if (itemId === searchItemId) {
						foundItem = shiftedPath.length ? this.getItemByIdPath(shiftedPath, storeItem.children) : storeItem;
					}

					if (foundItem) {
						return foundItem;
					}
				}
			}
		},

		getIconPath: function(treeElement) {
			var itemData = treeElement.itemData;
			var iconPath;

			if (itemData.isGroup) {
				iconPath = '../images/folder.svg';
			} else {
				iconPath = this.itemtypeiconcache[itemData.dataType];

				if (!iconPath) {
					var itemType = this.aras.getItemTypeDictionary(itemData.dataType);

					if (itemType) {
						iconPath = this.aras.getItemProperty(itemType.node, 'large_icon') || '../images/DefaultItemType.svg';
					}

					this.itemtypeiconcache[itemData.dataType] = iconPath;
				}
			}

			return iconPath || '../images/folder.svg';
		},

		getTreeNodeName: function(node) {
			var htmlUtils = RenderUtils.HTML;
			var name = this.aras.getItemProperty(node, 'name');
			return htmlUtils.wrapInTag(name, 'span', {class: 'NameElementNamePart'});
		},

		setItemRelationshipUpdate: function(node) {
			node.setAttribute('isDirty', '1');
			this.setActionToNode(node, 'update');
		},

		removeElementTreeModel: function(treeElement) {
			for (var i = 0; i < this.treeModelCollection.length; i++) {
				if (this.treeModelCollection[i] === treeElement) {
					this.treeModelCollection.splice(i, 1);
					break;
				}
			}
		},

		isElementEditable: function(targetElement) {
			var isEditable = true;

			if (targetElement.isGroup) {
				isEditable = false;
			} else if (targetElement.relationshipNode) {
				var relationshipModelType = this._enums.getModelTypeFromItemType(targetElement.relationshipNode.getAttribute('type'));

				if (relationshipModelType === this._enums.ModelItemTypes.GenericItemStructure) {
					return false;
				}
			}

			return isEditable;
		},

		removeElement: function(treeElement) {
			if (treeElement.isNew()) {
				this.removeElementTreeModel(treeElement);
			}
		},

		onElementPropertyChanged: function(storeElement) {
			this.validateElement(storeElement);
		},

		validateElement: function(targetElement) {
			if (targetElement) {
				var clonedNode = targetElement.node.cloneNode(true);
				var relationshipsNode = clonedNode.selectSingleNode('Relationships');
				var errorMessage = '';
				var validationErrors;
				var i;

				if (relationshipsNode) {
					clonedNode.removeChild(relationshipsNode);
				}

				validationErrors = this.aras.clientItemValidation(clonedNode.getAttribute('type'), clonedNode, false);
				for (i = 0; i < validationErrors.length; i++) {
					errorMessage = errorMessage + validationErrors[i].message + '</br>';
				}

				targetElement.setWarning(errorMessage);
			}
		}
	});
});
