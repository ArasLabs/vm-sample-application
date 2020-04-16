define([
	'dojo/_base/declare',
	'Controls/RuleEditor/InputGroups/GrammarInputGroup'
],
function(declare, GrammarInputGroup) {
	return declare([GrammarInputGroup], {
		applyIntellisenseValue: function(selectedValue, intellisenseContext) {
			const isStandardGrammarLexem = this.valueParser.standardGrammarLexemes.has(selectedValue);

			if (!isStandardGrammarLexem) {
				const latinCharactersAndNumbersRegExp = /^[0-9A-Za-z]+$/;
				const currentLexem = intellisenseContext.targetLexem;

				let isOpeningSquareBracketPresent = false;
				let isClosingSquareBracketPresent = false;
				let nextLexemText;

				if (intellisenseContext.replaceLength) {
					nextLexemText = currentLexem.text.substr(intellisenseContext.replaceLength, 1);
				} else {
					const nextLexemStartPosition = this._getLexemEndPosition(currentLexem);
					const nextLexem = this._getLexemByCursorPosition(nextLexemStartPosition);

					nextLexemText = nextLexem.text;
				}

				if (nextLexemText === ']') {
					isClosingSquareBracketPresent = true;
				}

				const currentLexemStartPosition = this._getLexemStartPosition(currentLexem);

				if (currentLexemStartPosition > 0) {
					const previousLexem = this._getLexemByCursorPosition(currentLexemStartPosition - 1);

					if (previousLexem.text === '[') {
						isOpeningSquareBracketPresent = true;
					}
				}

				if (isOpeningSquareBracketPresent || !latinCharactersAndNumbersRegExp.test(selectedValue)) {
					selectedValue = (isOpeningSquareBracketPresent ? '' : '[') + selectedValue + (isClosingSquareBracketPresent ? '' : ']');

					intellisenseContext.numberOfAddedLexemes = (isOpeningSquareBracketPresent ? 0 : 1) + (isClosingSquareBracketPresent ? 0 : 1);
				}
			}

			return this.inherited(arguments);
		}
	});
});
