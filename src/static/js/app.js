// Det Kongelige Bibliotek
// The ALTO Fax Edit Application (AFE)
//
// This file is the main application files which controls the overall application flow,
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
    const elSpace     = 'span.SP';

    // Text constants
    const folderTop   = '[Tilbage]';
    const commitMessage = 'AltoFaxEdit korrektur';
    const cookieToken   = 'afe-token';
    const looseDataMessage = "Data er IKKE blevet gemt!. Ønsker du at fortsætte alligevel?";

    // Image buffer constants
    const imageBuf = 400;
    const imagePosBuf = 200;
    const imageRectMargin = 20;
    const imagePreviewWidth = 2922; // Note: currently this MUST be the same as image width
 
    // Datamodel
    var dataAltoFiles = [];
    var currentFolder = '';
    var currentFile   = '';
    var urlStack = [];

    // TextLine Actions
    const lineActions = '<div class="afe-line-actions"><i class="far fa-trash-alt afe-line-action afe-remove-textline" title="Slet hele linien"></i>' +
                        '<i class="far fa-caret-square-down afe-line-action afe-add-down" title="Tilføj en linie under denne"></i>' +
                        '<i class="far fa-caret-square-up afe-line-action afe-add-up" title="Tilføj en linie over denne"></i></div>';
   
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
        if (currentFile && dataAltoFiles[currentFile]) {
            return(dataAltoFiles[currentFile].status);
        }
        else {
            return(null);
        }
    };

    /**
     * Update the folders/files in the navigator
     * @param {String} url - link to the next folder level (or undefined for root level)
     * @param {Boolean} up - Is the folder direction up (user chooses prev folder)
     */
    var updateFolders = function(url, up) {
        // Clear the folders region
        $(elFolders).html('');
        afe.utils.showSpinner(elFolders, true);

        // Handle the URL Stack
        if (up) {
            urlStack.pop();
        }
        else {
            urlStack.push(url); // Save last URL in the stack
        }

        // call github for folders/files
        afe.git.getContent(url).then(function(folders) {
            // Reset the datamodel
            dataAltoFiles = [];

            // Create div region HTML content from the github folders
            var html = '';

            // Handle the root node
            if (urlStack.length > 1) {
                html += '<div class="afe-folder" data-type="dir" data-id="' + folderTop + 
                    '" data-url="' + urlStack[urlStack.length-2] + '">' + folderTop + '</div>';
            }
            folders.forEach(element => {
                html += '<div data-id="' + element.name + '" class="afe-folder" data-url="' + element.url + '" ' +
                            'data-type="' + element.type + '"> ' + element.name + (element.type=="dir"?'/':'') + '</div>';
            });
            $(elFolders).html(html);
           
            afe.utils.showSpinner(elFolders, false);
            
            // Setup event handler for the folders/files
             $(elFolders + ' .afe-folder').click(eventChooseContent);

             // Show the last viewed file
             markLastViewedFile();
        })
        .catch(function(error) {
            // Save has failed
            afe.utils.showMessage('Ingen adgang til Github');
        });

     }

     /**
      * Mark a specific file (but applyting a class)
      */
    var markLastViewedFile = function(currentFile) {
        var lastFile = localStorage.getItem("currentFile");
        
        $(elFolders + ' .afe-folder').removeClass('afe-last-viewed');
        $(elFolders + ' .afe-folder[data-id="' + lastFile + '"]').addClass('afe-last-viewed');
    };

     /**
      * Generate new XML text and HTML for the jQuery XML object
      * Reresh the HTML in the text region, and apply event handlers
      * @param {Boolean} XMLChanged Hast the JQuery XML document changed ?
      */
     var refreshCurrentHTML = function(XMLChanged = true) {
        var current = dataAltoFiles[currentFile];

        // Convert the JQuery XML object to XML text
        if (XMLChanged) {
            current.xml = afe.text.xml2Text(current.$xml);
        }

        // Generate HTML for the XML text
        var ret =  afe.text.xml2Html(current.xml);
        current.html = ret.html;

        // Display the HTML
        $(elText).html(ret.html);

        // Mark the changed strings
        current.changedStrings.forEach(function(s) {
            var span = $('span#' + s);
            span.addClass('afe-has-changed');    
        });

        // Setup event handler for the clicking line
        $(elText + ' ' + elTextline).click(eventSelectLine);

        // Setup event handler for the clicking text
        $(elText + ' ' + elString).click(eventSelectText);

            // Add delete icons and events for each line and add events handler for click
        $(elText + ' ' + elTextline).each(function() {
            $(this).prepend(lineActions);
        });

        $('i.afe-line-action').click(eventLineAction);
     };

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

        // Get attributes from the file clicked
        var name = $(_this).data('id');
        var url = $(_this).data('url');
        var type = $(_this).data('type');

        // Check for folder or xml file
        if (type === 'file' && afe.utils.isXMLFilename(name)) {
            // ------------------
            // Click on XML file
            // ------------------

            // Mark the file as current
            currentFile = name;

            // Save the last viewet file (localstorage)
            localStorage.setItem("currentFile", currentFile);
            markLastViewedFile();

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
                    "status" :  "draft",        // The status of the file
                    "page":     page,           // The page dimensions
                    "changedStrings": []        // Array of changed String elements
                };

                setCurrentStatus('current');
                dataAltoFiles[currentFile].currentLine = '';

                refreshCurrentHTML(false);
 
                afe.utils.showSpinner(elText, false);
            })
            .catch(function(error) {
                // Fetch file has failed
                afe.utils.showMessage('Ingen adgang til Github');
                alert('Fejl: Kunne ikke hente file fra Github: ' + error);
            });
        }
        else if (name === folderTop) {
            // Back to porev folder chosen, reset region content
            currentFile = '';
            updateFolders(url, true);
            afe.image.clearImage("preview");
            afe.image.clearImage("image");
            $(elText).html('');
        }
        else if (type === 'dir') {
            // ---------------------------------
            // Click on folder - show next level
            // ---------------------------------
            currentFolder = name;
            updateFolders(url);
        }
        else {
            alert('Denne type fil er IKKE supporteret');
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

        var dim = afe.text.getTextLineDim(dataAltoFiles[currentFile].$xml, id);
   
        // Show rectangle in the preview image (first calculate the ratios)
        var h = afe.image.getImageHeight("preview") / current.page.height;
        var w = afe.image.getImageWidth("preview") / current.page.width;
        afe.image.restoreImage("preview");
        afe.image.showRectangle("preview", 0, Math.round(dim.current.vpos*h)-2, afe.image.getImageWidth("preview") , Math.round(dim.current.height*h)+6);
        
        // Show the line image, 1 line before and 1 line after
        // Show only from the start of the first word, to the end of the last word
        /*
        hpos = Math.min(dim.prev?dim.prev.hpos:9999, dim.current.hpos, dim.next?dim.next.hpos:9999);
        width = Math.max(dim.prev?(dim.prev.hpos+dim.prev.width-hpos):0, (dim.current.hpos+dim.current.width-hpos), dim.next?(dim.next.hpos+dim.next.width-hpos):0);
        vpos = dim.prev?dim.prev.vpos:dim.current.vpos;
        height = dim.next?(dim.next.vpos + dim.next.height - vpos):(dim.current.vpos + dim.current.height - vpos);
        */
       hpos = Math.min(dim.prev?dim.prev.hpos:9999, dim.current.hpos, dim.next?dim.next.hpos:9999);
       width = Math.max(dim.prev?(dim.prev.hpos+dim.prev.width-hpos):0, (dim.current.hpos+dim.current.width-hpos), dim.next?(dim.next.hpos+dim.next.width-hpos):0);
       vpos = dim.current.vpos - dim.current.height;
       height = dim.current.height * 3;
      
        // Add some buffer
        hpos -= 20;
        width += 80;
        vpos -= 40;
        height += 60;
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
        var id = $(_this).closest(elTextline).attr('id');
        var newId = '';
        afe.utils.debug('eventLineAction', _this);

        var getTextLine = function() {
            var ret = lineActions + '<div id="' + newId + '" class="TextLine"><span id="STRING' + newId + '" class="String"></span></div>';
            return(ret);
        }

        var applyEventHandlers = function() {
            $('div.TextLine#' + newId).click(eventSelectLine);
            $('div.TextLine#' + newId + ' i.afe-line-action').click(eventLineAction);
            $('div.TextLine#' + newId + ' ' + elString).click(eventSelectText);
        }

        if ($(_this).hasClass('afe-remove-textline')) {

            if (confirm('Slet den markerede linie?')) {
                // Remove the line in the XML
                afe.text.removeTextline(dataAltoFiles[currentFile].$xml, id);
                refreshCurrentHTML();
                setCurrentStatus('changed');
            }
        }
        else if ($(_this).hasClass('afe-add-down')) {
            if (confirm('Tilføj en ny linie under den markerede linie?')) {
                afe.text.addTextline(dataAltoFiles[currentFile].$xml, id, 'after');
                refreshCurrentHTML();
               setCurrentStatus('changed');
            }
        }
        else if ($(_this).hasClass('afe-add-up')) {
            if (confirm('Tilføj en ny linie over den markerede linie?')) {
                afe.text.addTextline(dataAltoFiles[currentFile].$xml, id, 'before');
                refreshCurrentHTML();
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
        hpos -= imageRectMargin/4;
        vpos -= imageRectMargin/5;
        width  += imageRectMargin/2;
        height += imageRectMargin/3;
 
        return({
            "hpos": hpos,
            "vpos": vpos,
            "width": width,
            "height": height
        });
    };
    

    /**
     * Event handler for text merges (left/right icon press)
     * 
     * Ved sammenlægning slettes <SP>-elementet mellem de to <String>-elementer,
     * og det nye sammenlagte <String>-element får disse nye bounding box-værdier:
     *
·    * ny HPOS = HPOS for tidligere venstreHPOS
·    * ny WIDTH = højreHPOS - venstreHPOS + højreWIDTH
·    * ny VPOS = min(venstreVPOS, højreVPOS)
·    * ny HEIGHT = max((venstreVPOS + venstreHEIGHT),  (højreVPOS + højreHEIGHT))  - nyVPOS
     */
    var eventMergeText = function(event) {
        var _this = this;
        var mergeType = event.data.type;
        var $el, $el1, $el2, $elRemove;
        var content, hpos, vpos, width, height;
        var idRemove;
        afe.utils.debug('eventMergeText', _this);

        $el = $(elString + '#' + event.data.id);
    
        if (!confirm('Sammenlæg to ord?')) {
            return;
        }

        if (mergeType === "left") {
            $el1 = $($el.prevAll(elString).get(0));
            $el2 = $el;
            $elRemove = $el1;
        }
        else {
            $el1 = $el;
            $el2 = $($el.nextAll(elString).get(0));
            $elRemove = $el2;
        }

        // Store the next text (this will also set the value in the span.String)
        content = $el1.text() + $el2.text();
        $('input.afe-edit').val(content);

        // Store the new data attributes on the String element
        /*
        ·    * ny HPOS = HPOS for tidligere venstreHPOS
        ·    * ny WIDTH = højreHPOS - venstreHPOS + højreWIDTH
        ·    * ny VPOS = min(venstreVPOS, højreVPOS)
        ·    * ny HEIGHT = max((venstreVPOS + venstreHEIGHT),  (højreVPOS + højreHEIGHT))  - nyVPOS
        */
        hpos = $el1.data('hpos');
        width = $el2.data('hpos') - $el1.data('hpos') + $el2.data('width');
        vpos = Math.min($el1.data('vpos'), $el2.data('vpos'));
        height = Math.max(($el1.data('vpos') + $el1.data('height')),  ($el2.data('vpos') + $el2.data('height'))) - vpos;
   
        // Persist the change in the XML (note: the HTML refresh is done in the "eventChangeText" function which is triggered when the content is changed)
        afe.text.mergeStrings(dataAltoFiles[currentFile].$xml, event.data.id, $el1.attr('id'), $el2.attr('id'), content, hpos, vpos, width, height);

        // Mark the file as changed
        setCurrentStatus('changed');
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
            '" class="afe-edit" type="text" size="' + val.length + '" value="' + val.replace(/"/g, '&quot;') + '"/>')
            .next()
            .focus()
            .blur(eventChangeText)
            .keydown(eventChangeText);   // JQuery after() returns the original element, hence the call to next()

        // Add the word merge icons (but bo for start/end)
        if ($(_this).prevAll(elString).length > 0) {
            editEl.before('<i class="far fa-caret-square-left afe-merge-left" title="Sammenlæg med forrige ord"></i>');
        }
        if ($(_this).nextAll(elString).length > 0) {
            editEl.after('<i class="far fa-caret-square-right afe-merge-right" title="Sammenlæg med næste ord"></i>');
        }
        // Setup event handlers for the merge buttons
        $('i.afe-merge-left').on('mousedown', {"id": id, "type":"left"}, eventMergeText);
        $('i.afe-merge-right').on('mousedown', {"id": id, "type":"right"}, eventMergeText);
       
        // Hide then span element
        $(_this).hide();
 
    };

    /**
     * Event handler for text changes (keypress)
     */
    var eventChangeText = function(event) {
        const keyTab = 10, keyEnter = 13, keyEscape = 27;
        var _this = this;
        afe.utils.debug('eventChangeText', _this);
   
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
            span.show();
            $(_this).remove();
            $('i.afe-merge-left, i.afe-merge-right').remove();
        }
        else if (val != span.text()) {
            // Used for divided words
            var subsType = span.data('subs_type');          
            var subsContent = span.data('subs_content');
            subsType = (subsType==='undefined'?undefined:subsType);

            // Save the text in the XML
            var part = afe.text.changeStringContent(dataAltoFiles[currentFile].$xml, id, val, subsType, subsContent);

            // Adding a class here to show that the value has been corrected
            dataAltoFiles[currentFile].changedStrings.push(id);
            setCurrentStatus('changed');
            refreshCurrentHTML();
        }
        else {
            span.show();
            $(_this).remove();
            $('i.afe-merge-left, i.afe-merge-right').remove();
        }
 
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
        };

        // Move to the next file
        var nextFile = function() {
            var next = getNext();
            if (next.length === 1) {
                eventChooseContent(event, next[0]);
            }       
        };

        switch(button) {
            case 'btn-save': 
            case 'btn-save-and-next': 
                if (getCurrentStatus() == "changed") {
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
                        if (button === 'btn-save-and-next') {
                            nextFile();
                        }
                    })
                    .catch(function(error) {
                        // Save has failed
                        setCurrentStatus('error');
                        afe.utils.showMessage('Data er IKKE gemt');
                        alert('Kunne ikke gemme i Github: ' + error);
                    });
                }
                else if (button == 'btn-save-and-next') {
                    nextFile();
                }
                break;
 
            case 'btn-next':
                // Action handled later
                nextFile();
                break;
 
            case 'btn-cancel':
                // Restore the original file
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
            var theURL = config.github.url + '?ref=' + config.github.branch;
            updateFolders(theURL);
        });

        // Setup button event handler
        $('button.afe-action').click(eventButtonClick);

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