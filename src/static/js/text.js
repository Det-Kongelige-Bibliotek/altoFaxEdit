
// Det Kongelige Bibliotek
// The ALTO Fax Edit Application (AFE)
// Text related code

var afe = afe || {};
afe.text = (function () {
    "use strict";

    const XMLtopNode1 = '<?xml version="1.0" encoding="utf-8"?>';
    const XMLtopNode2 = '<?xml version="1.0" encoding="UTF-8"?>';

    const newTextLinePrefix = 'CUSTOM';

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

        // Compensate for the XML serialization and newlines (always lowecase "utf-8")
        xmlString = xmlString.replace(XMLtopNode1, XMLtopNode1 + '\n');
        xmlString = xmlString.replace(XMLtopNode2, XMLtopNode1 + '\n');
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
     * Also handles removal of any divided words
     * @param {Jquery Object} $xml The full XML document 
     * @param {String} id The String ID
     */
    var removeTextline = function($xml, id) {
        var $el = $xml.find('TextLine[ID=' + id + ']');

        // Check if the line contains a divided word - if so: reset the SUBS_TYPE and SUBS_CONTENT attributes for the String
        $el.find('String').each(function() {
            var $s = $(this),
                subsType    = $s.attr('SUBS_TYPE'),
                subsContent = $s.attr('SUBS_CONTENT'),
                id          = $s.attr('ID');
            if (subsType) {
                // Found a divided word
                var $partString;
                if (subsType === 'HypPart1') {
                    // Remove the HypPart2 from the line below
                    $partString = $el.next().find('String[SUBS_TYPE="HypPart2"][SUBS_CONTENT="' + subsContent + '"]');
                }
                else {
                     // Remove the HypPart1 from the line above
                    $partString = $el.prev().find('String[SUBS_TYPE="HypPart1"][SUBS_CONTENT="' + subsContent + '"]');
                }
                if ($partString.length) {
                    $partString.removeAttr('SUBS_TYPE');
                    $partString.removeAttr('SUBS_CONTENT');
                }
            } 
        });

        if (id.indexOf(afe.text.getNewTextLinePrefix()) > -1) {
              // Remove the line in the HTML (just the content - not the TextLine)
            $el.remove();
        }
        else {
            // For original elements, just delete the content
            $el.empty().append('<String STYLEREFS="STYLE1" CONTENT="" ID="STRING' + id + '"' +
            ' HPOS="'   + $el.attr('HPOS')   + '"' +
            ' VPOS="'   + $el.attr('VPOS')   + '"' +
            ' WIDTH="'  + $el.attr('WIDTH')  + '"' +
            ' HEIGHT="' + $el.attr('HEIGHT') + '"' +                   
            '></String>');
        }
    };    

    /**
     * Add  a new TextLine element
     * @param {Jquery Object} $xml The full XML document 
     * @param {String} id ID of the current textline 
     * @param {*} where before || after
     */
    var addTextline = function($xml, id, where) {
        var $el = $xml.find('TextLine[ID=' + id + ']');
        var max = 0;
        var newId = '', newTextLine = '';

        // Get next textline ID
        $xml.find('TextLine[ID^=' + newTextLinePrefix + ']').each(function() {
            var id = $(this).attr('ID');
            id = parseInt(id.substring(newTextLinePrefix.length));
            max = Math.max(id, max);
        });
        max++;

        newId = newTextLinePrefix + max;
        newTextLine = '<TextLine ID="' + newId + '"' +
            ' HPOS="'   + $el.attr('HPOS')   + '"' +
            ' VPOS="'   + $el.attr('VPOS')   + '"' +
            ' WIDTH="'  + $el.attr('WIDTH')  + '"' +
            ' HEIGHT="' + $el.attr('HEIGHT') + '"' +
            '><String STYLEREFS="STYLE1" CONTENT="" ID="STRING' + newId + '"' +
                ' HPOS="'   + $el.attr('HPOS')   + '"' +
                ' VPOS="'   + $el.attr('VPOS')   + '"' +
                ' WIDTH="'  + $el.attr('WIDTH')  + '"' +
                ' HEIGHT="' + $el.attr('HEIGHT') + '"' +           
            '></String></TextLine>';

        if (where === "after") {
            $el.after(newTextLine);
        }
        else {
            $el.before(newTextLine);
        }
    };    

    /**
     * 
     * @param {JQuery element} $xml The XML document
     * @returns {Object} containing the page size attributes
     */
    var getPageSize = function($xml) {
        var el = $xml.find('Page');

        return({
            "width": el.attr('WIDTH'),
            "height": el.attr('HEIGHT')
        });
    }

    /**
     * Fetch the constant declare in the module
     * @returns {String} The prefic for new TextLines
     */
    var getNewTextLinePrefix = function() {
        return(newTextLinePrefix);
    }

    /**
     * Merge two String elements in the XML
     * Logic:
     *  Ved sammenlægning slettes <SP>-elementet mellem de to <String>-elementer,
     *  og det nye sammenlagte <String>-element får disse nye bounding box-værdier:
     * *
     * @param {JQuery object} $xml The XML content
     * @param {String} id ID of the element which should persist
     * @param {String} id1 ID of the leftmost element
     * @param {String} id2 ID of the rightmost element
     * @param {String} content The new (merged) content
     * @param {Integer} hpos The new HPOS
     * @param {Integer} vpos The new VPOS
     * @param {Integer} width The new width
     * @param {Integer} height The new height
     */
    var mergeStrings = function($xml, id, id1, id2, content, hpos, vpos, width, height) {
        var idRemove = (id === id1)?id2:id1;

        //  <SP>-elementet mellem de to <String>-elementer
        $xml.find('String[ID=' + id1 + ']').next('SP').remove();

        // Det nye sammenlagte <String>-element får disse nye bounding box-værdier:
        var $el = $xml.find('String[ID=' + id + ']');
        $el.attr('VPOS', vpos);
        $el.attr('HPOS', hpos);
        $el.attr('WIDTH', width);
        $el.attr('HEIGHT', height);

        // Slet den String som er blevet merged
        $xml.find('String[ID=' + idRemove + ']').remove();
    };

    /**
     * Fetch the TextLine dimensions
     * @param {JQuery object} $xml The XML content
     * @param {String} id The ID of the TextLine
     * @returns {Object} containing the hpos and width
     */
    var getTextLineDim = function($xml, id) {
        var $el = $xml.find('TextLine[ID=' + id + ']');
        var $prevTextLine, $nextTextLine;

        var getDim = function($this) {
            var $first = $this.find('String').first();
            var $last = $this.find('String').last();

            return({
                "hpos"  : parseInt($first.attr('HPOS')),
                "width" : parseInt($last.attr('HPOS')) + parseInt($last.attr('WIDTH')) - parseInt($first.attr('HPOS')),
                "vpos"  : parseInt($first.attr('VPOS')),
                "height": Math.max(parseInt($first.attr('HEIGHT')), parseInt($last.attr('HEIGHT')))
            });          
        };

        // Get the prev and next TextLine
        $prevTextLine = $el.prev();
        if ($prevTextLine.length === 0) {
            
            $prevTextLine = $el.parent().prevAll('TextBlock').first().find('TextLine').last();
        }

        $nextTextLine = $el.next();
        if ($nextTextLine.length === 0) {
            $nextTextLine = $el.parent().nextAll('TextBlock').first().find('TextLine').first();
        }

        return({
            "prev"    : $prevTextLine.length?getDim($prevTextLine):null,
            "current" : getDim($el),
            "next"    : $nextTextLine.length?getDim($nextTextLine):null
        });

    };

    // Public functions
    return ({
        xml2Html:               xml2Html,
        xml2Text:               xml2Text,
        changeStringContent:    changeStringContent,
        removeTextline:         removeTextline,
        getPageSize:            getPageSize,
        addTextline:            addTextline,
        getNewTextLinePrefix:   getNewTextLinePrefix,
        mergeStrings:           mergeStrings,
        getTextLineDim:         getTextLineDim
    });
}());