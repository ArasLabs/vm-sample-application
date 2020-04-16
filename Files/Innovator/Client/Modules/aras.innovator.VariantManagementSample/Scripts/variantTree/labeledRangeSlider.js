define('Modules/aras.innovator.VariantManagementSample/Scripts/variantTree/labeledRangeSlider', [
	'dojo/_base/declare'
],
function(declare) {
	return declare('Controls.LabeledRangeSlider', null, {
		templateString: '<div id="{sliderId}" class="LabeledRangeSliderControl">' +
			'<span class="labelNode"></span>' +
			'<input class="sliderNode" type="range" min="{minValue}" max="{maxValue}" step="{changeStep}" value="{value}">' +
			'<div class="valueNode"></div>' +
		'</div>',
		connectNode: null,
		sliderNode: null,
		sliderId: null,
		valueNode: null,
		labelNode: null,
		domNode: null,
		_settings: null,
		_isIE: null,

		constructor: function(initialParameters) {
			initialParameters = initialParameters || {};

			this.connectNode = initialParameters.connectId && document.getElementById(initialParameters.connectId);

			if (this.connectNode) {
				this.sliderId = initialParameters.sliderId || '';

				this._settings = {
					maxValue: initialParameters.maxValue || 10,
					minValue: initialParameters.minValue || 0,
					changeStep: initialParameters.step || 1,
					initialValue: initialParameters.value || '',
					// method, which can be passed to customize value for valueNode
					valueFormatter: typeof initialParameters.valueFormatter == 'function' && initialParameters.valueFormatter
				};

				// taken from BrowserInfo: for IE 11.0 and perhaps for later versions
				this._isIE = /Trident\/.*rv:([0-9]{1,}[\.0-9]{0,})/.test(navigator.userAgent);

				this._buildDom();
				this.setLabel(initialParameters.label || '');
			}
		},

		_buildDom: function() {
			if (this.connectNode) {
				var virtualDomNode = this.connectNode.ownerDocument.createElement('div');
				var sliderSettings = this._settings;
				var initedTemplateString = this.templateString
					.replace('{sliderId}', this.sliderId)
					.replace('{maxValue}', sliderSettings.maxValue).replace('{minValue}', sliderSettings.minValue)
					.replace('{changeStep}', sliderSettings.changeStep).replace('{value}', sliderSettings.initialValue);

				virtualDomNode.innerHTML = initedTemplateString;
				this.domNode = virtualDomNode.firstChild;
				this.connectNode.appendChild(this.domNode);

				this.sliderNode = this.domNode.querySelector('.sliderNode');
				this.sliderNode.addEventListener(this._isIE ? 'change' : 'input', this._onChangeHandler.bind(this));
				this.valueNode = this.domNode.querySelector('.valueNode');
				this.labelNode = this.domNode.querySelector('.labelNode');
			}
		},

		setStep: function(newStep) {
			/// <summary>
			/// Set step value for slider value changes.
			/// </summary>
			/// <param name="newStep" type="Number">New change step value.</param>
			if (newStep > 0 && newStep !== this._settings.changeStep) {
				this._settings.changeStep = newStep;
				this.sliderNode.setAttribute('step', newStep);
			}
		},

		setMinValue: function(newValue) {
			/// <summary>
			/// Set min value for slider control.
			/// </summary>
			/// <param name="newValue" type="Number">New min value.</param>
			newValue = parseInt(newValue);

			if (!isNaN(newValue) && newValue !== this._settings.minValue) {
				this._settings.minValue = newValue;
				this.sliderNode.setAttribute('min', newValue);
			}
		},

		setMaxValue: function(newValue) {
			/// <summary>
			/// Set max value for slider control.
			/// </summary>
			/// <param name="newValue" type="Number">New max value.</param>
			newValue = parseInt(newValue);

			if (!isNaN(newValue) && newValue !== this._settings.maxValue) {
				this._settings.maxValue = newValue;
				this.sliderNode.setAttribute('max', newValue);
			}
		},

		_onChangeHandler: function() {
			var newValue = this.sliderNode.value;
			var valueFormatter = this._settings.valueFormatter;

			this.valueNode.textContent = valueFormatter ? valueFormatter(newValue) : newValue.toString().substr(0, 4);
			this._dispatchChangeEvent({'newValue': newValue});
		},

		setLabel: function(newLabel) {
			/// <summary>
			/// Set label for slider control.
			/// </summary>
			/// <param name="newLabel" type="String">New label value.</param>
			var currentLabel = this.labelNode.textContent;

			if (newLabel !== currentLabel) {
				this.labelNode.textContent = newLabel;
			}
		},

		setValue: function(newValue) {
			/// <summary>
			/// Set slider control value.
			/// </summary>
			/// <param name="newValue" type="Number">New value.</param>
			newValue = parseFloat(newValue);
			this.sliderNode.value = Math.max(Math.min(newValue, this._settings.maxValue), this._settings.minValue);

			this._onChangeHandler();
		},

		getValue: function() {
			/// <summary>
			/// Get slider control current value.
			/// </summary>
			/// <returns>Number</returns>
			return parseFloat(this.sliderNode.value);
		},

		getStep: function() {
			/// <summary>
			/// Get slider control value change step.
			/// </summary>
			/// <returns>Number</returns>
			return this._settings.changeStep;
		},

		getMinValue: function() {
			/// <summary>
			/// Get slider control min value.
			/// </summary>
			/// <returns>Number</returns>
			return this._settings.minValue;
		},

		getMaxValue: function() {
			/// <summary>
			/// Get slider control max value.
			/// </summary>
			/// <returns>Number</returns>
			return this._settings.maxValue;
		},

		_dispatchChangeEvent: function(detail) {
			var event;

			if (this._isIE) {
				event = document.createEvent('CustomEvent');
				event.initCustomEvent('onValueChanged', false, false, detail);
			} else {
				event = new CustomEvent('onValueChanged', {'detail': detail});
			}

			this.domNode.dispatchEvent(event);
		}
	});
});
