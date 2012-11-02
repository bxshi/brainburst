/**
 * Created with JetBrains WebStorm.
 * User: Carmack.Shi <baoxu.shi@gmail.com>
 * Date: 12-11-2
 * Time: 下午1:30
 * To change this template use File | Settings | File Templates.
 */

var assert = require("should");

describe('websocket', function(){
    describe('websocket establish connection', function(){
        it('should return ok', function(){
            var WebSocketClient = require("../node_modules/websocket/lib/WebSocketClient.js");
            var res;
            var args = {
                secure:false
            };
            var wsClient = new WebSocketClient();
            wsClient.connect("ws://127.0.0.1:9876",'brain_burst');
            wsClient.on('connect', function(connection){
                res = true;
                wsClient.close();
                done();
            });
            wsClient.on('close', function(){
                done();
            });
            wsClient.on('connectFailed', function(error){
                res = false;
                done();
            });

            res.should.be.ok;

        });
    });
});