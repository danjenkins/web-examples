(function (respoke, App) {
    'use strict';

    /**
     * Establishes a client connection through the respoke API
     * @param {String} endpointId
     * @param {Function} cb
     * @returns {Promise}
     */
    App.models.client = function (endpointId, cb) {

        var client = respoke.createClient({
            appId: '71a6f0fc-7f56-4adc-bfc7-bda782d1289c',
            developmentMode: true
        });

        client.connect({
            endpointId: endpointId,
            presence: 'available'
        }).done(function () {
            cb(client);
        });

        return client;
    };

}(respoke, App));