/**
 *
 * syncthing
 *
 *
 * ioBroker Adapter to load meta data of a folder of your Syncthing server.
 * The adapter loads all 5min (default) the amount of bytes of the global folder (the data within the cloud), of your local folder and the state of the folder (e.g. idle).
 * Additionally it reformates the bytes to a more readable string (e.g. '3.376 KB' instead of '2433') besides the original value.
 *
 * An API Key of the Syncthing installation is necessary to use this adapter to load the data of your Syncthing folder.
 * To find it load your Syncthing admin overview (typically the IP of your syncthing installation on port 8080) and go to 'Actions' -> 'Advanced'. Make sure you don't share your API key.
 * The Folder ID of your Syncthing folder can be found in the Syncthing admin overview when you expand the Folder on the main overview.
 * You'll find 'Folder ID' below the expanded folder.
 *
 */

/* jshint -W097 */// jshint strict:false
/*jslint node: true */
"use strict";

// you have to require the utils module and call adapter function
var utils = require('@iobroker/adapter-core'); // Get common adapter utils

// you have to call the adapter function and pass a options object
// name has to be set and has to be equal to adapters folder name and main file name excluding extension
// adapter will be restarted automatically every time as the configuration changed, e.g system.adapter.syncthing.0
var adapter = utils.Adapter('syncthing');

/*
* Global Variables to be used across functions
*/
var endpoint_DBStatus = "/rest/db/status";                    // Syncthing: Endpoint that provides folder data. See: https://docs.syncthing.net/rest/db-status-get.html
var endpoint_SystemStatus = "/rest/db/completion";            // Syncthing: Endpoint that provides completion percentage. See: https://docs.syncthing.net/rest/db-completion-get.html
var terminating_timer;                                        // Variable for adapter-termination after timeout

// is called when adapter shuts down - callback has to be called under any circumstances!
adapter.on('unload', function (callback) {
    try {
        adapter.log.info('cleaned everything up...');
        callback();
    } catch (e) {
        callback();
    }
});

// is called if a subscribed object changes
/*
adapter.on('objectChange', function (id, obj) {
    // Warning, obj can be null if it was deleted
    adapter.log.info('objectChange ' + id + ' ' + JSON.stringify(obj));
});
*/

// is called if a subscribed state changes
/*
adapter.on('stateChange', function (id, state) {
    // Warning, state can be null if it was deleted
    adapter.log.info('stateChange ' + id + ' ' + JSON.stringify(state));

    // you can use the ack flag to detect if it is status (true) or command (false)
    if (state && !state.ack) {
        adapter.log.info('ack is not set!');
    }
});
*/

// Some message was sent to adapter instance over message box. Used by email, pushover, text2speech, ...
/*
adapter.on('message', function (obj) {
    if (typeof obj == 'object' && obj.message) {
        if (obj.command == 'send') {
            // e.g. send email or pushover or whatever
            console.log('send command');

            // Send response in callback if required
            if (obj.callback) adapter.sendTo(obj.from, obj.command, 'Message received', obj.callback);
        }
    }
});
*/

// is called when databases are connected and adapter received configuration.
// start here!
adapter.on('ready', function () {
    // Start timer to terminate adapter after certain period.
    terminating_timer = setTimeout(() => stopAdapter(true), 10000);
    // Start main function
    main();
});

