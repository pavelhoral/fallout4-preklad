<?xml version="1.0"?>
<!--
    Find translations inside matching regular expression inside SST XML.
 -->
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
    <xsl:param name="pattern" required="true" />
    <xsl:output method="text" indent="no" />
    <xsl:template match="Dest">
        <xsl:if test='matches(., $pattern)'>
            <xsl:value-of select="../REC/text()" />
            <xsl:text> </xsl:text>
            <xsl:value-of select="../EDID/text()" />
            <xsl:text>&#xa;</xsl:text>
        </xsl:if>
    </xsl:template>
    <xsl:template match="text()|@*"></xsl:template>
</xsl:stylesheet>