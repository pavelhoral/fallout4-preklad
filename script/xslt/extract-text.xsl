<?xml version="1.0"?>
<!--
    Extract all TEXT nodes from SST XML.
-->
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
    <xsl:output method="text" indent="no" />
    <xsl:template match="String">
        <xsl:value-of select="Source/text()" />
    </xsl:template>
    <xsl:template match="text()|@*"></xsl:template>
</xsl:stylesheet>