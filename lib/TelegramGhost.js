"use strict";

var TelegramLink = require("telegram.link")();
var Promise = require("bluebird");

var os = require("os");

// As registered at
//   https://my.telegram.org/auth?to=apps
var APP = {
    id: "57582",
    hash: "7e085c887f71c9f1480c3930547ac159",
    version: "0.0.1",
    langCode: "en",
    deviceModel: os.type().replace("Darwin", "OS_X"),
    systemVersion: os.platform() + "/" + os.release(),
    connectionType: "HTTP",
};

function TelegramGhost(opts) {
    this._main = opts.main;
}

// These internal functions basically just wrap the underlying TelegramLink
//   methods in promise-returning wrappers.

function _isError(result) { return result.instanceOf("mtproto.type.Rpc_error"); }

function _createAuthKey(client) {
    return new Promise(function (fulfill, reject) {
        client.once('error', reject);
        client.createAuthKey((auth) => {
            client.removeListener('error', reject);
            fulfill(auth);
        });
    });
}

var SEND_CODE_SMS = 0;
var SEND_CODE_TELEGRAM = 5;

function _sendCode(client, phone_number) {
    return new Promise(function (fulfill, reject) {
        client.auth.sendCode(phone_number, SEND_CODE_TELEGRAM, "en");
        client.once('error', reject);

        client.once('sendCode', (result) => {
            if (_isError(result)) { reject(result); }
            else                  { fulfill(result); }
        });
    });
}

// Internal methods that use theabove
TelegramGhost.prototype._getClient = function(dc) {
    dc = dc || TelegramLink.PROD_PRIMARY_DC;

    // TODO: check that dc matches
    if (this._client) return Promise.resolve(this._client);

    var p = new Promise(function (fulfill, reject) {
        var client = TelegramLink.createClient(APP, dc);
        client.once('connect', () => {
            client.removeListener('error', reject);
            fulfill(client);
        });
        client.once('error', reject);
    });
    return p.then((client) => {
        return _createAuthKey(client).then(() => {
            this._client = client;
            return client;
        });
    });
};

TelegramGhost.prototype.sendCode = function(phone_number) {
    return this._getClient().then((client) => {
        return _sendCode(client, phone_number);
    });
};

module.exports = TelegramGhost;