function main() {
    // The adapters config (in the instance object everything under the attribute "native") is accessible via
    // adapter.config:
    adapter.log.info('Using config syncthingurl: ' + adapter.config.syncthingurl + ' | syncthingapikey: ' + adapter.config.syncthingapikey + ' | syncthingfolderid: ' + adapter.config.syncthingfolderid);

    /**
    *      For every state in the system there has to be also an object of type state
    *      Here a simple syncthing for a boolean variable named "testVariable"
    *      Because every adapter instance uses its own unique namespace variable names can't collide with other adapters variables
    */
    adapter.setObjectNotExists('folder.globalBytes', {
        type: 'state',
        common: {
            name: 'globalBytes',
            type: 'string',
            role: 'indicator'
        },
        native: {}
    });
    adapter.setObjectNotExists('folder.globalBytesFormated', {
        type: 'state',
        common: {
            name: 'globalBytesFormated',
            type: 'string',
            role: 'indicator'
        },
        native: {}
    });
    adapter.setObjectNotExists('folder.globalDeleted', {
        type: 'state',
        common: {
            name: 'globalDeleted',
            type: 'string',
            role: 'indicator'
        },
        native: {}
    });
    adapter.setObjectNotExists('folder.globalFiles', {
        type: 'state',
        common: {
            name: 'globalFiles',
            type: 'string',
            role: 'indicator'
        },
        native: {}
    });
    adapter.setObjectNotExists('folder.localBytes', {
        type: 'state',
        common: {
            name: 'localBytes',
            type: 'string',
            role: 'indicator'
        },
        native: {}
    });
    adapter.setObjectNotExists('folder.localBytesFormated', {
        type: 'state',
        common: {
            name: 'localBytesFormated',
            type: 'string',
            role: 'indicator'
        },
        native: {}
    });
    adapter.setObjectNotExists('folder.localDeleted', {
        type: 'state',
        common: {
            name: 'localDeleted',
            type: 'string',
            role: 'indicator'
        },
        native: {}
    });
    adapter.setObjectNotExists('folder.localFiles', {
        type: 'state',
        common: {
            name: 'localFiles',
            type: 'string',
            role: 'indicator'
        },
        native: {}
    });
    adapter.setObjectNotExists('folder.inSyncBytes', {
        type: 'state',
        common: {
            name: 'inSyncBytes',
            type: 'string',
            role: 'indicator'
        },
        native: {}
    });
    adapter.setObjectNotExists('folder.inSyncBytesFormated', {
        type: 'state',
        common: {
            name: 'inSyncBytesFormated',
            type: 'string',
            role: 'indicator'
        },
        native: {}
    });
    adapter.setObjectNotExists('folder.inSyncFiles', {
        type: 'state',
        common: {
            name: 'inSyncFiles',
            type: 'string',
            role: 'indicator'
        },
        native: {}
    });
    adapter.setObjectNotExists('folder.needBytes', {
        type: 'state',
        common: {
            name: 'needBytes',
            type: 'string',
            role: 'indicator'
        },
        native: {}
    });
    adapter.setObjectNotExists('folder.needBytesFormated', {
        type: 'state',
        common: {
            name: 'needBytesFormated',
            type: 'string',
            role: 'indicator'
        },
        native: {}
    });
    adapter.setObjectNotExists('folder.needFiles', {
        type: 'state',
        common: {
            name: 'needFiles',
            type: 'string',
            role: 'indicator'
        },
        native: {}
    });
    adapter.setObjectNotExists('folder.ignorePatterns', {
        type: 'state',
        common: {
            name: 'ignorePatterns',
            type: 'string',
            role: 'indicator'
        },
        native: {}
    });
    adapter.setObjectNotExists('folder.invalid', {
        type: 'state',
        common: {
            name: 'invalid',
            type: 'string',
            role: 'indicator'
        },
        native: {}
    });
    adapter.setObjectNotExists('folder.state', {
        type: 'state',
        common: {
            name: 'state',
            type: 'string',
            role: 'indicator'
        },
        native: {}
    });
    adapter.setObjectNotExists('folder.stateChange', {
        type: 'state',
        common: {
            name: 'stateChange',
            type: 'string',
            role: 'indicator'
        },
        native: {}
    });
    adapter.setObjectNotExists('folder.version', {
        type: 'state',
        common: {
            name: 'version',
            type: 'string',
            role: 'indicator'
        },
        native: {}
    });


    // in this function all states changes inside the adapters namespace are subscribed
    //adapter.subscribeStates('*');

    // START OF SYNCTHING SCRIPTING
    // Update syncthing status
    invokeSyncthingUpdate();
}

/*
* SYNCTHING SPECIFIC FUNCTIONS
*/

function invokeSyncthingUpdate() {
    // Fire API call to syncthing endpoint and update object variables
    httpGetSyncthing();
}

