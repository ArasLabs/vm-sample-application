define('Modules/aras.innovator.VariantManagementSample/Scripts/variantTree/publishing/htmlExporter', [
	'dojo/_base/declare',
	'dojo/dom-construct'
],
function(declare, domConstruct) {
	return declare(null, {
		templateString:
			'<div class="exportButton" title="Export to html">' +
				'<div class="rotateImage2">' +
					'<svg width="24" xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 64 64"' +
					'xmlns:xlink="http://www.w3.org/1999/xlink" enable-background="new 0 0 64 64">' +
						'<g fill="#edc87e" transform="translate(0 -924.36218)">' +
							'<path d="m47,937.362h7v7h-7z"/>' +
							'<path d="m35.654,936.683h6.859v6.859h-6.859z" transform="matrix(-.983 .1834 -.1834 -.983 249.9145 1857.1118)"/>' +
							'<path d="m35.362,947.391h7.443v7.442h-7.443z" transform="matrix(-.9969 -.0781 .0781 -.9969 3.7923 1902.3726)"/>' +
							'<path d="m34.417,959.97 6.66-2.586 2.506,6.871-6.659,2.586z"/>' +
							'<path d="m35.367,969.646h7.432v7.432h-7.432z" transform="matrix(-.9707 .2402 -.2402 -.9707 310.8092 1908.844)"/>' +
							'<path d="m26.656,931.661 4.932,5.292-5.129,5.089-4.931-5.292z"/>' +
							'<path d="m23.609,946.613 6.873-1.901 1.841,7.092-6.872,1.9z"/>' +
							'<path d="m21.682,962.049 6.117-3.75 3.634,6.312-6.117,3.75z"/>' +
							'<path d="m26.459,970.933 6.013,3.925-3.805,6.205-6.012-3.925z"/>' +
							'<path d="m13.107,930.002 6.639,2.64-2.558,6.852-6.64-2.641z"/>' +
							'<path d="m13.578,953.22-2.961-6.677 6.47-3.055 2.961,6.676z"/>' +
							'<path d="m11.035,959.144 7.011-1.253 1.213,7.235-7.01,1.253z"/>' +
							'<path d="m11.548,976.696 5.839-4.194 4.065,6.026-5.839,4.195z"/>' +
							'<path d="m47,947.362h7v7h-7z"/>' +
							'<path d="m47,958.362h7v7h-7z"/>' +
							'<path d="m47,968.362h7v7h-7z"/>' +
						'</g>' +
						'<g fill="#505050">' +
							'<path d="m48,32l-12,11v-21l12,10z"/>' +
							'<path d="m16,27h22v10h-22z"/>' +
						'</g>' +
					'</svg>' +
				'</div>' +
			'</div>',
		exportButton: null,
		dataBuilder: null,
		scopeName: null,
		_aras: null,
		_iconLoadData: null,
		_isExporting: false,

		constructor: function(params) {
			var connectNode = document.getElementById(params.connectId);

			domConstruct.place(this.templateString, connectNode, 'last');

			this.exportButton = document.querySelector('.exportButton');
			this.exportButton.addEventListener('click', this.export.bind(this));
			this.dataBuilder = params.dataBuilder;
			this.scopeName = params.scopeName;
			this.settings = params.settings;

			this._aras = params.aras;
			this._iconLoadData = {
				cachedIcons: {},
				requestQuery: [],
				waitResponseItems: {},
				activeRequests: {},
				requestCounter: 0,
				defferedResolve: null,
				sessionProcessed: false
			};
		},

		_uploadNodeIcons: function(nodeItems) {
			return new Promise(function(resolve) {
				if (nodeItems && nodeItems.length) {
					var iconLoadData = this._iconLoadData;
					var nodeData;
					var waitResponceItems;
					var iconUrl;
					var i;

					iconLoadData.sessionProcessed = false;

					for (i = 0; i < nodeItems.length; i++) {
						nodeData = nodeItems[i];
						iconUrl = nodeData.icon;

						if (iconUrl && !nodeData._isIconUploaded) {
							if (iconLoadData.cachedIcons[iconUrl]) {
								nodeData.icon = iconLoadData.cachedIcons[iconUrl];
							} else {
								waitResponceItems = iconLoadData.waitResponseItems[iconUrl] || (iconLoadData.waitResponseItems[iconUrl] = []);
								waitResponceItems.push(nodeData);

								this._uploadIcon(iconUrl);
							}
						}
					}

					iconLoadData.sessionProcessed = true;

					if (iconLoadData.requestCounter) {
						iconLoadData.defferedResolve = resolve;
					} else {
						resolve();
					}
				} else {
					resolve();
				}
			}.bind(this));
		},

		_uploadIcon: function(iconUrl) {
			var iconLoadData = this._iconLoadData;

			// if request on this icon wasn't sent
			if (!iconLoadData.activeRequests[iconUrl]) {
				// if number of active icon requests is less than 3 (browser has restriction of 6~8 requests for domen at the same time, so we
				// shouldn't use whole capacity for icon requests)
				if (iconLoadData.requestCounter < 3) {
					var iconRequest = aras.XmlHttpRequestManager.CreateRequest();
					var normalizeIconUrl = this._normalizeIconUrl(iconUrl);

					iconLoadData.requestCounter++;
					iconLoadData.activeRequests[iconUrl] = true;

					iconRequest.open('GET', normalizeIconUrl, true);
					iconRequest.onreadystatechange = function() {
						if (iconRequest.readyState === 4) {
							this._iconLoadedHandler(iconUrl, iconRequest.status === 200 ? iconRequest.responseText : '');
						}
					}.bind(this);

					iconRequest.send();
				} else {
					iconLoadData.requestQuery.push(iconUrl);
				}
			}
		},

		_getIconMimeType: function(iconUrl) {
			var iconExtension = iconUrl.substr(iconUrl.lastIndexOf('.') + 1);

			switch (iconExtension) {
				case 'svg':
					return 'svg+xml';
				default:
					return iconExtension;
			}
		},

		_iconLoadedHandler: function(iconUrl, iconData) {
			var iconLoadData = this._iconLoadData;

			if (iconData) {
				var waitQuery = iconLoadData.waitResponseItems[iconUrl];
				var iconMimeType = this._getIconMimeType(iconUrl);
				var iconClientUrl = 'data:image/' + iconMimeType + ';base64,' + btoa(iconData);
				var itemData;
				var i;

				iconLoadData.cachedIcons[iconUrl] = iconClientUrl;

				for (i = 0; i < waitQuery.length; i++) {
					itemData = waitQuery[i];

					itemData.icon = iconClientUrl;
					itemData._isIconUploaded = true;
				}
			}

			delete iconLoadData.waitResponseItems[iconUrl];
			delete iconLoadData.activeRequests[iconUrl];
			iconLoadData.requestCounter--;

			if (iconLoadData.requestQuery.length) {
				// if there are other icons waiting for upload, then trying to send request
				this._uploadIcon(iconLoadData.requestQuery.shift());
			} else if (iconLoadData.sessionProcessed) {
				// if there are no icons in requestQuery and all node items were processed, then resolve
				iconLoadData.defferedResolve();
				iconLoadData.defferedResolve = null;
			}
		},

		_normalizeIconUrl: function(iconUrl) {
			if (iconUrl.toLowerCase().indexOf('vault:///?fileid=') === 0) {
				var fileId = iconUrl.replace(/vault:\/\/\/\?fileid=/i, '');

				return this._aras.IomInnovator.getFileUrl(fileId, this._aras.Enums.UrlType.SecurityToken);
			}

			return iconUrl;
		},

		export: function() {
			if (!this._isExporting) {
				this._isExporting = true;

				this._uploadNodeIcons(this.dataBuilder.generationData.nodeItems).then(function() {
					var variantTreeData = JSON.stringify({
						generationData: this.dataBuilder.generationData,
						validCombinations: this.dataBuilder.validCombinations,
						scopeName: this.scopeName,
						settings: this.settings
					});
					var xmlhttp = this._aras.XmlHttpRequestManager.CreateRequest();

					xmlhttp.open('POST', '../Modules/aras.innovator.VariantManagementSample/variantTreeViewPublishing');
					xmlhttp.onreadystatechange = function() {
						if (xmlhttp.readyState === 4 && xmlhttp.status === 200) {
							var resCallback = function() {
								return xmlhttp.responseText;
							};

							this._aras.saveString2File(resCallback, 'html', 'VariantTree');
							this._isExporting = false;
						}
					}.bind(this);
					xmlhttp.send(variantTreeData);
				}.bind(this));
			} else {
				this._aras.AlertError('Previous exporting in progress.');
			}
		}
	});
});
