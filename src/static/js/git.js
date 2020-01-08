// Det Kongelige Bibliotek
// The ALTO Fax Edit Application (AFE)
// GIT related code

var afe = afe || {};
afe.git = (function () {
    "use strict";

    // Should be placed in localstorage/Cookie
    var gitRoot;
    var branch;
    var token;

    /**
     * Setter for the github configuration
     * @param {String} pGitRoot The URL for the Github repository
     * @param {String} pBranch The Githib branch to use
     */
    var setConfig = function(pGitRoot, pBranch, pToken) {
        gitRoot = pGitRoot;
        branch = pBranch;
        token = pToken;
    };

    /**
     * Fetch content from a github file
     * @param {String} url The URL to the file content
     */
    var getContent = function(url) {
        var theURL = url?url:gitRoot + '?ref=' + branch;
        afe.utils.debug('Fetching content, URL', theURL);

        var p = new Promise(function(resolve, reject) {
            $.ajax({
                url: theURL,
                type: "GET",
                headers: {"Authorization": "token " + token},
                cache: false,
                success: function(data) { 
                    //afe.utils.debug('folder data',data);
                    resolve(data);
                },
                error: function(jqXHR, textStatus, errorThrown ) {
                    reject(errorThrown);
                }
            });
        });

        return(p);
    };

    /**
     * Commit content for a github file
     * @param {String} url The URL to the file content
     * @param {String} content The content to store
     * @param {String} sha The SHA from github
     * @param {String} message The commit message
     */
    var setContent = function(url, content, sha, message) {
        afe.utils.debug('Setting content, URL', url);

        var p = new Promise(function(resolve, reject) {
            $.ajax({
                url: url?url:gitRoot,
                headers: {"Authorization": "token " + token},
                type: "PUT",
                contentType: 'application/json',
                data: JSON.stringify({
                    "branch":   branch,
                    "message":  message,
                    "content":  content,
                    "sha":      sha
                }),
                success: function(data) { 
                    resolve(data);
                },
                error: function(jqXHR, textStatus, errorThrown ) {
                    reject(errorThrown);
                }
            });
        });

        return(p);
    };

    // Public functions
    return ({
        setConfig:  setConfig,
        getContent: getContent,
        setContent: setContent
    });
}());