<?xml version="1.0"?>
<!--
    Extract EDIDs of all strings from SST XML.
 -->
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
    <xsl:output method="text" indent="no" />
    <xsl:template match="String">
        <xsl:value-of select="REC/text()" />
        <xsl:text> </xsl:text>
        <xsl:value-of select="EDID/text()" />
        <xsl:text>&#xa;</xsl:text>
    </xsl:template>
    <xsl:template match="text()|@*"></xsl:template>
</xsl:stylesheet>