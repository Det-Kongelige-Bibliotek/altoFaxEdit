// Det Kongelige Bibliotek
// The ALTO Fax Edit Application (AFE)
// Image related code
//
// Full inage
// Example URL: https://kb-images.kb.dk/public/tekstportal/trykkefrihed-TEST/1_001_130017168305/130017168305_1_001_001_001/full/full/0/default.jpg
// Uddrag fra faksimilen baseret på "bounding box" (fire pixelværdier: left, top, width, height) og en dimensionsbegrænsning (to pixelværdier):
// https://kb-images.kb.dk/public/tekstportal/trykkefrihed-TEST/1_001_130017168305/130017168305_1_001_001_001/186,1670,1200,164/!500,300/0/default.jpg
  
var afe = afe || {};
afe.image = (function () {
    "use strict";

    // Base path for the image server
    var base;
    // URI for the full images
    const fullImagePath = '/full/full/0/default.jpg';
    const previewImagePath = '/full/!2000,1000/0/default.jpg';

    // HTML identifiers
    const elImageTd = "td#afe-image";   // DOM selector
    const elImageCanvas = "afe-image-canvas";   // DOM selector
    const canvas = document.getElementById(elImageCanvas);
    const context = canvas.getContext("2d");

    // text constants
    const imageLoadingText = "Henter billede, vent venligst...";

    // Saved image data
    var savedImageData;

    /**
     * Set the base URL
     * @param {String} path The base path (URL)
     */
    var setBasePath = function (path) {
        base = path;
    }

    /**
     * 
     * @param {String} folder Name of the folder Ex. 1_001_130017168305
     * @param {String} fileName Name of the file. Ex. 130017168305_1_001_001_001
     * @param {Integer} left Bounding box parameters
     * @param {Integer} top 
     * @param {Integer} width 
     * @param {Integer} height 
     */
    var getImagePath = function(folder, fileName, left, top, width, height) {
        var ret = base;
        var name;

        // ommit the .xml from the filename
        name = fileName.split('.')[0];

        // Handle preview image
        if (left == undefined) {
            ret += folder + '/' + name + previewImagePath;
            // Store the URL for the full image in a data attribute (used for full image popup)
            $('#' + elImageCanvas).attr('data-full-url', base + '/' + folder + '/' + name + fullImagePath);
        }
        else {
            ret += folder + '/' + name + '/' + left + ',' + top + ',' + width + ',' + height + '/!2000,1000/0/default.jpg';
        }
        return(ret);
    }

    /**
     * Clear the image canvas
     */
    var clearImage = function() {
        context.clearRect(0, 0, canvas.width, canvas.height);
    };

    /**
     * Load an Image URL into the canvas
     * @param {String} imageURL The image URL
     * @param {Function} callback callback function (efter image load)
     */
    var loadImage = function(imageURL, callback) {
        // Clean the canvas and write loading message
        clearImage();
        canvas.width = 500;        
        canvas.height = 300;
        context.font = '24px serif';
        context.fillText(imageLoadingText, 100, 150, 200);

        // Load the image
        const imageObj = new Image();
        imageObj.src = imageURL;
        imageObj.crossOrigin = "Anonymous";
        imageObj.onload = () => {
            var imgWidth = imageObj.naturalWidth;
            var imgHeight = imageObj.naturalHeight;
            canvas.width = imgWidth;        
            canvas.height = imgHeight;
            context.drawImage(imageObj, 0, 0, imgWidth, imgHeight, 0,0, imgWidth, imgHeight);
            // When the image is loaded, set the region width to 100%
            $(elImageTd).width(imgWidth);
            savedImageData = context.getImageData(0, 0, imgWidth, imgHeight);
            // Call the callback function (if defined)
            if (callback) {
                callback();
            }
        }
    };

    var removeRectangle = function() {
        // restore the clean image
        context.putImageData(savedImageData, 0, 0);
    };

    /**
     * Draw the rectangle used for marking words
     * @param {Integer} x 
     * @param {Integer} y 
     * @param {Integer} width 
     * @param {Integer} height 
     */
    var showRectangle = function(x, y, width, height) {
        removeRectangle();
        context.save();
        context.strokeStyle = "lightgreen";
        context.lineWidth = 10;
        context.beginPath();
        context.rect(x, y, width, height);
        context.stroke();
        context.restore();
    };

    /**
     * Getter for the canvas width
     */
    var getCanvasWidth = function() {
        return(canvas.width);
    };

    /**
     * Getter for the canvas height
     */
    var getCanvasHeight = function() {
        return(canvas.height);
    };

    /**
     * Setup event handlers for events on the image
     */
    var setupEventHandlers = function() {
        $('#' + elImageCanvas).click((e) => {
            window.open($(e.currentTarget).data('full-url'), '_blank');
        });
    };

    // Public functions
    return ({
        setBasePath:        setBasePath,
        setupEventHandlers: setupEventHandlers,
        getImagePath:       getImagePath,
        loadImage:          loadImage,
        clearImage:         clearImage,
        showRectangle:      showRectangle,
        removeRectangle:    removeRectangle,
        getCanvasWidth:     getCanvasWidth,
        getCanvasHeight:    getCanvasHeight    
    });
}());

