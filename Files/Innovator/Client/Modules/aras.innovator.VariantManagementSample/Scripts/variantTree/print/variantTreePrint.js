define('Modules/aras.innovator.VariantManagementSample/Scripts/variantTree/print/variantTreePrint', [
	'dojo/_base/declare',
	'dojo/dom-construct'
],
function(declare, domConstruct) {
	return declare(null, {
		templateString:
			'<div class="printButton" title="Print tree">' +
				'<svg width="24" xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 64 64"' +
						'xmlns:xlink="http://www.w3.org/1999/xlink" enable-background="new 0 0 64 64">' +
					'<path fill="none" stroke="#505050" stroke-width="2" d="m42,52-24,0 0-14 24,0 0,15"/>' +
					'<g fill="#727272">' +
						'<path d="m53,39-45,0 0-13 8.438,0 2.812,0 33.75,0 0,4"/>' +
						'<path d="m45,15h8v13h-8z"/>' +
						'<path d="m8,15h8v13h-8z"/>' +
					'</g>' +
					'<path fill="none" stroke="#505050" stroke-width="2" d="m19,9h23v12h-23z"/>' +
					'<g fill="#0072c6">' +
						'<path d="m18,20h25v4h-25z"/>' +
						'<path d="m23,46h14v2h-14z"/>' +
						'<path d="m23,42h14v2h-14z"/>' +
					'</g>' +
				'</svg>' +
			'</div>',
		displayItemName: null,
		printButton: null,
		printWidth: null,
		printHeight: null,
		spacingFactor: null,
		scaleFactor: null,
		pptFactor: null,
		printPageWidth: null,
		commonSvgStyles: [
			'visibility',
			'fill',
			'stroke',
			'stroke-width',
			'font',
			'font-weight',
			'stroke-linejoin',
			'stroke-dasharray',
			'text-anchor',
			'font-size'
		],

		constructor: function(params) {
			var connectNode = document.getElementById(params.connectId);
			domConstruct.place(this.templateString, connectNode, 'last');
			this.printButton = document.querySelector('.printButton');
			this.printButton.addEventListener('click', this.print.bind(this));
			this.displayItemName = params.displayItemName || 'Variant Tree';
		},

		print: function() {
			aras.showStatusMessage('status', 'printing to pdf file', '../images/Progress.gif');
			var frameToPrint;
			var pdfPrinter;
			window.ModulesManager.using(['aras.innovator.Printing/PrintingToPdf']).then(function(printToPdf) {
				pdfPrinter = printToPdf;
				this.pptFactor = pdfPrinter.getPptFactor();
				this.printPageWidth = pdfPrinter.getScreenWidth();
				frameToPrint = this.buildPrintableFrame();
				pdfPrinter.init({
					printPageNumbers: true,
					xOverlapping: 0,
					yOverlapping: 0,
					printWidth: this.printWidth,
					printHeight: this.printHeight
				});
				return this.convertNodeToImage(frameToPrint.contentWindow.document.body, this.printWidth, this.printHeight);
			}.bind(this))
			.then(this.getCroppedImageWithBorder.bind(this))
			.then(function(image) {
				pdfPrinter.createPdfFromImage(image, frameToPrint.contentWindow, this.displayItemName + '.pdf');
				frameToPrint.parentNode.removeChild(frameToPrint);
				aras.clearStatusMessage('status');
			}.bind(this));
		},

		convertNodeToImage: function(nodeToConvert, imageWidth, imageHeight) {
			if (aras.Browser.isIe() || aras.Browser.isEdge()) {
				var getImageFromNode = function() {
					return window.html2canvas(nodeToConvert);
				};
				return new Promise(function(resolve) {
					require(['../Modules/aras.innovator.VariantManagementSample/Scripts/3rdPartyLibs/html2canvas.min.js',
					'../Modules/aras.innovator.VariantManagementSample/Scripts/3rdPartyLibs/html2canvas.svg.min.js'], function(html2canvas, html2canvasSvg) {
						window.html2canvas = html2canvas;
						window.html2canvas.svg = html2canvasSvg;
						resolve();
					});
				}).then(getImageFromNode, getImageFromNode);
			} else {
				return window.ModulesManager.using(['aras.innovator.Printing/DomToSVG']).then(function(domToSVG) {
					return domToSVG.toSVG(nodeToConvert, imageWidth, imageHeight);
				});
			}
		},

		getCroppedImageWithBorder: function(image) {
			var canvas = document.createElement('canvas');
			canvas.width = this.printWidth;
			canvas.height = this.printHeight;
			var context = canvas.getContext('2d');
			// default margin size which is created by DomToSVG module
			var margin = 10;
			context.drawImage(image, margin, margin, this.printWidth - margin, this.printHeight - margin, 0, 0, this.printWidth, this.printHeight);
			return canvas.toDataURL();
		},

		cloneNodeWithStyle: function(elementToClone, stylesToClone) {
			var originChildren = elementToClone.querySelectorAll('*');
			var elementClone = elementToClone.cloneNode(true);
			var cloneChildren = elementClone.querySelectorAll('*');
			this.copyComputedStylesAsInline(elementClone, elementToClone, stylesToClone);
			Array.prototype.forEach.call(cloneChildren, function(child, i) {
				this.copyComputedStylesAsInline(child, originChildren[i], stylesToClone);
			}.bind(this));
			return elementClone;
		},

		copyComputedStylesAsInline: function(targetNode, originNode, stylesToCopy) {
			var computedCssText = '';
			var computedStyles = window.getComputedStyle(originNode);
			Array.prototype.forEach.call(computedStyles, function(style) {
				if (!stylesToCopy || stylesToCopy.indexOf(style) !== -1) {
					computedCssText += style + ':' + computedStyles.getPropertyValue(style) + ';';
				}
			});
			targetNode.style.cssText = computedCssText;
		},

		buildPrintableFrame: function() {
			var iframe = document.createElement('iframe');
			iframe.setAttribute('style', 'visibility:hidden');
			document.body.appendChild(iframe);
			var html = document.implementation.createHTMLDocument(document.title);

			var style = html.createElement('style');
			style.setAttribute('type', 'text/css');
			style.innerHTML += '#variantTreeTitle {margin-top: 10px !important}';
			style.innerHTML += '#variantTreeInfo {top: 60px !important}';
			html.head.appendChild(style);

			var treeTitle = document.querySelector('#variantTreeTitle');
			html.body.appendChild(this.cloneNodeWithStyle(treeTitle));
			var treeInfo = document.querySelector('#variantTreeInfo');
			html.body.appendChild(this.cloneNodeWithStyle(treeInfo));
			var treeNode = document.querySelector('#variantTreeContainer>svg');
			var treeCopy = this.cloneNodeWithStyle(treeNode, this.commonSvgStyles);
			html.body.appendChild(treeCopy);

			this.printWidth = parseInt(treeNode.getAttribute('width'));
			var treeTitleStyles = window.getComputedStyle(treeTitle);
			var marginBottom = 20;
			this.printHeight = parseInt(treeNode.getAttribute('height')) +
							parseInt(treeTitleStyles.height) +
							marginBottom;
			this.performHorizontalShiftOnSvgTree(treeCopy);

			iframe.contentWindow.document.open();
			iframe.contentWindow.document.write(html.documentElement.innerHTML);
			iframe.contentWindow.document.close();
			return iframe;
		},

		getScaleFactor: function() {
			var scaleControl = document.querySelector('#scaleSlider>input');
			return parseFloat(scaleControl.value);
		},

		getSpacingFactor: function() {
			var spacingControl = document.querySelector('#spacingSlider>input');
			return parseFloat(spacingControl.value);
		},

		getTreeLevelSize: function() {
			var rootHeaderNode = document.querySelector('.GroupAnchor');
			var treeLevelBorder = rootHeaderNode.querySelector('rect');
			return {
				width: parseInt(treeLevelBorder.getAttribute('width')),
				height: parseInt(treeLevelBorder.getAttribute('height'))
			};
		},

		getTranslationXY: function(node) {
			var matrix = node.transform.baseVal.consolidate().matrix;
			return {
				x: matrix.e,
				y: matrix.f
			};
		},

		increaseTranslationXY: function(node, xVal, yVal) {
			var matrix = node.transform.baseVal.consolidate().matrix;
			matrix.e += xVal || 0;
			matrix.f += yVal || 0;
		},

		minimizeTreePrintSpace: function(svgTree) {
			var rootSvgNode = svgTree.querySelector('g');
			var leftMargin = this.getTranslationXY(rootSvgNode).x;
			var treeLevelSize = this.getTreeLevelSize();
			var rightMargin = leftMargin - (this.spacingFactor - treeLevelSize.width / 2) * this.scaleFactor;
			var totalMargin = rightMargin + leftMargin;
			// Remove left margin if tree is larger then one print page,
			// othervise print tree on the center of the page
			var displayTreeWidth = this.printWidth - totalMargin;
			if (displayTreeWidth * this.pptFactor > this.printPageWidth) {
				this.increaseTranslationXY(rootSvgNode, -leftMargin);
				this.printWidth = displayTreeWidth;
			} else {
				var translationChange = (this.printPageWidth - displayTreeWidth * this.pptFactor) / 2;
				translationChange = translationChange < 0 ? 0 : translationChange;
				this.increaseTranslationXY(rootSvgNode, translationChange / this.pptFactor - leftMargin);
				this.printWidth = this.printPageWidth / this.pptFactor;
			}
			var bottomTreeLevelLabel = document.querySelector('.SecondLabel');
			var svgHeight = svgTree.getAttribute('height');
			var marginBottom = (svgHeight - (this.getTranslationXY(bottomTreeLevelLabel).y + treeLevelSize.height * 2) * this.scaleFactor) / 2;
			var marginTop = marginBottom / 2;
			this.printHeight -= marginBottom + marginTop;
			this.increaseTranslationXY(rootSvgNode, 0, -marginTop);
		},

		performHorizontalShiftOnSvgTree: function(svgTree) {
			this.scaleFactor = this.getScaleFactor();
			this.spacingFactor = this.getSpacingFactor();
			var groups = svgTree.querySelectorAll('.GroupAnchor');
			this.minimizeTreePrintSpace(svgTree);

			// Compute translation values for tree levels
			var pageNumber = 1;
			var shiftRight = 0;
			var translationsByXAxis = {};
			var i;
			for (i = 0, groupsLength = groups.length; i < groupsLength; i++) {
				var levelTranslateX = this.getTranslationXY(groups[i]).x;
				var currentLevelXPosition = levelTranslateX + shiftRight + this.spacingFactor - this.getTreeLevelSize().width / 2;
				var treeLevelOverlapping = currentLevelXPosition * this.scaleFactor * this.pptFactor - this.printPageWidth * pageNumber;
				if (treeLevelOverlapping >= 0) {
					var currentShiftRigth = this.spacingFactor - treeLevelOverlapping / (this.scaleFactor * this.pptFactor);
					shiftRight += currentShiftRigth < 0 ? 0 : currentShiftRigth;
					pageNumber++;
				}
				translationsByXAxis[levelTranslateX.toString()] = shiftRight;
				this.increaseTranslationXY(groups[i], shiftRight);
			}
			// Apply computed translations to all nodes
			var nodes = svgTree.querySelectorAll('.Node');
			var stepByXAxis = this.getTranslationXY(nodes[1]).x;
			for (i = 1, nodesLength = nodes.length; i < nodesLength; i++) {
				var nodeTranslateX = this.getTranslationXY(nodes[i]).x;
				var currentLevelShift = translationsByXAxis[nodeTranslateX.toString()];
				var prevLevelShift = translationsByXAxis[(nodeTranslateX + stepByXAxis).toString()];
				this.increaseTranslationXY(nodes[i], currentLevelShift);
				// If current tree level was moved - make path from prev level longer
				if (prevLevelShift) {
					var innerPath = nodes[i].querySelector('path');
					var dAttr = innerPath.getAttribute('d');
					innerPath.setAttribute('d', dAttr + 'h' + (prevLevelShift - currentLevelShift));
				}
			}
			this.printWidth += shiftRight * this.scaleFactor;
			svgTree.setAttribute('width', this.printWidth);
		}
	});
});
