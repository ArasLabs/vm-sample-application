<?xml version="1.0" encoding="UTF-8"?>

<xsl:stylesheet version="1.0"
xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
xmlns:dt="urn:schemas-microsoft-com:datatypes"
xmlns:d2="uuid:C2F41010-65B3-11d1-A29F-00AA00C14882">
<xsl:output method='html'/>
<xsl:template match="/">
<html>
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
<style>
body{
	font-family: 'Courier New';
	font-size: 12px;
}

.containerNode .containerNode, .containerNode > .elementNode, .innerContent, .innerContent > .closeElementNode {
	margin-left: 14px;
}

.innerContent > .elementNode {
	margin-left: 28px;
}

.collapsedNode > .innerContent {
	display: none;
}

.elementNode {
	cursor: pointer;
	line-height: 16px;
}

.elementNode:hover {
	background-color: #F0F0F0;
}

.expandoNode {
	display: inline-block;
	position: relative;
	top: 2px;
	width: 9px;
	height: 9px;
	margin-right: 4px;
	background-image: url(data:image/svg+xml;base64,PHN2ZyB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4IiB3aWR0aD0iNjRweCIgaGVpZ2h0PSI2NHB4IiB2aWV3Qm94PSIwIDAgNjQgNjQiIGVuYWJsZS1iYWNrZ3JvdW5kPSJuZXcgMCAwIDY0IDY0IiB4bWw6c3BhY2U9InByZXNlcnZlIj4NCjxnPjxyZWN0IHg9IjhweCIgeT0iMjhweCIgZmlsbD0iIzYwNjA2MCIgd2lkdGg9IjQ4cHgiIGhlaWdodD0iNnB4Ii8+PC9nPg0KPC9zdmc+DQo=);
	background-size: 7px 7px;
	background-position: 0 0;
	background-repeat: no-repeat;
}

.collapsedNode .expandoNode {
	background-image: url(data:image/svg+xml;base64,PHN2ZyB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4IiB3aWR0aD0iNjRweCIgaGVpZ2h0PSI2NHB4IiB2aWV3Qm94PSIwIDAgNjQgNjQiIGVuYWJsZS1iYWNrZ3JvdW5kPSJuZXcgMCAwIDY0IDY0IiB4bWw6c3BhY2U9InByZXNlcnZlIj4NCjxnPjxyZWN0IHg9IjI4cHgiIHk9IjhweCIgZmlsbD0iIzYwNjA2MCIgd2lkdGg9IjZweCIgaGVpZ2h0PSI0OHB4Ii8+PHJlY3QgeD0iOHB4IiB5PSIyOHB4IiBmaWxsPSIjNjA2MDYwIiB3aWR0aD0iNDhweCIgaGVpZ2h0PSI2cHgiLz48L2c+DQo8L3N2Zz4=);
}

.nodeName, .attributeName {
	color:#990000
}

.xnodeName, .xattributeName {
	color:#990099
}

.xmlSymbol {
	color: blue;
}

.textNode{
	font-weight:bold;
}

.k{
	margin-left: 1em;
	text-indent: -1em;
}

