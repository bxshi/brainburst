/**
 * Created with JetBrains WebStorm.
 * User: bxshi
 * Date: 12-11-13
 * Time: PM12:11
 * websocket client generator.
 */
var create_ws_client = function(host,port,protocol) {
    var WebSocketClient = require("../node_modules/websocket/lib/WebSocketClient.js");
    var args = {
        secure:false
    };
    var wsClient = new WebSocketClient();
    wsClient.connect(host+":"+port, protocol);
    return wsClient;
}

module.exports = create_ws_client;