
// Det Kongelige Bibliotek
// The ALTO Fax Edit Application (AFE)
// Misc code utilities

var afe = afe || {};
afe.utils = (function () {
    "use strict";

    // HTML Elements
    const elMessage = '#afe-message';

    /**
     * Debugging function, currently logs to the console
     * @param {String} Debug string 
     * @param {Object} data to print
     */
    var debug = function(element, data) {
        if (data) {
            console.log(element, data);
        }
        else {
            console.log(element);
        }
     };

    var showSpinner = function (element, show) {
        if (show) {
            $(element).append('<i id="afe-spinner" class="fas fa-cog fa-spin"></i>');
        }
        else {
            $(element + ' #afe-spinner').remove();
        }
    };

    /**
     * Show a message in the button region
     * @param {String} message The message to display
     */
    var showMessage = function(message) {
        if (!message) {
            $(elMessage).text('');
        }
        else {
            $(elMessage).text(message);
        }
    };

    /*\
    |*|
    |*|  Solution #4 – escaping the string before encoding it
    |*|
    |*|  https://developer.mozilla.org/en-US/docs/Web/API/WindowBase64/Base64_encoding_and_decoding
    |*|
    |*|  Author: madmurphy
    |*|
    \*/
    var b64EncodeUnicode = function(str) {
        // first we use encodeURIComponent to get percent-encoded UTF-8,
        // then we convert the percent encodings into raw bytes which
        // can be fed into btoa.
        return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
            function toSolidBytes(match, p1) {
                return String.fromCharCode('0x' + p1);
        }));
    }

    var b64DecodeUnicode = function(str) {
        // Going backwards: from bytestream, to percent-encoding, to original string.
        return decodeURIComponent(atob(str).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
    }

    /**
     * Fetch configuration from the server
     * @return {Promise} Promise for the AJAX request
     */
    var getConfig = function() {
        afe.utils.debug('Fetching config, URL');

        var p = new Promise(function(resolve, reject) {
            $.ajax({
                url: '/config',
                type: "GET",
                cache: false,
                success: function(data) { 
                    //afe.utils.debug('folder data',data);
                    resolve(data);
                }
            });
        });

        return(p);
    };

    var isXMLFilename = function(filename) {
        var isXML = (filename.indexOf('.xml') >= 0);
        return(isXML);
    };

    /**
     * Read a cookie value
     * https://stackoverflow.com/questions/1599287/create-read-and-erase-cookies-with-jquery
     * @param {String} name The cookie name
     */
    var readCookie = function(name) {
        var nameEQ = name + "=";
        var ca = document.cookie.split(';');
        for (var i = 0; i < ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) == ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
    };

    /**
     * Returns the other part of a divided word (as STRING element name)
     * @param {String} stringId The STRING<nn> value
     * @param {String} subsType (HypPart1 | HypPart1)
     * @returns The part STRING id
     */
    var getPartId = function(stringId, subsType) {
        console.log('getPartId', stringId);
        var id = parseInt(stringId.substring('STRING'.length));
        id += (subsType == 'HypPart1')?1:-1;
        return('STRING' + id);
    };

    // Public functions
    return ({
        debug:              debug,
        showSpinner:        showSpinner,
        showMessage:        showMessage,
        b64EncodeUnicode:   b64EncodeUnicode,
        b64DecodeUnicode:   b64DecodeUnicode,
        isXMLFilename:      isXMLFilename,
        getConfig:          getConfig,
        readCookie:         readCookie,
        getPartId:          getPartId
    });
}());