.ns{color:red}
.dt{color:green}
.db{text-indent:0px;margin-left:1em;margin-top:0px;margin-bottom:0px;padding-left:.3em;border-left:1px solid #CCCCCC;font:small}
.di{font:small}
.d{color:blue}
.pi{color:blue}
.cb{text-indent:0px;margin-left:1em;margin-top:0px;margin-bottom:0px;padding-left:.3em;font:small;color:#888888}
.ci{font:small;color:#888888}
PRE{margin:0px;display:inline}</style>
<script>
	function toggleNodeHandler(clickEvent) {
		var sourceElement = clickEvent.currentTarget;
		var containerNode = sourceElement.parentNode;
		var isNodeExpanded = containerNode.className.indexOf('collapsedNode') == -1;

		if (isNodeExpanded) {
			containerNode.classList.add('collapsedNode');
		} else {
			containerNode.classList.remove('collapsedNode');
		}

		clickEvent.stopPropagation();
		clickEvent.preventDefault();
	}
</script>
</head>

<body><xsl:apply-templates/></body>
</html>
</xsl:template>

<xsl:template match="processing-instruction()">
<div class="elementNode"><span class="xmlSymbol">&lt;?</span><span class="pi"><xsl:value-of select="name()" /><xsl:value-of select="." /></span><span class="xmlSymbol">?&gt;</span></div>
</xsl:template>

<xsl:template match="@*" xml:space="preserve"><span><xsl:attribute name="class"><xsl:if test="starts-with(name(),&#39;xsl:&#39;)">x</xsl:if>attributeName</xsl:attribute><xsl:value-of select="concat(' ', name())"/></span><span class="xmlSymbol">=&quot;</span><B><xsl:value-of select="."/></B><span class="xmlSymbol">&quot;</span></xsl:template>

<xsl:template match="text()">
<div class="elementNode"><span class="textNode"><xsl:value-of select="."/></span></div>
</xsl:template>

<xsl:template match="comment()">
<div class="k"><span><span class="expandoNode" style="visibility:hidden"></span><span class="xmlSymbol">&lt;!--</span></span><span id="clean" class="ci"><PRE><xsl:value-of select="." /></PRE></span><span class="xmlSymbol">--&gt;</span></div>
</xsl:template>

<xsl:template match="*">
<div class="elementNode"><span class="xmlSymbol">&lt;</span><span><xsl:attribute name="class"><xsl:if test="starts-with(name(),&#39;xsl:&#39;)">x</xsl:if>nodeName</xsl:attribute><xsl:value-of select="name()"/></span><xsl:apply-templates select="@*"/><span class="xmlSymbol">/&gt;</span></div>
</xsl:template>

<xsl:template match="*[comment() | processing-instruction()]">
<div class="containerNode"><div class="elementNode" onclick="toggleNodeHandler(event)"><span class="expandoNode"></span><span class="xmlSymbol">&lt;</span><span><xsl:attribute name="class"><xsl:if test="starts-with(name(),&#39;xsl:&#39;)">x</xsl:if>nodeName</xsl:attribute><xsl:value-of select="name()"/></span><xsl:apply-templates select="@*"/><span class="xmlSymbol">&gt;</span></div><div class="innerContent"><xsl:apply-templates /><div><span class="xmlSymbol">&lt;/</span><span><xsl:attribute name="class"><xsl:if test="starts-with(name(),&#39;xsl:&#39;)">x</xsl:if>nodeName</xsl:attribute><xsl:value-of select="name()"/></span><span class="xmlSymbol">&gt;</span></div></div></div>
</xsl:template>

<xsl:template match="*[text() and not(comment()|processing-instruction())]">
<div class="elementNode"><span class="xmlSymbol">&lt;</span><span><xsl:attribute name="class"><xsl:if test="starts-with(name(),&#39;xsl:&#39;)">x</xsl:if>nodeName</xsl:attribute><xsl:value-of select="name()"/></span><xsl:apply-templates select="@*"/><span class="xmlSymbol">&gt;</span><span class="textNode"><xsl:value-of select="."/></span><span class="xmlSymbol">&lt;/</span><span><xsl:attribute name="class"><xsl:if test="starts-with(name(),&#39;xsl:&#39;)">x</xsl:if>nodeName</xsl:attribute><xsl:value-of select="name()"/></span><span class="xmlSymbol">&gt;</span></div>
</xsl:template>

<xsl:template match="*[*]">
<div class="containerNode"><div class="elementNode" onclick="toggleNodeHandler(event)"><span class="expandoNode"></span><span class="xmlSymbol">&lt;</span><span><xsl:attribute name="class"><xsl:if test="starts-with(name(),&#39;xsl:&#39;)">x</xsl:if>nodeName</xsl:attribute><xsl:value-of select="name()" /></span><xsl:apply-templates select="@*"/><span class="xmlSymbol">&gt;</span></div><div class="innerContent"><xsl:apply-templates /><div class="closeElementNode"><span class="xmlSymbol">&lt;/</span><span><xsl:attribute name="class"><xsl:if test="starts-with(name(),&#39;xsl:&#39;)">x</xsl:if>nodeName</xsl:attribute><xsl:value-of select="name()"/></span><span class="xmlSymbol">&gt;</span></div></div></div>
</xsl:template>

</xsl:stylesheet>