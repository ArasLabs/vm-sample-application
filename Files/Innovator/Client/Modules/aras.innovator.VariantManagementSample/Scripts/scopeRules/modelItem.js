/* global define */
define('Modules/aras.innovator.VariantManagementSample/Scripts/scopeRules/modelItem', [
	'dojo/_base/declare',
	'Modules/aras.innovator.VariantManagementSample/Scripts/scopeRules/modelEnums'
],
function(declare, ModelEnums) {
	return declare(null, {
		_uniqueIdCounter: {count: 1},
		_itemData: null,
		_warning: null,
		_enums: null,

		parent: null,
		ownerStore: null,
		uniqueId: null,
		children: null,
		groups: null,
		fields: null,

		constructor: function(itemData) {
			this.uniqueId = this.getUniqueId();

			this._itemData = itemData ? itemData : null;
			this._warning = '';
			this.children = [];
			this.groups = {};
			this.fields = [this];
			this._enums = ModelEnums;
			this.defineProperties();
		},

		defineProperties: function() {
			Object.defineProperty(this, 'itemData', {
				get: function() {
					return this._itemData;
				},
				set: function(newData) {
					this._itemData = newData;
				}
			});

			Object.defineProperty(this, 'itemId', {
				get: function() {
					return this._itemData && this._itemData.id;
				}
			});

			Object.defineProperty(this, 'id', {
				get: function() {
					return this.uniqueId;
				}
			});

			Object.defineProperty(this, 'icon', {
				get: function() {
					return this.ownerStore && this.ownerStore.getIconPath(this);
				}
			});

			Object.defineProperty(this, 'node', {
				get: function() {
					return this._itemData && this._itemData.node;
				}
			});

			Object.defineProperty(this, 'relationshipNode', {
				get: function() {
					return this._itemData && this._itemData.relationshipNode;
				}
			});

			Object.defineProperty(this, 'dataType', {
				get: function() {
					return this._itemData && this._itemData.dataType;
				}
			});

			Object.defineProperty(this, 'isGroup', {
				get: function() {
					return Boolean(this._itemData && this._itemData.isGroup);
				}
			});

			var isVirtual = false;
			Object.defineProperty(this, 'isVirtual', {
				get: function() {
					return isVirtual;
				},
				set: function(val) {
					isVirtual = val;
					for (var i = 0; i < this.children.length; i++) {
						this.children[i].isVirtual = val;
					}
				}
			});
		},

		getUniqueId: function() {
			return this._uniqueIdCounter.count++;
		},

		isRegistered: function() {
			return Boolean(this.ownerStore);
		},

		registerItem: function(dataStore) {
			if (dataStore && this.ownerStore !== dataStore) {
				var currentChild;
				var i;

				this.unregisterItem();

				this.ownerStore = dataStore;
				this.ownerStore.registerItem(this);

				for (i = 0; i < this.children.length; i++) {
					currentChild = this.children[i];
					currentChild.registerItem(dataStore);
				}
			}
		},

		unregisterItem: function() {
			if (this.isRegistered()) {
				var currentChild;
				var i;

				this.ownerStore.unregisterItem(this);

				for (i = 0; i < this.children.length; i++) {
					currentChild = this.children[i];
					currentChild.unregisterItem();
				}
			}
		},

		getRelationshipType: function(targetItem) {
			var itemData = this._itemData;

			return itemData.relationshipNode && itemData.relationshipNode.getAttribute('type');
		},

		addChild: function(targetItem) {
			if (targetItem && targetItem.parent !== this) {
				var relationshipType = targetItem.isGroup ? targetItem.dataType : targetItem.getRelationshipType();
				var dataTypeGroup = this.groups[relationshipType];
				var oldChildCount = this.children.length;

				if (targetItem.parent) {
					targetItem.parent.removeChild(targetItem);
				}

				if (targetItem.isGroup) {
					if (!dataTypeGroup) {
						this.groups[relationshipType] = targetItem;
						this.children.push(targetItem);
						targetItem.parent = this;
					}
				} else {
					if (dataTypeGroup) {
						dataTypeGroup.addChild(targetItem);
					} else {
						this.children.push(targetItem);
						targetItem.parent = this;
					}
				}

				if (oldChildCount !== this.children.length) {
					this.sortChildren();
				}

				targetItem.registerItem(this.ownerStore);
			}
		},

		removeChild: function(targetItem) {
			if (targetItem) {
				var dataType = targetItem.dataType;
				var dataTypeGroup = this.groups[dataType];

				if (targetItem.parent === this) {
					var childIndex = this.children.indexOf(targetItem);

					if (targetItem.isGroup) {
						delete this.groups[dataType];
					}

					this.children.splice(childIndex, 1);

					targetItem.unregisterItem();
					targetItem.parent = null;
				} else if (targetItem.parent === dataTypeGroup) {
					dataTypeGroup.removeChild(targetItem);
				}
			}
		},

		getChildren: function(isDeepSearch, itemTypeFilter, foundChildren) {
			var childItems = this.children;
			var currentChild;
			var i;

			foundChildren = foundChildren || [];

			for (i = 0; i < childItems.length; i++) {
				currentChild = childItems[i];

				if (!currentChild.isVirtual && (!itemTypeFilter || currentChild.dataType == itemTypeFilter)) {
					foundChildren.push(currentChild);
				}

				if (isDeepSearch) {
					currentChild.getChildren(isDeepSearch, itemTypeFilter, foundChildren);
				}
			}

			return foundChildren;
		},

		getTreeLabel: function() {
			var elementLabel = '';
			var modelElement = this._itemData;

			if (modelElement) {
				elementLabel += modelElement.name;

				if (!modelElement.isGroup) {
					elementLabel += this.getStatusMarksContent();
				}
			}

			return elementLabel;
		},

		getTreeClasses: function() {
			var treeClasses = [];

			if (this.isDeleted() || this.isParentDeleted()) {
				treeClasses.push('DeletedElement');
			}
			if (this.isVirtual) {
				treeClasses.push('VirtualElement');
			}

			return treeClasses.join(' ');
		},

		getType: function() {
			if (this._itemData) {
				if (this._itemData.type) {
					return this._itemData.type;
				}
			}
			return '';
		},

		sortChildren: function(deepSort) {
			if (this.ownerStore && this.ownerStore.sortingActive) {
				var i;

				this.children.sort(this.ownerStore.itemSorter);

				if (deepSort) {
					for (i = 0; i < this.children.length; i++) {
						this.children[i].sortChildren(deepSort);
					}
				}
			}
		},

		getId: function() {
			return (this._itemData && this._itemData.id) || '';
		},

		isRoot: function() {
			return !this.parent;
		},

		isNew: function() {
			var itemNode = this.relationshipNode || this.node;

			return Boolean(itemNode && itemNode.getAttribute('action') === 'add');
		},

		isDeleted: function() {
			var itemNode = this.relationshipNode || this.node;

			return Boolean(itemNode && itemNode.getAttribute('action') === 'delete');
		},

		isParentDeleted: function(targetElement) {
			return this.parent ? (this.parent.isDeleted() || this.parent.isParentDeleted()) : false;
		},

		wrapInTag: function(sourceString, tagName, tagAttributes) {
			if (tagName) {
				var attributeString = '';

				if (tagAttributes) {
					for (var attributeName in tagAttributes) {
						attributeString += ' ' + attributeName + '="' + tagAttributes[attributeName] + '"';
					}
				}

				return '<' + tagName + attributeString + '>' + sourceString + '</' + tagName + '>';
			} else {
				return sourceString;
			}
		},

		encodeValue: function(value) {
			return value && value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&apos;').replace(/<([^>])*>/g, '')
				.replace(/</g, '&lt;').replace(/>/g, '&gt;');
		},

		setWarning: function(warningMessage) {
			if (this._itemData) {
				this._itemData.warning = warningMessage;
			}
		},

		getItemIdPath: function() {
			var idPath = [this.isGroup ? this.dataType : this.itemId];
			var parentElement = this.parent;

			while (parentElement) {
				idPath.push(parentElement.isGroup ? parentElement.dataType : parentElement.itemId);

				parentElement = parentElement.parent;
			}

			idPath.reverse();

			return idPath;
		},

		getUniqueIdPath: function() {
			var idPath = [this.uniqueId];
			var parentElement = this.parent;

			while (parentElement) {
				if (!parentElement.isGroup) {
					idPath.push(parentElement.uniqueId);
				}

				parentElement = parentElement.parent;
			}

			idPath.reverse();

			return idPath;
		},

		getStatusMarksContent: function() {
			var modelElement = this._itemData;

			if (modelElement) {
				var relationshipAction = modelElement.relationshipNode && modelElement.relationshipNode.getAttribute('action');
				var relatedItemAction = modelElement.node.getAttribute('action');
				var imageFolder = '../../images/';
				var marksContent = '';
				var statusMarkData = [];
				var imagePath;
				var markData;
				var i;

				switch (relationshipAction) {
					case 'add':
						statusMarkData.push('New.svg');
						break;
					case 'update':
						statusMarkData.push('LockedAndModified.svg');
						break;
					case 'delete':
						statusMarkData.push('Delete.svg');
						break;
					default:
						break;
				}

				switch (relatedItemAction) {
					case 'update':
						statusMarkData.push('LockedAndModified.svg');
						break;
					default:
						if (modelElement.lockState) {
							statusMarkData.push(modelElement.lockState === this._enums.LockStates.Locked ? 'Locked.svg' : 'LockedByMe.svg');
						}
						break;
				}

				if (modelElement.warning) {
					statusMarkData.push({src: 'Error.svg', title: modelElement.warning});
				}

				for (i = 0; i < statusMarkData.length; i++) {
					markData = statusMarkData[i];
					markData = typeof markData === 'string' ? {src: markData} : markData;

					marksContent += this.wrapInTag('', 'img', {
						src: imageFolder + markData.src,
						class: 'ConditionMark',
						style: i > 0 ? 'right:' + i * 20 + 'px;' : '',
						title: this.encodeValue(markData.title) || ''
					});
				}

				return marksContent;
			}
		}
	});
});
