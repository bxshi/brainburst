/**
 * Created with JetBrains WebStorm.
 * User: Carmack.Shi <baoxu.shi@gmail.com>
 * Date: 12-11-2
 * Time: 下午1:30
 * To change this template use File | Settings | File Templates.
 */

var assert = require("should");
describe("FrontEndTest", function(){
    describe('websocket establish connection', function(){
        it('should establish connection correctly', function(done){
            var res;
            var wsClient = create_ws_client('ws://127.0.0.1:9876','brain_burst');
            wsClient.on('connect', function(connection){
                res = true;
                res.should.be.true;
                done();
            });
            wsClient.on('connectFailed', function(error){
                res = false;
                res.should.be.true;
                done();
            });
            console.log(res);
        });
        it('should disconnected by server.(also, that may crash server if there is not a protocol validation)', function(done){
            var res;
            var wsClient = create_ws_client('ws://127.0.0.1:9876');
            wsClient.on('connect', function(connection){
                res = true;
                res.should.be.false;
                done();
            });
            wsClient.on('connectFailed', function(error){
                res = false;
                res.should.be.false;
                done();
            });
        });
    });
});


//test functions

function create_ws_client(url,protocol) {
    var WebSocketClient = require("../node_modules/websocket/lib/WebSocketClient.js");
    var args = {
        secure:false
    };
    var wsClient = new WebSocketClient();
    wsClient.connect(url, protocol);
    return wsClient;
}