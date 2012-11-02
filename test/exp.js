/**
 * Created with JetBrains WebStorm.
 * User: Carmack.Shi <baoxu.shi@gmail.com>
 * Date: 12-11-2
 * Time: 下午2:08
 * To change this template use File | Settings | File Templates.
 */

var WebSocketClient = require("../node_modules/websocket/lib/WebSocketClient.js");

var args = {
    secure:false
}

var wsClient = new WebSocketClient();
wsClient.connect("ws://127.0.0.1:9876",'brain_burst');
wsClient.on('connect', function(connection){
    console.log("connected!");
});
wsClient.on('close', function(){
    console.log('error');
});
wsClient.on('connectFailed', function(error){
   console.log(error);
});