// Invokes HTTP Request
function httpGetSyncthing() {
    // Create full URL of endpoint
    var syncthingURL = adapter.config.syncthingurl + endpoint_DBStatus + "?folder=" + adapter.config.syncthingfolderid;
    // Prepare new request
    const request = require('request-promise')
    const options = {
        method: 'GET',
        uri: syncthingURL,
        json: true,
        headers: {
            'User-Agent': 'ioBroker Request-Promise',
            'Accept': "text/plain",
            'Content-Type': "text/plain",
            'X-API-Key': adapter.config.syncthingapikey
        }
    }
    // Fire request
    request(options)
        .then(function (response) {
            // Request was successful, use the response object at will
            adapter.log.info("Request to " + syncthingURL + " was successfull");
            // Set the adapter output values
            adapter.setState('folder.globalBytes', { val: response.globalBytes, ack: true });
            adapter.setState('folder.globalBytesFormated', { val: formatBytes(response.globalBytes), ack: true });
            adapter.setState('folder.globalDeleted', { val: response.globalDeleted, ack: true });
            adapter.setState('folder.globalFiles', { val: response.globalFiles, ack: true });
            adapter.setState('folder.localBytes', { val: response.localBytes, ack: true });
            adapter.setState('folder.localBytesFormated', { val: formatBytes(response.localBytes), ack: true });
            adapter.setState('folder.localDeleted', { val: response.localDeleted, ack: true });
            adapter.setState('folder.localFiles', { val: response.localFiles, ack: true });
            adapter.setState('folder.inSyncBytes', { val: response.inSyncBytes, ack: true });
            adapter.setState('folder.inSyncBytesFormated', { val: formatBytes(response.inSyncBytes), ack: true });
            adapter.setState('folder.inSyncFiles', { val: response.inSyncFiles, ack: true });
            adapter.setState('folder.needBytes', { val: response.localBytes, ack: true });
            adapter.setState('folder.needBytesFormated', { val: formatBytes(response.needBytes), ack: true });
            adapter.setState('folder.needFiles', { val: response.needFiles, ack: true });
            adapter.setState('folder.ignorePatterns', { val: response.ignorePatterns, ack: true });
            adapter.setState('folder.invalid', { val: response.invalid, ack: true });
            adapter.setState('folder.state', { val: response.state, ack: true });
            adapter.setState('folder.stateChange', { val: response.stateChanged, ack: true });
            adapter.setState('folder.version', { val: response.version, ack: true });
        })
        .catch(function (err) {
            // Something bad happened, handle the error
            adapter.log.info("Request to " + syncthingURL + " failed");
            // Set the adapter output values to error
            adapter.setState('folder.globalBytes', { val: '', ack: true });
            adapter.setState('folder.globalBytesFormated', { val: '', ack: true });
            adapter.setState('folder.globalDeleted', { val: '', ack: true });
            adapter.setState('folder.globalFiles', { val: '', ack: true });
            adapter.setState('folder.localBytes', { val: '', ack: true });
            adapter.setState('folder.localBytesFormated', { val: '', ack: true });
            adapter.setState('folder.localDeleted', { val: '', ack: true });
            adapter.setState('folder.localFiles', { val: '', ack: true });
            adapter.setState('folder.inSyncBytes', { val: '', ack: true });
            adapter.setState('folder.inSyncBytesFormated', { val: '', ack: true });
            adapter.setState('folder.inSyncFiles', { val: '', ack: true });
            adapter.setState('folder.needBytes', { val: '', ack: true });
            adapter.setState('folder.needBytesFormated', { val: '', ack: true });
            adapter.setState('folder.needFiles', { val: '', ack: true });
            adapter.setState('folder.ignorePatterns', { val: '', ack: true });
            adapter.setState('folder.invalid', { val: '', ack: true });
            adapter.setState('folder.state', { val: '', ack: true });
            adapter.setState('folder.stateChange', { val: '', ack: true });
            adapter.setState('folder.version', { val: '', ack: true });
        }
    )
    // Stop adapter after updating all values
    stopAdapter(false);
}

// Stops this adapter
function stopAdapter(isTimeout) {
    // Stop Adapter (immediately)
    clearTimeout(terminating_timer);
    if (isTimeout) {
      adapter.log.info("Force terminating after 10 seconds");
    }
    adapter.stop();
}

// Converts byte size unit into proper larger size unit
function formatBytes(bytes) {
    if (bytes < 1024) return bytes + " Bytes";
    else if (bytes < 1048576) return (bytes / 1024).toFixed(3) + " KB";
    else if (bytes < 1073741824) return (bytes / 1048576).toFixed(3) + " MB";
    else return (bytes / 1073741824).toFixed(3) + " GB";
};
