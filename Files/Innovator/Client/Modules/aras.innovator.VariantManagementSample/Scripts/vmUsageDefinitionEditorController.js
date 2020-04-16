(function(window) {
	function VmUsageDefinitionEditorController(parameters) {
		this.ExpressionSerializerControl = parameters.ExpressionSerializerControl;
		this.RuleEditorControl = parameters.RuleEditorControl;
		this._aras = parameters.aras;
		this._renderUtils = parameters.renderUtils;
		this._ruleTemplate = parameters.ruleTemplate;
		this._editorControlContainer = parameters.editorControlContainer;
		this._ruleEditorContainer = parameters.ruleEditorContainer;
		this._messageContainer = parameters.messageContainer;
	}

	VmUsageDefinitionEditorController.prototype = {
		constructor: VmUsageDefinitionEditorController,

		ExpressionSerializerControl: null,

		RuleEditorControl: null,

		_aras: null,

		_renderUtils: null,

		_ruleTemplate: null,

		_ruleGrammarTemplateName: 'UsageConditionGroup',

		_initialized: false,

		_isEditMode: false,

		_editorControlContainer: null,

		_ruleEditorContainer: null,

		_messageContainer: null,

		init: function(expressionItem, isEditMode) {
			this._isEditMode = isEditMode;
			this._initialize();
			this._setupItemContext(expressionItem);
			this._setupEditorEnabledState();
			this.loadEditorState(this._aras.getItemProperty(expressionItem, 'variability_item'));
		},

		loadEditorState: function(scopeId) {
			this.expressionSerializer = new this.ExpressionSerializerControl({
				aras: this._aras,
				renderUtils: this._renderUtils.HTML,
				scopeId: scopeId
			});

			this._setupEditor();
		},

		_setupItemContext: function(item) {
			this._expressionItem = item;
			if (this._expressionItem.getAttribute('isTemp') === '1') {
				this._setDefinitionValue('<expression />');
			}
		},

		_setupEditorEnabledState: function() {
			this._editorControlContainer.classList.toggle('effs-definition-editor_disabled', !this._isEditMode);
			this.editorControl.setEditState(this._isEditMode);
		},

		_initialize: function() {
			if (this._initialized) {
				return;
			}

			this.editorControl = new this.RuleEditorControl({
				connectId: this._ruleEditorContainer,
				isEditable: true,
				aras: this._aras,
				template: this._ruleTemplate
			});

			this.editorControl.addEventListener(this, null, 'onStateChanged', this._onEditorStateChanged);
			this.editorControl.addEventListener(this, null, 'onStateChanged', this._markExpressionItemAsDirty);
			this.editorControl.addEventListener(this, null, 'onGroupValueEntered', this._onEditorGroupValueEntered);

			this._editorControlContainer.addEventListener('click', function(event) {
				if (this._isEditMode && (event.target === this._editorControlContainer || event.target === this._messageContainer)) {
					this.editorControl.focus();
				}
			}.bind(this));

			this._initialized = true;
		},

		_onEditorGroupValueEntered: function() {
			const group = this.editorControl.getGroupByName(this._ruleGrammarTemplateName);
			const expressionData = group.getParsedExpression();
			const value = this.expressionSerializer.serializeExpressionDataToXml(expressionData);

			this._setDefinitionValue(value);
		},

		_onEditorStateChanged: function() {
			if (this.editorControl.isInputValid()) {
				this._messageContainer.style.opacity = '0';
			} else {
				this._messageContainer.textContent = this.editorControl.getErrorString();
				this._messageContainer.style.opacity = '1';
			}
		},

		_setDefinitionValue: function(value) {
			this._aras.setItemProperty(this._expressionItem, 'definition', value);
		},

		_markExpressionItemAsDirty: function() {
			if (this.editorControl.isInputStarted() && this.editorControl.isValueModified()) {
				this._expressionItem.setAttribute('isDirty', '1');
			}
		},

		_getDefinitionValue: function() {
			const definitionValue = {};
			definitionValue[this._ruleGrammarTemplateName] = this.expressionSerializer
				.deserializeExpressionToString(this._aras.getItemProperty(this._expressionItem, 'definition'));

			return definitionValue;
		},

		_setupEditor: function() {
			this.editorControl.setInputTemplate(this._ruleTemplate);
			this.editorControl.startNewInput();

			const grammarData = this._getGrammarData(this.expressionSerializer.getScope());
			const grammarGroup = this.editorControl.getGroupByName(this._ruleGrammarTemplateName);

			grammarGroup.setParserProperty('_FeatureNames', grammarData.featureNameCollection);
			grammarGroup.setParserProperty('_OptionNames', grammarData.optionNameCollection);

			this.editorControl.setValue(this._getDefinitionValue());
		},

		_getGrammarData: function(scope) {
			let featureNames;
			const featureNamesByOptionName = {};

			if (scope) {
				const features = scope.variables;
				featureNames = Object.keys(features);

				featureNames.forEach(function(featureName) {
					const options = features[featureName].namedConstants;
					const optionNames = Object.keys(options);

					optionNames.forEach(function(optionName) {
						const optionParentFeatures = featureNamesByOptionName[optionName];

						if (!optionParentFeatures) {
							featureNamesByOptionName[optionName] = [featureName];
						} else {
							optionParentFeatures.push(featureName);
						}
					});
				});
			}

			return {
				featureNameCollection: featureNames,
				optionNameCollection: featureNamesByOptionName
			};
		}
	};

	window.VmUsageDefinitionEditorController = VmUsageDefinitionEditorController;
}(window));
