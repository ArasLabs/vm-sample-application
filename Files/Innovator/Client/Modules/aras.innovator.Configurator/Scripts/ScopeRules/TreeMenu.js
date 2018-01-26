/* global define */
define([
	'dojo/_base/declare',
	'dojo/aspect',
	'dijit/Menu',
	'Configurator/Scripts/ScopeRules/ModelEnums'
],
function(declare, aspect, DijitMenu, Enums) {
	return declare(null, {
		treeMenu: null,
		targetElement: null,
		aras: null,
		dataStore: null,

		constructor: function(initialArguments) {
			initialArguments = initialArguments || {};

			if (initialArguments.aras && initialArguments.targetNodeIds) {
				var targetNodeIds = initialArguments.targetNodeIds;

				targetNodeIds = Array.isArray(targetNodeIds) ? targetNodeIds : [targetNodeIds];

				this.aras = initialArguments.aras;
				this.dataStore = initialArguments.dataStore;
				this.treeMenu = new DijitMenu({
					targetNodeIds: targetNodeIds,
					selector: '.dijitTreeRow'
				});

				aspect.after(this.treeMenu, 'onItemClick', this.onMenuItemClick.bind(this), true);
				aspect.before(this.treeMenu, '_openMyself', this.onBeforeOpen.bind(this));
				this.treeMenu.startup();
			}
		},

		onBeforeOpen: function() {
			this.removeAll();
		},

		getMenuItemDescriptors: function(targetModelItem, isEditMode) {
			var isMenuDisabled = !isEditMode ||
								targetModelItem.isDeleted() ||
								targetModelItem.isParentDeleted() ||
								targetModelItem.isVirtual;
			var menuItems = [];

			this.targetElement = targetModelItem;

			if (!isMenuDisabled) {
				if (targetModelItem.isRoot()) {
					this.appendMenuItemDescriptor('addelement', targetModelItem, menuItems);
				} else {
					this.appendMenuItemDescriptor('addelement', targetModelItem, menuItems);
					this.appendMenuItemDescriptor('unpickelement', targetModelItem, menuItems);
					this.appendMenuItemDescriptor('lockelement', targetModelItem, menuItems);
					this.appendMenuItemDescriptor('unlockelement', targetModelItem, menuItems);
				}
			}

			return menuItems;
		},

		isActionAllowed: function(actionName, targetElement) {
			var isAllowed = true;

			switch (actionName) {
				case 'lockelement':
					if (this.dataStore.isElementEditable(targetElement)) {
						var isItemLocked = this.aras.isLocked(targetElement.node);
						var isItemNew = targetElement.node.getAttribute('action') === 'add';

						if (isItemLocked || isItemNew) {
							isAllowed = false;
						}
					} else {
						isAllowed = false;
					}
					break;
				case 'unlockelement':
					if (this.dataStore.isElementEditable(targetElement)) {
						var isItemLockedByUser = this.aras.isLockedByUser(targetElement.node);

						if (!isItemLockedByUser) {
							isAllowed = false;
						}
					} else {
						isAllowed = false;
					}
					break;
				default:
					break;
			}

			return isAllowed;
		},

		appendMenuItemDescriptor: function(actionName, targetElement, menuItems) {
			var newMenuItems = [];
			var modeItemType = Enums.getModelTypeFromItemType(targetElement.dataType);
			var isActionAllowed;
			var menuItem;
			var i;

			switch (actionName) {
				case 'lockelement':
					isActionAllowed = this.isActionAllowed(actionName, targetElement);
					newMenuItems.push({name: 'Lock', id: actionName, disable: !isActionAllowed});
					break;
				case 'unlockelement':
					isActionAllowed = this.isActionAllowed(actionName, targetElement);
					newMenuItems.push({name: 'Unlock', id: actionName, disable: !isActionAllowed});
					break;
				case 'unpickelement':
					newMenuItems.push({name: 'Unpick', id: actionName});
					break;
				case 'addelement':
					var relationshipTypes = targetElement.isGroup ? [modeItemType] : Enums.getRelationshipModelTypes(modeItemType);
					var relatedModelType;
					var typeName;
					var typelabel;
					var isCreateAllowed;
					var relationshipType;

					for (i = 0; i < relationshipTypes.length; i++) {
						relationshipType = relationshipTypes[i];
						isActionAllowed = this.isActionAllowed(actionName, targetElement);
						relatedModelType = Enums.getRelatedItemModelType(relationshipType);
						typeName = Enums.getItemTypeFromModelType(relatedModelType);
						typelabel = Enums.getItemLabelFromModelType(relatedModelType);
						isCreateAllowed = relationshipType !== Enums.ModelItemTypes.GenericItemStructure && relationshipType !== Enums.ModelItemTypes.Rule;

						menuItem = {id: 'addelement:' + typeName, name: 'Add ' + typelabel, subMenu: []};

						if (isCreateAllowed) {
							menuItem.subMenu.push({
								name: 'Create new',
								id: actionName + ':create_' + typeName,
								disable: !isActionAllowed,
								additionalParameters: {
									relationshipType: Enums.getItemTypeFromModelType(relationshipType),
									addAction: 'create'
								}
							});
						}

						menuItem.subMenu.push({
							name: 'Pick item',
							id: actionName + ':pick_' + typeName,
							disable: !isActionAllowed,
							additionalParameters: {
								relationshipType: Enums.getItemTypeFromModelType(relationshipType),
								addAction: 'pick'
							}
						});

						newMenuItems.push(menuItem);
					}
					break;
			}

			for (i = 0; i < newMenuItems.length; i++) {
				menuItems.push(newMenuItems[i]);
			}
		},

		onMenuItemClick: function(menuItem) {
		},

		removeAll: function() {
			this.treeMenu._stopPendingCloseTimer();
			this.treeMenu._closeChild();
			this.treeMenu.destroyDescendants();
		}
	});
});
