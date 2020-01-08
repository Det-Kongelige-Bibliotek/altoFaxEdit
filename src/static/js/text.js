
// Det Kongelige Bibliotek
// The ALTO Fax Edit Application (AFE)
// Text related code

var afe = afe || {};
afe.text = (function () {
    "use strict";

    const XMLtopNode1 = '<?xml version="1.0" encoding="utf-8"?>';
    const XMLtopNode2 = '<?xml version="1.0" encoding="UTF-8"?>';

    var xml2Html = function(xml) {
        var html='', $xml;

        var getFontSize = function(fontsize) {
            if (parseInt(fontsize) < 14) {
                return('14');
            }
            else if (parseInt(fontsize) > 16) {
                return('16');
            }
            else {
                return(fontsize);
            }
        };
     
        // Use JQuery to parse the XML
        $xml = $($.parseXML(xml));
        
        // Parse the XML containing styles
        html += '<style type="text/css">';
        $xml.find("Styles TextStyle").each(function(i,st) {
            html += '.' + $(st).attr('ID') + 
                    ' {font-family:'    + $(st).attr('FONTFAMILY') + 
                    '; font-size:'      + getFontSize($(st).attr('FONTSIZE')) + 'pt' +
                    '; font-style:'     + $(st).attr('FONTSTYLE') +
                    ';} ';
        });
        html += '</style>';

        // Parse the XML for textblocks and text lines
        $xml.find("TextBlock").each(function(i1,tb) {
            html += '<div class="afe-textblock">';  
            $(tb).find("TextLine").each(function(i2,tl) {
                html += '<div class="' + tl.tagName + '" id="' + $(tl).attr('ID') + '"' +
                    ' data-height="'    + $(tl).attr('HEIGHT') + '"' +
                    ' data-width="'     + $(tl).attr('WIDTH') + '"' +
                    ' data-hpos="'      + $(tl).attr('HPOS') + '"' +
                    ' data-vpos="'      + $(tl).attr('VPOS') + '">';

                $(tl).find("String, SP").each(function(i3,st) {
                    html += '<span id="' + $(st).attr('ID') + '"' +
                        ' class="' + st.tagName + ' ' + ($(st).attr('STYLEREFS')?$(st).attr('STYLEREFS'):'') + '"' +
                        ' data-height="'    + $(st).attr('HEIGHT') + '"' +
                        ' data-width="'     + $(st).attr('WIDTH') + '"' +
                        ' data-hpos="'      + $(st).attr('HPOS') + '"' +
                        ' data-vpos="'      + $(st).attr('VPOS') + '"';
                        
                    if ($(st).attr('SUBS_TYPE')) {
                        html += ' data-subs_type="' + $(st).attr('SUBS_TYPE') + '"' +
                                ' data-subs_content="' + $(st).attr('SUBS_CONTENT') + '"';
                    }

                    html += '>' + ($(st).attr('CONTENT')?$(st).attr('CONTENT'):'') + '</span>';      
                }); 
                html += '</div>'; 
            }); 
            html += '</div>'; 
        });

        return {
            'html': html,
            '$xml' : $xml
        };
    };

    /**
     * Get the text value of a JQuery XML object
     * @param {JQUery XML document} $xml 
     */
    var xml2Text = function($xml) {
        var xmlString = (new XMLSerializer()).serializeToString($xml[0]);

        // Compensate for the XML serialization and newlines
        xmlString = xmlString.replace(XMLtopNode1, XMLtopNode1 + '\n');
        xmlString = xmlString.replace(XMLtopNode2, XMLtopNode2 + '\n');
        xmlString = xmlString + '\n';
        return(xmlString);
    }

    /**
     * Change the CONTENT of a string
     * @param {Jquery Object} $xml The full XML document 
     * @param {String} id The String ID
     * @param {String} value The value to set in CONTENT (if emty: delete the String element)
     * @param {String} subsType The SUBS_TYPE value
     * @param {String} subsContent The SUBS_CONTENT value
     * @returns {Object} Containing the ID of the other subs-string and the new Subs content
     */
    var changeStringContent = function($xml, id, value, subsType, subsContent) {
        var ret, partContent;
        var el = $xml.find('String[ID=' + id + ']');
        var partEl;
        const index = 'STRING'.length;

        if (!value) {
            el.remove();    // Empty value = remove the element
        }
        else {
            el.attr('CONTENT', value); // Update the CONTENT element
        }
        
        // ----------------------    
        // Handling divided words
        // ----------------------    
  
        if (subsType) {
            // Find the other part of the word
            partEl = $xml.find('String[ID=' + afe.utils.getPartId(id, subsType) + ']');
            if (subsType =='HypPart1') {
                partContent = value + partEl.attr('CONTENT');
            }
            else {
                partContent = partEl.attr('CONTENT') + value;
            }
 
            // If the word has been removed, then remove the "subs" attributes from both Strings
            if (!value) {
                el.removeAttr('SUBS_TYPE');
                el.removeAttr('SUBS_CONTENT');
                partEl.removeAttr('SUBS_TYPE');
                partEl.removeAttr('SUBS_CONTENT');
            }
            else {
                // Otherwise update the SUBS_CONTENT on both Strings
                el.attr('SUBS_CONTENT', partContent);
                partEl.attr('SUBS_CONTENT', partContent);          
            }

            ret = {
                "id" : partEl.attr('ID'),
                "content": partContent
            };
        }
        else {
            ret = {};
        }

       return(ret);
    };

    /**
     * Remove the TextLine element
     * @param {Jquery Object} $xml The full XML document 
     * @param {String} id The String ID
     */
    var removeTextline = function($xml, id) {
        var el = $xml.find('TextLine[ID=' + id + ']');
        el.empty();
    };    

    /**
     * 
     * @param {JQuery element} $xml The XML document
     * @returns {Object} containing the page size attributes
     */
    var getPageSize = function($xml) {
        var el = $xml.find('Page');

        return({
            "width": el.attr('WIDTH')
        });
    }

    // Public functions
    return ({
        xml2Html:               xml2Html,
        xml2Text:               xml2Text,
        changeStringContent:    changeStringContent,
        removeTextline:         removeTextline,
        getPageSize:            getPageSize
    });
}());