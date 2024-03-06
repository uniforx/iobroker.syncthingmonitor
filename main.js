"use strict";

const utils = require('@iobroker/adapter-core'); // Get common adapter utils

const adapter = utils.Adapter('syncthingmonitor');

let saveTimer;

adapter.on('unload', function (callback) {
    adapter.setState('info.connection', false, true);
    try {
        adapter.log.info('adpater unloaded');
        callback();
    } catch (e) {
        callback();
    }
});

adapter.on('objectChange', function (id, obj) {
    if(obj && obj !== null) {
        adapter.log.info('objectChange ' + id + ' ' + JSON.stringify(obj));
    } else {
        adapter.log.info('objectDeleted ' + id);
    }
});

adapter.on('stateChange', function (id, state) {
    if(state && state !== null) {
        adapter.log.info('stateChange ' + id + ' ' + JSON.stringify(state));
    } else {
        adapter.log.info('stateDeleted ' + id);
    }
    
    if (state && !state.ack) {
        adapter.log.info('ack is not set!');
    }
});

adapter.on('ready', function () {
    saveTimer = setTimeout(() => stopAdapter(true), 10000);
    onReady();
});

adapter.on('end', function () {
    adapter.setState('info.connection', false, true);
});

function onReady() {
    adapter.log.info('Using config syncthingIp: ' + adapter.config.syncthingIp + ' | syncthingPort: ' + adapter.config.syncthingPort +' | syncthingApiKey: ' + adapter.config.syncthingApiKey);
    adapter.setState('info.connection', false, true);
    const request = require('request-promise');

    // Folder
    let requestUrl = 'http://' + adapter.config.syncthingIp + ':' + adapter.config.syncthingPort + '/rest/stats/folder';
    adapter.log.info('Try request to ' + requestUrl);
    let options = {
        method: 'GET',
        url: requestUrl,
        json: true,
        headers: {
            'User-Agent': 'ioBroker Request-Promise',
            'Accept': 'text/plain',
            'Content-Type': 'text/plain',
            'X-API-Key': adapter.config.syncthingApiKey
        }
    }

    request(options)
        .then(function (response) {
            adapter.log.info("Request was successful");
            adapter.log.info(JSON.stringify(response));
            let keys = Object.keys(response);
            keys.forEach(function(key) {
                adapter.log.info(JSON.stringify(response[key]));
                adapter.setObjectNotExists('folder.'+key, {
                    type: 'channel',
                    common: {
                        name: key,
                        type: 'string'
                    },
                    native: {}
                });
                adapter.setObjectNotExists('folder.'+key+'.lastScan', {
                    type: 'state',
                    common: {
                        name: 'lastScan',
                        type: 'date',
                        role: 'value.time',
                        read: true,
                        write: false
                    },
                    native: {}
                });
                adapter.setState('folder.'+key+'.lastScan',response[key].lastScan,true);
            });
        })
        .catch(function (err) {
            adapter.log.info("Request failed");
            adapter.log.info(err);
        }
    )

    // Device
    requestUrl = 'http://' + adapter.config.syncthingIp + ':' + adapter.config.syncthingPort + '/rest/stats/device';
    adapter.log.info('Try request to ' + requestUrl);
    options = {
        method: 'GET',
        url: requestUrl,
        json: true,
        headers: {
            'User-Agent': 'ioBroker Request-Promise',
            'Accept': 'text/plain',
            'Content-Type': 'text/plain',
            'X-API-Key': adapter.config.syncthingApiKey
        }
    }

    request(options)
        .then(function (response) {
            adapter.log.info("Request was successful");
            adapter.log.info(JSON.stringify(response));
            let keys = Object.keys(response);
            keys.forEach(function(key) {
                adapter.log.info(JSON.stringify(response[key]));
                adapter.setObjectNotExists('device.'+key, {
                    type: 'channel',
                    common: {
                        name: key,
                        type: 'string'
                    },
                    native: {}
                });
                adapter.setObjectNotExists('device.'+key+'.lastSeen', {
                    type: 'state',
                    common: {
                        name: 'lastSeen',
                        type: 'date',
                        role: 'value.time',
                        read: true,
                        write: false
                    },
                    native: {}
                });
                adapter.setState('device.'+key+'.lastSeen',response[key].lastSeen,true);
            });
        })
        .catch(function (err) {
                adapter.log.info("Request failed");
                adapter.log.info(err);
            }
        )

    stopAdapter(false);
}

function stopAdapter(isTimeout) {
    clearTimeout(saveTimer);
    if (isTimeout) {
        adapter.log.info("Adapter stop by safeTimer");
    } else {
        adapter.log.info("Adapter stop by end of job");
    }
    adapter.stop();
}
