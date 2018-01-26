define([
	'dojo/_base/declare',
	'dojo/_base/connect',
	'dijit/_WidgetBase',
	'dijit/_TemplatedMixin',
	'Aras/Client/Controls/Experimental/LazyLoaderBase'
],
function(declare, connect, _WidgetBase, _TemplatedMixin, LazyLoaderBase) {
	return declare('Aras.Innovator.Solutions.CFG.UrlViewer', [_WidgetBase, _TemplatedMixin, LazyLoaderBase], {
		_isLoaded: false,

		constructor: function(inputParameters) {
			var onLoadHandler = function() {
				this._isLoaded = true;
				this.domNode.removeEventListener('load', onLoadHandler);

				this.onloaded();
			}.bind(this);

			inputParameters = inputParameters || {};

			this.templateString = '<iframe id="scope_editor_frame" src="' + (inputParameters.targetUrl || '') + '" frameborder="0" scrolling="auto"' +
			' style="width: 100%; height: 100%;"></iframe>';

			connect.connect(this, 'buildRendering', function() {
				this.domNode.addEventListener('load', onLoadHandler);
			}.bind(this));
		},

		startup: function() {
			this.inherited(arguments);
		},

		onloaded: function() {
		},

		isContentLoaded: function() {
			return this._isLoaded;
		}
	});
});
