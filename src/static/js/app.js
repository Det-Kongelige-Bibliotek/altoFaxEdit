// Det Kongelige Bibliotek
// The ALTO Fax Edit Application (AFE)
//
// This file is the main application files which controld the overall application flow,
// keeps track of "session-state", and setups up event handler.
//

var afe = afe || {};
afe.app = (function () {
    "use strict";

    // HTML identifiers
    const elFolders   = '#folders'; // JQuery selector
    const elText      = '#text';    // JQuery selector
    const elTextline  = 'div.TextLine';
    const elString    = 'span.String';

    // Text constants
    const folderTop   = '[Tilbage]';
    const commitMessage = 'AltoFaxEdit korrektur';
    const cookieToken   = 'afe-token';
    const looseDataMessage = "Data er IKKE blevet gemt!. Ønsker du at fortsætte alligevel ?";

    // Image buffer constants
    const imageBuf = 400;
    const imagePosBuf = 200;
    const imageRectMargin = 20;
    const imagePreviewWidth = 2922; // Note: currently this MUST be the same as image width
 
    // Datamodel
    var dataAltoFiles = [];
    var currentFolder = '';
    var currentFile   = '';

    /**
     * 
     * @param {String} status The status of the currently selected file
     */
    var setCurrentStatus = function(status) {
        // Update the datamodel
        dataAltoFiles[currentFile].status = status;

        // Show the status in the file list
        var curEl = $(elFolders + ' .afe-folder[data-id="' + currentFile + '"]');

        // Make sure no other files are current
        if (status == 'current') {
            $(elFolders + ' .afe-folder').removeClass('current');
        }
        curEl.removeClass('current changed saved error');
        curEl.addClass(status);
    };

    /**
     * Return the status of the current file
     */
    var getCurrentStatus = function() {
        if (currentFile) {
            return(dataAltoFiles[currentFile].status);
        }
        else {
            return(null);
        }
    };

    /**
     * Update the folders/files in the navigator
     * @param {String} url - link to the next folder level (or undefined for root level)
     */
    var updateFolders = function(url) {
        // Clear the folders region
        $(elFolders).html('');
        afe.utils.showSpinner(elFolders, true);

        // call github for folders/files
        afe.git.getContent(url).then(function(folders) {
            // Reset the datamodel
            dataAltoFiles = [];

            // Create div region HTML content from the github folders
            var html = '';

            // Handle the root node
            if (url) {
                html += '<div class="afe-folder" data-url="">' + folderTop + '</div>';
            }
            folders.forEach(element => {
                html += '<div data-id="' + element.name + '" class="afe-folder" data-url="' + element.url + '">' + 
                    element.name + (element.type=="dir"?'/':'') + '</div>';
            });
            $(elFolders).html(html);
           
            afe.utils.showSpinner(elFolders, false);
            
            // Setup event handler for the folders/files
             $(elFolders + ' .afe-folder').click(eventChooseContent);
        })
        .catch(function(error) {
            // Save has failed
            afe.utils.showMessage('Ingen adgang til Github');
            alert('Fejl: Kunne ikke hente filer fra Github: ' + error);
        });

     }

     /**
      * Event handler for folder/file click
      */
    var eventChooseContent = function(event, el) {
        var _this = el?el:this;

        afe.utils.debug('eventChooseContent', _this);
        afe.utils.showMessage();
   
        // Check if the file has been change
        var status = getCurrentStatus();
        if (status == 'changed' || status == 'error') {
            if (!confirm(looseDataMessage)) {
                return;
            }
        }

        var name = $(_this).text();
        var url = $(_this).data('url');

        // Check for folder or xml file
        if (afe.utils.isXMLFilename(name)) {
            // ------------------
            // Click on XML file
            // ------------------

            // Mark the file as current
            currentFile = name;

            // Load the first image preview
            //var img = afe.image.getImagePath(currentFolder, name, 0, 0, 3000, 1000);
            var imgURL = afe.image.getImagePath(currentFolder, name);
            afe.image.loadImage("preview", imgURL);
            afe.image.clearImage("image");

            // Get the file from Github
            $(elText).html('');
            afe.utils.showSpinner(elText, true);
            afe.git.getContent(url).then(function(content) {
                // File recieved
                var xml = afe.utils.b64DecodeUnicode(content.content);
   
                // Parse XML to HTML, and display the html
                var ret =  afe.text.xml2Html(xml);

                // Get the page size attributes
                var page = afe.text.getPageSize(ret.$xml);
    
                // Strip the Branch name off the URL to form the POST URL
                var postURL = url.substring(0, url.indexOf('?'));

                // Add the content to the datamodel
                dataAltoFiles[name] = {
                    "url":      url,            // The URL to fetch the github content
                    "postURL":  postURL,        // The URL to save the github content
                    "name":     name,           // The name of the XML file
                    "sha":      content.sha,    // The SHA from github (used when updating)
                    "xml" :     xml,            // The Raw XML (Alto file)
                    "$xml" :    ret.$xml,       // The parsed XML as JQuery object
                    "html" :    ret.html,       // The HTML to display
                    "status" :  "draft",         // The status of the file
                    "page":     page
                };

                setCurrentStatus('current');
                dataAltoFiles[currentFile].currentLine = '';

                // Display the HTML
                $(elText).html(ret.html);
                
                // Setup event handler for the clicking line
                $(elText + ' ' + elTextline).click(eventSelectLine);

                // Setup event handler for the clicking text
                $(elText + ' ' + elString).click(eventSelectText);

                // Add delete icons and events for each line and add events handler for click
                $(elText + ' ' + elTextline).each(function() {
                    $(this)
                        .append('<i class="far fa-trash-alt afe-line-action afe-remove-textline" title="Slet hele linien"></i>')
                        .append('<i class="far fa-caret-square-down afe-line-action afe-add-down" title="Tilføj en linie under denne"></i>')
                        .append('<i class="far fa-caret-square-up afe-line-action afe-add-up" title="Tilføj en linie over denne"></i>')
                });
                $('i.afe-line-action').click(eventLineAction);
 
                afe.utils.showSpinner(elText, false);
            })
            .catch(function(error) {
                // Fetch file has failed
                afe.utils.showMessage('Ingen adgang til Github');
                alert('Fejl: Kunne ikke hente file fra Github: ' + error);
            });
        }
        else if (name === folderTop) {
            // Top chosen, reset region content
            currentFile = '';
            updateFolders(url);
            afe.image.clearImage("preview");
            afe.image.clearImage("image");
            $(elText).html('');
        }
        else {
            // ---------------------------------
            // Click on folder - show next level
            // ---------------------------------
            currentFolder = name;
            updateFolders(url);
        }
     }

     /**
      * Select line event handler (click)
      */
     var eventSelectLine = function() {
        var _this = this,
            id = $(_this).attr('id'),
            height=0, width=0, hpos=0, vpos=0, current;
            
        afe.utils.debug('eventSelectLine', id);

        // No need to relead image if the selected line is already loaded
        if (id === dataAltoFiles[currentFile].currentLine) {
            return;
        }

        // Save the current line
        current = dataAltoFiles[currentFile];
        current.currentLine = id;

        // Get the prev and next line (in order to show 3 lines in total)
        var c = parseInt(id.substring(4));
        var p = c-1;
        var n = c+1;
        p = p?p:1;
        if ($(elText + ' ' + elTextline + '#LINE' + n).length == 0) {
            n = c;
        }

        vpos = $(elText + ' ' + elTextline + '#LINE'   + c).data('vpos');
        hpos = $(elText + ' ' + elTextline + '#LINE'   + c).data('hpos');
        width = $(elText + ' ' + elTextline + '#LINE'  + c).data('width');
        height = $(elText + ' ' + elTextline + '#LINE' + c).data('height');

        // Show rectangle in the preview image (first calculate the ratios)
        var h = afe.image.getImageHeight("preview") / current.page.height;
        var w = afe.image.getImageWidth("preview") / current.page.width;
        afe.image.restoreImage("preview");
        afe.image.showRectangle("preview", Math.round(hpos*w), Math.round(vpos*h), Math.round(width*w), Math.round(height*h));
        
        // Add a little buffer in the preview
        width += imageBuf;
        height += imageBuf;
        hpos -= imagePosBuf;
        vpos -= imagePosBuf;
     
        // Always start at horizontal position zero
        hpos = 0;
        width = current.page.width;

        // Save the current image bounding box in the datamodel
        current.hpos = hpos;
        current.vpos = vpos;
        current.width = width;
        current.height = height;

        // Load the image snippet
        var img = afe.image.getImagePath(currentFolder, dataAltoFiles[currentFile].name, hpos, vpos, width, height);    
        afe.image.loadImage("image", img, dataAltoFiles[currentFile].event);
    };

    /**
     * Event handler for line actions (when icon is clicked)
     */
    var eventLineAction = function() {
        var _this =this;
        var id = $(_this).parent().attr('id');
        var newId = '';
        afe.utils.debug('eventLineAction', _this);

        var getTextLine = function() {
            var ret = '<div id="' + newId + '" class="TextLine"><span id="STRING' + newId + '" class="String"></span></div>';
            console.log('inserting', ret);
            return(ret);
        }

        if ($(_this).hasClass('afe-remove-textline')) {

            if (confirm('Slet linien ' + id + ' ?')) {
                // Remove the line in the HTML (just the content - not the TextLine)
                $(elTextline + '#' + id).empty();

                // Remove the line in the XML
                afe.text.removeTextline(dataAltoFiles[currentFile].$xml, id);
                setCurrentStatus('changed');
            }
        }
        else if ($(_this).hasClass('afe-add-down')) {
            if (confirm('Tilføj ny linie efter linien ' + id + ' ?')) {
                newId = afe.text.addTextline(dataAltoFiles[currentFile].$xml, id, 'after');
                $(_this).parent().after(getTextLine());
                setCurrentStatus('changed');
            }
        }
        else if ($(_this).hasClass('afe-add-up')) {
            if (confirm('Tilføj ny linie før linien ' + id + ' ?')) {
                newId = afe.text.addTextline(dataAltoFiles[currentFile].$xml, id, 'before');
                $(_this).parent().before(getTextLine());
                setCurrentStatus('changed');
            }
        }
    };

    /**
     * Function to calculate the rectangle dimensions for a JQuery element (String)
     * @param {JQuery element} $element The Text String in the DOM
     */
    var calcRectangle = function($element) {
        // Get the String bounding box values
        var hpos = $element.data('hpos');
        var vpos = $element.data('vpos');
        var width = $element.data('width');
        var height = $element.data('height');

        // calculate the position based on the currently shown image
        var w1 = dataAltoFiles[currentFile].width;
        var w2 = afe.image.getCanvasWidth("image");
        var h1 = dataAltoFiles[currentFile].height;
        var h2 = afe.image.getCanvasHeight("image");

        // Find the x,y position inside the shown image
        hpos -= dataAltoFiles[currentFile].hpos;
        vpos -= dataAltoFiles[currentFile].vpos;

        // Apply the canvas size ration
        hpos   = Math.round(hpos * (w2/w1));
        vpos   = Math.round(vpos * (h2/h1));
        width  = Math.round(width * (w2/w1));
        height = Math.round(height * (h2/h1));

        // Apply extra margin
        hpos -= imageRectMargin/2;
        vpos -= imageRectMargin/4;
        width  += imageRectMargin;
        height += imageRectMargin/2;

        return({
            "hpos": hpos,
            "vpos": vpos,
            "width": width,
            "height": height
        });
    };
    

     /**
      * Select text event handler (click)
      */
     var eventSelectText = function(event, el) {
        var _this = el?el:this;
        afe.utils.debug('eventSelectText', _this);

        // Detect line change - if so, set the event in queue (until the image is loaded)
        // This code is needed because the line click event must be allowed to load the image first 
        if ($(_this).closest(elTextline).attr('id') != dataAltoFiles[currentFile].currentLine) {
            dataAltoFiles[currentFile].event = () => {
                eventSelectText(event, _this);
            }
            return;
        }
        // Reset the callback function
        dataAltoFiles[currentFile].event = null;

        // Calculate where to draw the rectangle, clear the image and draw it
        var dim = calcRectangle($(_this));
        afe.image.restoreImage("image");
        afe.image.showRectangle("image", dim.hpos, dim.vpos, dim.width, dim.height);

        // For divided words, also mark the other part of the word
        var id = $(_this).attr('id');
        var subsType = $(_this).data('subs_type');
        if (subsType) {
            // The word is divided
            var $partEl = $(elText + ' span.String#' + afe.utils.getPartId(id, subsType));
            dim = calcRectangle($partEl);
            afe.image.showRectangle("image", dim.hpos, dim.vpos, dim.width, dim.height);
        }

        // --------------------
        // Show the edit field
        // --------------------
        var val = $(_this).text();
        // Inject a new text item into the DOM and setup an event handler for the change event
        var editEl = $(_this).after('<input data-id="' + id + 
            '" class="afe-edit" type="text" size="' + val.length + '" value="' + val + '"/>')
            .next()
            .focus()
            .blur(eventChangeText)
            .keydown(eventChangeText);   // JQuery after() returns the original element, hence the call to next()

        // Hide the span (display item)
        $(_this).hide();

    };

    /**
     * Event handler for text changes (keypress)
     */
    var eventChangeText = function(event) {
        const keyTab = 10, keyEnter = 13, keyEscape = 27;
        var _this = this;
  
        // Decoding the event
        if (event.type !== "blur" && event.which !== keyEnter && event.which !== keyTab && event.which !== 27) {
           // User is typing text
           return;
        }

        var val = $(_this).val();
        var id = $(_this).data('id');
        var span = $('span#' + id);

        // Check if the text has changed
        if (event.which === keyEscape) {
            // Reset to the original value from the span
            val = span.text();
        }
        else if (val != span.text()) {
            // Used for divided words
            var subsType = span.data('subs_type');          
            var subsContent = span.data('subs_content');
            subsType = (subsType==='undefined'?undefined:subsType);

            // Save the text in the XML
            var part = afe.text.changeStringContent(dataAltoFiles[currentFile].$xml, id, val, subsType, subsContent);

            // Handle changes to divided words
            // If the word has been removed, then remove the data-subs_type and data-subs_content attributes
            // If the word has changed, then update the data-subs-content for both HypPart1 and HypPart2
            if (subsType) {
                var partSpan = $('span#' + part.id);
                // If the word has been removed, then remove the "subs" attributes from the other part of the String
                if (!val) {
                    span.removeAttr('data-subs_type');
                    span.removeAttr('data-subs_content');
                    partSpan.removeAttr('data-subs_type');
                    partSpan.removeAttr('data-subs_content');   
                }
                else {
                    // Otherwise update the SUBS_CONTENT on both Strings
                    span.attr('data-subs_content', part.content);
                    partSpan.attr('data-subs_content', part.content);
                }               
            }
       
            setCurrentStatus('changed');
       
            // Adding a class here to show that the value has been corrected
            span.addClass('afe-has-changed');
        }

        // Set the value in the span and display this (or remove it when blanked)
        if (val) {
            span
                .text(val)
                .show();
        }
        else {
            span.remove();
        }
 
        // Remove the text input item
        $(_this).remove();

        // Remove the rectangle marking on the image
        afe.image.restoreImage("image");
    };

    /**
     * Generic event handler for all buttons
     */
    var eventButtonClick = function(event) {
        var _this = this;
        var button = $(_this).attr('id');

        afe.utils.debug('eventButtonClick', button);

        // Fecth next filer (JQuery)
        var getNext = function() {
            var next = $(elFolders + ' div[data-id="' + currentFile + '"]').next();
            return(next);
        }

        switch(button) {
            case 'btn-save': 
            case 'btn-save-and-next': 
                // Save the XML to github
                afe.utils.showMessage('Gemmer data...');
                var current = dataAltoFiles[currentFile];
                afe.utils.debug('save current', current);
                // First create text XML file from the JQuery XML object
                current.xml = afe.text.xml2Text(current.$xml);
                // Then convert the text file to Base64
                var b64 = afe.utils.b64EncodeUnicode(current.xml);
                // Then commit the Base64 content to github
                afe.git.setContent(current.postURL, b64, current.sha, commitMessage).then(function(result) {
                    afe.utils.showMessage('Data er gemt');
                    // Update the datamodel with a new sha
                    current.sha = result.content.sha;
                    setCurrentStatus('saved');
                    var next = getNext();
                    if (next.length === 1) {
                        eventChooseContent(event, next[0]);
                    }
                })
                .catch(function(error) {
                    // Save has failed
                    setCurrentStatus('error');
                    afe.utils.showMessage('Data er IKKE gemt');
                    alert('Kunne ikke gemme i Github: ' + error);
                });
                break;
 
            case 'btn-next':
                // Action handled later
                var next = getNext();
                if (next.length === 1) {
                    eventChooseContent(event, next[0]);
                }
                break;
 
            case 'btn-cancel':
                // Restore the original file
                var status = getCurrentStatus();
                if (status == 'changed' || status == 'error') {
                    if (!confirm(looseDataMessage)) {
                        return;
                    }
                }
                var curr = $(elFolders + ' div[data-id="' + currentFile + '"]');
                eventChooseContent(event, curr[0]);
                break;

            default:   
                alert('The button is not handled: ' + button);

        };

     };

    /**
     * Return the current datamodel
     */
    var getModel = function() {
        return(dataAltoFiles);
    }
    /**
      * Initialize the application
    */
    var init = function(token) {
        afe.utils.debug('altoFaxEdit initializing...');

        // Read the github token from a cookie
        var token = afe.utils.readCookie(cookieToken);
        if (!token) {
            alert('Github token SKAL være angivet før denne applikaiton kan benyttes (Klik på "Setup")');
            return;
        }

        // Fetch the configuration from the server
        var p = afe.utils.getConfig().then(function(config) {
            afe.utils.debug('Found configuration', config);

            // Persist the configuration
            afe.git.setConfig(config.github.url, config.github.branch, token);
            afe.image.setBasePath(config.images.url);

            // Show the first level of folder from the github repository
            updateFolders();
        });

        // Setup button event handler
        $('button.afe-action').click(eventButtonClick);

        // Setup image click handler (show full image in popup)
        // afe.image.setupEventHandlers();
    };

    // Public functions
    return ({
        init: init,
        getModel: getModel
    });
}());

// Bootstrap the application
if (window.location.pathname == '/') {
    $(document).ready(function() {
        afe.app.init();
    });
}