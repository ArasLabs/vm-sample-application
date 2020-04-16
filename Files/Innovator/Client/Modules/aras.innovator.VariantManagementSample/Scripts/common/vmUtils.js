(function(window) {
	'use strict';

	function VmUtils(aras) {
		this._aras = aras;

		this._itemTypeIconUrlCache = new Map();
	}

	VmUtils.prototype = {
		constructor: VmUtils,

		_aras: null,

		_itemTypeIconUrlCache: null,

		convertItemNodeToIomItem: function(itemNode) {
			const iomItem = this._aras.newIOMItem();
			iomItem.dom = itemNode.ownerDocument;
			iomItem.node = itemNode;

			return iomItem;
		},

		getItemTypeIconUrl: function(itemTypeName) {
			let iconUrl = this._itemTypeIconUrlCache.get(itemTypeName);

			if (!iconUrl) {
				const itemTypeItem = this._aras.getItemTypeForClient(itemTypeName);
				const iconPath = itemTypeItem.getProperty('open_icon') || '../images/DefaultItemType.svg';
				const vaultFileRegExp = /^vault:\/\/\/\?fileId=(.+)$/i;
				const vaultFileMatch = iconPath.match(vaultFileRegExp);

				if (vaultFileMatch) {
					const fileId = vaultFileMatch[1];

					iconUrl = this._aras.IomInnovator.getFileUrl(fileId, this._aras.Enums.UrlType.SecurityToken);
				} else {
					iconUrl = this._aras.getScriptsURL(iconPath);
				}

				this._itemTypeIconUrlCache.set(itemTypeName, iconUrl);
			}

			return iconUrl;
		}
	};

	window.VmUtils = VmUtils;
}(window));
