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
    const previewImagePath = '/full/!2000,600/0/default.jpg';
    const maxImageWidth = 800;
    const maxImageHeight = 800;

    // Rectangle attrivbutes
    const rectDefaults = {
        "lineWidth" : 3,
        "strokeStyle" : "green",
        "globalAlpha": 0.4
    }

    // HTML identifiers
    const elImageCanvas = "afe-image-canvas";   // DOM selector
    const elPreviewCanvas = "afe-preview-canvas";   // DOM selector

    // Array containing canvas and contexts
    const images = [];
    images["image"] = {
        "canvas" :  document.getElementById(elImageCanvas),
        "context":  document.getElementById(elImageCanvas).getContext("2d"),
        "savedImage": null
    };
    images["preview"] = {
        "canvas" :  document.getElementById(elPreviewCanvas),
        "context":  document.getElementById(elPreviewCanvas).getContext("2d"),
        "savedImage": null
    };

    // text constants
    const imageLoadingText = "Henter billede, vent venligst...";

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
            // $('#' + elImageCanvas).attr('data-full-url', base + '/' + folder + '/' + name + fullImagePath);
        }
        else {
            ret += folder + '/' + name + '/' + left + ',' + top + ',' + width + ',' + height + '/!' + maxImageWidth + ',' + maxImageHeight + '/0/default.jpg';
        }
        return(ret);
    }

    /**
     * Clear the image canvas
     */
    var clearImage = function(image) {
        var canvas = images[image].canvas;
        var context = images[image].context;
        context.clearRect(0, 0, canvas.width, canvas.height);
    };

    /**
     * Load an Image URL into the canvas
     * @param {String} imageURL The image URL
     * @param {Function} callback callback function (efter image load)
     */
    var loadImage = function(image, imageURL, callback) {
        var canvas = images[image].canvas;
        var context = images[image].context;

        // Clean the canvas and write loading message
        clearImage(image);
        canvas.width = maxImageWidth;        
        //canvas.height = 300;
        context.font = '24px serif';
        context.fillText(imageLoadingText, 100, 50, maxImageWidth);
    
        // Load the image
        const imageObj = new Image();
        imageObj.src = imageURL;
        imageObj.crossOrigin = "Anonymous";
        imageObj.onload = () => {
            // Settings the width of the canvas
            if (image === "preview") {
                var imgWidth = imageObj.naturalWidth;
            }
            else {
                imgWidth = maxImageWidth;
            }
            var imgHeight = imageObj.naturalHeight;
            canvas.width = imageObj.naturalWidth;        
            canvas.height = imgHeight;
            context.drawImage(imageObj, 0, 0, imgWidth, imgHeight, 0,0, imgWidth, imgHeight);
            // When the image is loaded, set the region width to 100%
            images[image].savedImage = imageObj;
          
            // Call the callback function (if defined)
            if (callback) {
                callback();
            }
        }
    };

    /**
     * Restore to the original image (remove rectangles)
     */
    var restoreImage = function(image) {
        var canvas = images[image].canvas;
        var context = images[image].context;
        var savedImage = images[image].savedImage;
        
        // restore the clean image
        var imgWidth = savedImage.naturalWidth;
        var imgHeight = savedImage.naturalHeight;
        canvas.width = imgWidth;        
        canvas.height = imgHeight;
        context.drawImage(savedImage, 0, 0, imgWidth, imgHeight, 0,0, imgWidth, imgHeight);
    };

    /**
     * Draw the rectangle used for marking words
     * @param {Integer} x 
     * @param {Integer} y 
     * @param {Integer} width 
     * @param {Integer} height 
     */
    var showRectangle = function(image, x, y, width, height) {
        var context = images[image].context;
    
        console.log('showRectangle', image, x, y, width, height);

        context.save();
        context.strokeStyle = rectDefaults.strokeStyle;
        context.lineWidth = rectDefaults.lineWidth;
        context.globalAlpha = rectDefaults.globalAlpha;
        
        context.beginPath();
        context.rect(x, y, width, height);
        context.stroke();
        context.restore();
    };

    /**
     * Getter for the canvas width
     */
    var getCanvasWidth = function(image) {
        var canvas = images[image].canvas;
 
        return(canvas.width);
    };

    /**
     * Getter for the canvas height
     */
    var getCanvasHeight = function(image) {
        var canvas = images[image].canvas;
 
        return(canvas.height);
    };


    /**
     * Getter for the image width
     */
    var getImageWidth = function(image) {
        return(images[image].savedImage.naturalWidth);
    };

    /**
     * Getter for the image height
     */
    var getImageHeight = function(image) {
        return(images[image].savedImage.naturalHeight);
    };

    /**
     * Setup event handlers for events on the image
     */
    var setupEventHandlers = function() {
        /*
        $('#' + elImageCanvas).click((e) => {
            window.open($(e.currentTarget).data('full-url'), '_blank');
        });
        */
    };

    // Public functions
    return ({
        setBasePath:        setBasePath,
        setupEventHandlers: setupEventHandlers,
        getImagePath:       getImagePath,
        loadImage:          loadImage,
        clearImage:         clearImage,
        showRectangle:      showRectangle,
        restoreImage:       restoreImage,
        getCanvasWidth:     getCanvasWidth,
        getCanvasHeight:    getCanvasHeight,
        getImageWidth:      getImageWidth,
        getImageHeight:     getImageHeight
    });
}());

