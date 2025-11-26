<?xml version="1.0"?>
<xsl:stylesheet
        version="1.0"
        xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
        xmlns:xlink="http://www.w3.org/1999/xlink"
        xmlns:fb="http://www.gribuser.ru/xml/fictionbook/2.0"
        >
    <xsl:output
            media-type="text/html"
            method="html"
            encoding="utf-8"
            omit-xml-declaration="yes"
            doctype-public="HTML5"
            />

    <xsl:key name="note-link" match="fb:section" use="@id"/>
    <xsl:template match="/*">
        <div class="chitalka-fb2_default__book">
            <xsl:for-each select="fb:description/fb:title-info/fb:coverpage/fb:image">
                <xsl:call-template name="image"/>
            </xsl:for-each>

            <xsl:for-each select="fb:description/fb:title-info/fb:annotation">
                <section class="book__annotation">
                    <xsl:call-template name="annotation"/>
                </section>
            </xsl:for-each>

            <!--<navMap style="display: none;">-->
                <!--<xsl:apply-templates select="fb:body" mode="toc"/>-->
            <!--</navMap>-->


            <xsl:for-each select="fb:body">
                <xsl:if test="position() != 1">
                    <div class="separator"></div>
                </xsl:if>

                <!--<xsl:if test="not(fb:title) and @name">-->
                    <!--<h4 align="center">-->
                        <!--<xsl:value-of select="@name"/>-->
                    <!--</h4>-->
                <!--</xsl:if>-->

                <div class="wrapper">
                    <xsl:apply-templates/>
                </div>

            </xsl:for-each>
        </div>
    </xsl:template>
    <!-- author template -->
    <xsl:template name="author">
        <xsl:value-of select="fb:first-name"/>
        <xsl:text disable-output-escaping="no">&#032;</xsl:text>
        <xsl:value-of select="fb:middle-name"/>&#032;
        <xsl:text disable-output-escaping="no">&#032;</xsl:text>
        <xsl:value-of select="fb:last-name"/>
        <br/>
    </xsl:template>
    <!-- secuence template -->
    <xsl:template name="sequence">
        <xsl:value-of select="@name"/>
        <xsl:if test="@number">
            <xsl:text disable-output-escaping="no">,&#032;#</xsl:text>
            <xsl:value-of select="@number"/>
        </xsl:if>
        <xsl:if test="fb:sequence">
            <ul>
                <xsl:for-each select="fb:sequence">
                    <xsl:call-template name="sequence"/>
                </xsl:for-each>
            </ul>
        </xsl:if>
    </xsl:template>
    <!-- toc template -->
    <xsl:template match="fb:section|fb:body" mode="toc">
        <xsl:choose>
            <xsl:when test="name()='body' and position()=1 and not(fb:title)">
                <xsl:apply-templates select="fb:section" mode="toc"/>
            </xsl:when>
            <xsl:otherwise>
                <navPoint>
                    <navLabel>
                        <text>
                            <xsl:value-of select="normalize-space(fb:title | @name)"/>
                        </text>
                    </navLabel>
                    <content src="#TOC_{generate-id()}"></content>
                    <!--<xsl:value-of select="normalize-space(fb:title | //fb:body/@name)"/>-->
                    <!--<xsl:value-of select="normalize-space(fb:body[@name == 'notes']/@name | fb:body/title)"/>-->

                    <!-- fb:body[@name = 'notes'] -->
                    <xsl:if test="fb:section">
                        <navPoint>
                            <xsl:apply-templates select="fb:section" mode="toc"/>
                        </navPoint>
                    </xsl:if>
                </navPoint>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>
    <!-- description -->
    <xsl:template match="fb:description">
        <xsl:apply-templates/>
    </xsl:template>
    <!-- body -->
    <xsl:template match="fb:body">
        <div>
            <xsl:apply-templates/>
        </div>
    </xsl:template>

    <xsl:template match="fb:section">
        <section>
            <xsl:attribute name="class">
                <xsl:text>chitalka-fb2_default__section</xsl:text>
                <xsl:if test="starts-with(translate(fb:title, 'ГЛАВА', 'глава'), 'глава')">
                    <xsl:text> chapter</xsl:text>
                </xsl:if>
            </xsl:attribute>
            <a name="TOC_{generate-id()}"></a>
            <xsl:if test="@id">
                <xsl:element name="a">
                    <xsl:attribute name="name">
                        <xsl:value-of select="@id"/>
                    </xsl:attribute>
                </xsl:element>
            </xsl:if>
            <xsl:apply-templates/>
        </section>
    </xsl:template>
    <xsl:template match="fb:body[@name='notes']//fb:section">
        <div>
            <xsl:if test="@id">
                <xsl:attribute name="class">
                    <xsl:value-of select="'annotation'"/>
                </xsl:attribute>
            </xsl:if>
            <a name="TOC_{generate-id()}"></a>
            <xsl:if test="@id">
                <xsl:element name="a">
                    <xsl:attribute name="name">
                        <xsl:value-of select="@id"/>
                    </xsl:attribute>
                </xsl:element>
            </xsl:if>
            <xsl:apply-templates/>
        </div>
    </xsl:template>


    <!-- section/title -->
    <xsl:template match="fb:section/fb:title|fb:poem/fb:title">
        <xsl:choose>
            <xsl:when test="count(ancestor::node()) &lt; 9">
                <xsl:element name="{concat('h',count(ancestor::node())-3)}">
                    <a name="TOC_{generate-id()}"></a>
                    <xsl:if test="@id">
                        <xsl:element name="a">
                            <xsl:attribute name="name">
                                <xsl:value-of select="@id"/>
                            </xsl:attribute>
                        </xsl:element>
                    </xsl:if>
                    <xsl:apply-templates/>
                </xsl:element>
            </xsl:when>
            <xsl:otherwise>
                <xsl:element name="h6">
                    <xsl:if test="@id">
                        <xsl:element name="a">
                            <xsl:attribute name="name">
                                <xsl:value-of select="@id"/>
                            </xsl:attribute>
                        </xsl:element>
                    </xsl:if>
                    <xsl:apply-templates/>
                </xsl:element>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>
    <!-- section/title -->
    <xsl:template match="fb:body/fb:title">
        <!--<h1 style="display: none;">-->
            <!--<xsl:apply-templates mode="title"/>-->
        <!--</h1>-->
    </xsl:template>
    <xsl:template match="fb:body[@name='notes']/fb:title">
        <h1>
            <xsl:apply-templates mode="title"/>
        </h1>
    </xsl:template>

    <xsl:template match="fb:title/fb:p">
        <xsl:apply-templates/>
        <xsl:text disable-output-escaping="no">&#032;</xsl:text>
        <br/>
    </xsl:template>
    <!-- subtitle -->
    <xsl:template match="fb:subtitle">
        <xsl:if test="@id">
            <xsl:element name="a">
                <xsl:attribute name="name">
                    <xsl:value-of select="@id"/>
                </xsl:attribute>
            </xsl:element>
        </xsl:if>
        <h5>
            <xsl:apply-templates/>
        </h5>
    </xsl:template>
    <!-- p -->
    <xsl:template match="fb:p">
        <!-- https://st.yandex-team.ru/CHITALKA-85 -->
        <!--<xsl:if test"preceding-sibling::*[1][name()] != 'fb:image'">-->
            <p>
                <xsl:if test="@id">
                    <xsl:element name="a">
                        <xsl:attribute name="name">
                            <xsl:value-of select="@id"/>
                        </xsl:attribute>
                    </xsl:element>
                </xsl:if>
                <xsl:apply-templates/>
            </p>
        <!--</xsl:if>-->
    </xsl:template>
    <!-- strong -->
    <xsl:template match="fb:strong">
        <b>
            <xsl:apply-templates/>
        </b>
    </xsl:template>
    <!-- emphasis -->
    <xsl:template match="fb:emphasis">
        <i>
            <xsl:apply-templates/>
        </i>
    </xsl:template>
    <!-- style -->
    <xsl:template match="fb:style">
        <span class="{@name}">
            <xsl:apply-templates/>
        </span>
    </xsl:template>
    <!-- empty-line -->
    <xsl:template match="fb:empty-line">
        <xsl:if test="following-sibling::*[1] != fb:image">
            <br/>
        </xsl:if>
    </xsl:template>
    <!-- link -->
    <xsl:template match="fb:a">
        <xsl:choose>
            <xsl:when test="starts-with(@xlink:href,'#')">
                <xsl:element name="a">
                    <xsl:attribute name="class">
                        <xsl:value-of select="'footnote'"/>
                    </xsl:attribute>
                    <xsl:attribute name="href">
                        <xsl:value-of select="@xlink:href"/>
                    </xsl:attribute>
                    <xsl:attribute name="title">
                        <xsl:value-of select="key('note-link',substring-after(@xlink:href,'#'))/fb:p"/>
                    </xsl:attribute>
                    <xsl:choose>
                        <xsl:when test="(@type) = 'note'">
                            <sup>
                                <xsl:apply-templates/>
                            </sup>
                        </xsl:when>
                        <xsl:otherwise>
                            <xsl:apply-templates/>
                        </xsl:otherwise>
                    </xsl:choose>
                </xsl:element>
            </xsl:when>
            <xsl:otherwise>
                <xsl:element name="span">
                    <xsl:choose>
                        <xsl:when test="(@type) = 'note'">
                            <sup>
                                <xsl:apply-templates/>
                            </sup>
                        </xsl:when>
                        <xsl:otherwise>
                            <xsl:apply-templates/>
                        </xsl:otherwise>
                    </xsl:choose>
                </xsl:element>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>
    <!-- annotation -->
    <xsl:template name="annotation">
        <xsl:if test="@id">
            <xsl:element name="a">
                <xsl:attribute name="name">
                    <xsl:value-of select="@id"/>
                </xsl:attribute>
            </xsl:element>
        </xsl:if>
        <xsl:apply-templates/>
    </xsl:template>
    <!-- epigraph -->
    <xsl:template match="fb:epigraph">
        <blockquote class="epigraph">
            <xsl:if test="@id">
                <xsl:element name="a">
                    <xsl:attribute name="name">
                        <xsl:value-of select="@id"/>
                    </xsl:attribute>
                </xsl:element>
            </xsl:if>
            <xsl:apply-templates/>
        </blockquote>
    </xsl:template>
    <!-- epigraph/text-author -->
    <xsl:template match="fb:epigraph/fb:text-author">
        <blockquote class="author">
            <i>
                <xsl:apply-templates/>
            </i>
        </blockquote>
    </xsl:template>
    <!-- cite -->
    <xsl:template match="fb:cite">
        <blockquote>
            <xsl:if test="@id">
                <xsl:element name="a">
                    <xsl:attribute name="name">
                        <xsl:value-of select="@id"/>
                    </xsl:attribute>
                </xsl:element>
            </xsl:if>
            <xsl:apply-templates/>
        </blockquote>
    </xsl:template>
    <!-- cite/text-author -->
    <xsl:template match="fb:text-author">
        <blockquote>
            <i>
                <xsl:apply-templates/>
            </i>
        </blockquote>
    </xsl:template>
    <!-- date -->
    <xsl:template match="fb:date">
        <xsl:choose>
            <xsl:when test="not(@value)">
                &#160;&#160;&#160;
                <xsl:apply-templates/>
                <br/>
            </xsl:when>
            <xsl:otherwise>
                &#160;&#160;&#160;<xsl:value-of select="@value"/>
                <br/>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>
    <!-- poem -->
    <xsl:template match="fb:poem">
        <blockquote>
            <xsl:if test="@id">
                <xsl:element name="a">
                    <xsl:attribute name="name">
                        <xsl:value-of select="@id"/>
                    </xsl:attribute>
                </xsl:element>
            </xsl:if>
            <xsl:apply-templates/>
        </blockquote>
    </xsl:template>

    <!-- stanza -->
    <xsl:template match="fb:stanza">
        <xsl:apply-templates/>
        <br/>
    </xsl:template>
    <!-- v -->
    <xsl:template match="fb:v">
        <xsl:if test="@id">
            <xsl:element name="a">
                <xsl:attribute name="name">
                    <xsl:value-of select="@id"/>
                </xsl:attribute>
            </xsl:element>
        </xsl:if>
        <xsl:apply-templates/>
        <br/>
    </xsl:template>
    <!-- image -->
    <xsl:template match="fb:image" name="image">
        <div>
            <xsl:choose>
                <xsl:when test="ancestor::fb:coverpage">
                    <xsl:attribute name="class">
                        <xsl:value-of select="'book__cover'"/>
                    </xsl:attribute>
                </xsl:when>
                <xsl:otherwise>
                    <xsl:attribute name="class">
                        <xsl:text>image chitalka-fb2_default__image</xsl:text>
                    </xsl:attribute>
                </xsl:otherwise>
            </xsl:choose>
            <div class="image__wrapper">
                <img>
                    <xsl:choose>
                        <xsl:when test="starts-with(@xlink:href,'#')">
                            <xsl:attribute name="src">
                                <xsl:text>data:</xsl:text>
                                <xsl:variable name="href" select="substring-after(@xlink:href,'#')"/>
                                <set variable="href" expression="substring-after(@xlink:href,'#')"/>
                                <xsl:value-of select="//fb:binary[@id=$href]/@content-type" disable-output-escaping="yes"/><xsl:text>;base64,</xsl:text>
                                <!--<xsl:value-of select="substring-after(@xlink:href,'#')"/>-->
                                <xsl:value-of select="//fb:binary[@id=$href]" disable-output-escaping="yes"/>
                            </xsl:attribute>

                        </xsl:when>
                        <xsl:otherwise>
                            <xsl:attribute name="src">
                                <xsl:value-of select="@xlink:href"/>
                            </xsl:attribute>
                        </xsl:otherwise>
                    </xsl:choose>
                </img>
            </div>
            <xsl:if test="following-sibling::node()[1]/fb:emphasis">
                <div class="image__annotation">
                    <xsl:apply-templates select="following-sibling::fb:p[1]"/>
                </div>
            </xsl:if>
        </div>
    </xsl:template>
</xsl:stylesheet>

