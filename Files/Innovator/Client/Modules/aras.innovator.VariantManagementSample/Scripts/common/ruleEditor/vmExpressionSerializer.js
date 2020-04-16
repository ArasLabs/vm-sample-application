define(['dojo/_base/declare',
'EffectivityServices/Scripts/Classes/ExpressionSerializer'],
	function(declare, ExpressionSerializer) {
		return declare(ExpressionSerializer, {
			_initScope: function() {
				if (!this._scopeId) {
					return;
				}

				let scopeItem = this.aras.newIOMItem('Method', 'cfg_GetScopeStructure');

				const targetScope = this.aras.newIOMItem('Method', 'vm_scopeBuilder');
				targetScope.setID(this._scopeId);

				scopeItem.setID(this._scopeId);
				scopeItem.setPropertyItem('targetScope', targetScope);
				scopeItem = scopeItem.apply();

				if (scopeItem.isError()) {
					this._scope = null;

					return this.aras.AlertError(scopeItem);
				}

				this._scope = this._parseScopeToObject(scopeItem);
			}
		});
	});
