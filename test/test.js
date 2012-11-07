/**
 * Created with JetBrains WebStorm.
 * User: Carmack.Shi <baoxu.shi@gmail.com>
 * Date: 12-11-2
 * Time: 下午1:30
 * To change this template use File | Settings | File Templates.
 */

var assert = require("should");

console.log('\n\n===WebsocketBasicTest===');

describe("# WebsocketBasicTest", function(done){
    describe('- Websocket establish connection', function(){
        it('* Should establish connection correctly', function(done){
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
        });
        it('* Should establish connection correctly', function(done){
            var res;
            var wsClient = create_ws_client('ws://127.0.0.1:9876',['brain_burst','foobar']);
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
        });
        it('* should disconnected by server.(also, that may crash server if there is not a protocol validation)', function(done){
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
        it('* should disconnected by server',function(done){
            var res;
            var wsClient = create_ws_client('ws://127.0.0.1:9876',[]);
            wsClient.on('connect', function(connection){
                res = true;
                res.should.be.false;
                done();
            });
            wsClient.on('connectFailed', function(error){
                res = false;
                res.should.be.false;
                done();
            });        });
    });
});

console.log('===RedisDataBaseTest===');
//TODO test Redis database, try using APIs used by this project to test it

console.log('===ConnectionPoolTest===');
//TODO test connection pool consistency between multi-process routers.

console.log('===MongoDBDataBaseTest===');
//TODO test MongoDB database, try using APIs used by this project to test it

console.log('===BackEndLogicTest===');
//TODO test logic by using websocket API to test

console.log('===ComplicatingTest===');
//TODO test response time for thousands of requests per second.

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