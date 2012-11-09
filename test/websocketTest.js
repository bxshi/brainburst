/**
 * Created with JetBrains WebStorm.
 * User: bxshi
 * Date: 12-11-9
 * Time: PM12:57
 * To change this template use File | Settings | File Templates.
 */

var should = require("should");
var testConf = require("./configuration.js").testConfig;

describe('- Websocket connection test', function(){
    it('* Should establish connection correctly(with right protocol)', function(done){
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
    it('* Should establish connection correctly(with right protocol in a protocol list)', function(done){
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
    it('* Should disconnected by server.(without protocol)(also, that may crash server if there is not a protocol validation)', function(done){
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
    it('* Should disconnected by server.(with a empty protocol list)',function(done){
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
        });
    });
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

    it("* user_login with a invalid uuid",function(done){
        var wsClient = create_ws_client(testConf.wsUrl+':'+testConf.wsPort,'brain_burst');
        wsClient.on('connect', function(connection){
            connection.sendUTF('{"msg_id":1, "type":"user_login", "user":{"user_id":"123123"}}');
            connection.on('message', function(message){
                var JSONmsg = JSON.parse(message.utf8Data);
                JSONmsg.should.have.property('msg_id');
                JSONmsg.should.have.property('status');
                JSONmsg.should.not.have.property('user');
                JSONmsg.msg_id.should.equal(1);
                JSONmsg.status.should.equal('error');
                done();
            });
        });
    });

    it("* user_login without a uuid(register)", function(done){
        var wsClient = create_ws_client(testConf.wsUrl+':'+testConf.wsPort,'brain_burst');
        wsClient.on('connect', function(connection){
            connection.sendUTF('{"msg_id":1, "type":"user_login"}');
            connection.on('message', function(message){
                var JSONmsg = JSON.parse(message.utf8Data);
                JSONmsg.should.have.property('msg_id');
                JSONmsg.should.have.property('status');
                JSONmsg.should.have.property('user');
                JSONmsg.user.should.have.property('user_id');
                JSONmsg.msg_id.should.equal(1);
                JSONmsg.status.should.equal('ok');
                done();
            });
        });
    });

    it("* user_login with a valid uuid", function(done){
        var wsClient = create_ws_client(testConf.wsUrl+':'+testConf.wsPort,'brain_burst');
        var uuid;
        wsClient.on('connect', function(connection){
            connection.sendUTF('{"msg_id":1, "type":"user_login"}');
            connection.on('message', function(message){
                var JSONmsg = JSON.parse(message.utf8Data);
                JSONmsg.should.have.property('msg_id');
                JSONmsg.should.have.property('status');
                JSONmsg.should.have.property('user');
                JSONmsg.user.should.have.property('user_id');
                JSONmsg.msg_id.should.equal(1);
                JSONmsg.status.should.equal('ok');
                uuid = JSONmsg.user.user_id;
                connection.close();
            });
            connection.on('close', function(message){
                var wsClient = create_ws_client(testConf.wsUrl+':'+testConf.wsPort,'brain_burst');
                wsClient.on('connect', function(connection){
                    connection.sendUTF('{"msg_id":1,"type":"user_login","user":{"user_id":"'+uuid+'"}}');
                    connection.on('message', function(message){
                        var JSONmsg = JSON.parse(message.utf8Data);
                        JSONmsg.status.should.equal('ok');
                        should.exist(JSONmsg.user.user_id);
                        done();
                    });
                });
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