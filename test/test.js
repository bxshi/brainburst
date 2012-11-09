/**
 * Created with JetBrains WebStorm.
 * User: Carmack.Shi <baoxu.shi@gmail.com>
 * Date: 12-11-2
 * Time: 下午1:30
 * To change this template use File | Settings | File Templates.
 */

var should = require("should");

var testConf = require("./configuration.js").testConfig;

console.log('\n\n===WebsocketBasicTest===');

describe("# WebsocketBasicTest", function(done){
    describe('- Websocket establish connection', function(){
        it('* Should establish connection correctly', function(done){
            var res;
            var wsClient = create_ws_client(testConf.wsUrl+':'+testConf.wsPort,'brain_burst');
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
            var wsClient = create_ws_client(testConf.wsUrl+':'+testConf.wsPort,['brain_burst','foobar']);
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
        it('* Should disconnected by server.(also, that may crash server if there is not a protocol validation)', function(done){
            var res;
            var wsClient = create_ws_client(testConf.wsUrl+':'+testConf.wsPort);
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
        it('* Should disconnected by server',function(done){
            var res;
            var wsClient = create_ws_client(testConf.wsUrl+':'+testConf.wsPort,[]);
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

    describe('- Websocket router test', function(){

        it("* non-json string", function(){
            var res;
            var wsClient = create_ws_client(testConf.wsUrl+':'+testConf.wsPort, 'brain_burst');
            wsClient.on('connect', function(connection){
                connection.sendUTF('I\'m not a json string');
                connection.on('disconnect', function(message){
                    res = false;
                    res.should.not.true;
                    done();
                });
            });
        });

        it("* Should return a status with ok", function(done){
            var wsClient = create_ws_client(testConf.wsUrl+':'+testConf.wsPort,'brain_burst');
            wsClient.on('connect', function(connection){
                connection.sendUTF('{"msg_id":1,"type":"user_login","user":{"user_id":"92ef1c75-6db7-4b48-a5a2-45027dd9840c"}}');
                connection.on('message', function(message){
                    var JSONmsg = JSON.parse(message.utf8Data);
                    JSONmsg.status.should.equal('ok');
                    should.exist(JSONmsg.user.user_id);
                    done();
                });
            });
        });
        it("* Should return a status with ok", function(done){
            var wsClient = create_ws_client(testConf.wsUrl+':'+testConf.wsPort,'brain_burst');
            wsClient.on('connect', function(connection){
                connection.sendUTF('{"type":"create_match"}');
                connection.on('message', function(message){
                    var JSONmsg = JSON.parse(message.utf8Data);
                    JSONmsg.status.should.equal('ok');
                    done();
                });
            });
        });
        it("* Should return a status with ok", function(done){
            var wsClient = create_ws_client(testConf.wsUrl+':'+testConf.wsPort,'brain_burst');
            wsClient.on('connect', function(connection){
                connection.sendUTF('{"type":"remove_match"}');
                connection.on('message', function(message){
                    var JSONmsg = JSON.parse(message.utf8Data);
                    JSONmsg.status.should.equal('ok');
                    done();
                });
            });
        });
        it("* Should return a status with ok", function(done){
            var wsClient = create_ws_client(testConf.wsUrl+':'+testConf.wsPort,'brain_burst');
            wsClient.on('connect', function(connection){
                connection.sendUTF('{"type":"submit_match"}');
                connection.on('message', function(message){
                    var JSONmsg = JSON.parse(message.utf8Data);
                    JSONmsg.status.should.equal('ok');
                    done();
                });
            });
        });
        it("* Should return a status with ok", function(done){
            var wsClient = create_ws_client(testConf.wsUrl+':'+testConf.wsPort,'brain_burst');
            wsClient.on('connect', function(connection){
                connection.sendUTF('{"type":"get_matches"}');
                connection.on('message', function(message){
                    var JSONmsg = JSON.parse(message.utf8Data);
                    JSONmsg.status.should.equal('ok');
                    done();
                });
            });
        });
        it("* Should return a status with ok", function(done){
            var wsClient = create_ws_client(testConf.wsUrl+':'+testConf.wsPort,'brain_burst');
            wsClient.on('connect', function(connection){
                connection.sendUTF('{"type":"online_players"}');
                connection.on('message', function(message){
                    var JSONmsg = JSON.parse(message.utf8Data);
                    JSONmsg.status.should.equal('ok');
                    done();
                });
            });
        });
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