/**
 * Created with JetBrains WebStorm.
 * User: bxshi
 * Date: 12-11-12
 * Time: PM5:05
 * To change this template use File | Settings | File Templates.
 */
var should = require("should");
var testConf = require("./configuration.js").testConfig;

describe('- Websocket user_login test', function(){

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
            connection.sendUTF('{"msg_id":1, "type":"user_login", "user":{"data":"abcdefg"}}');
            connection.on('message', function(message){
                var JSONmsg = JSON.parse(message.utf8Data);
                JSONmsg.should.have.property('msg_id');
                JSONmsg.should.have.property('status');
                JSONmsg.should.have.property('user');
                JSONmsg.user.should.have.property('user_id');
                JSONmsg.user.should.have.property('data');
                JSONmsg.user.data.should.equal('abcdefg');
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
            connection.sendUTF('{"msg_id":1, "type":"user_login", "user":{"data":"12345"}}');
            connection.on('message', function(message){
                var JSONmsg = JSON.parse(message.utf8Data);
                JSONmsg.should.have.property('msg_id');
                JSONmsg.should.have.property('status');
                JSONmsg.should.have.property('user');
                JSONmsg.user.should.have.property('user_id');
                JSONmsg.user.should.have.property('data');
                JSONmsg.user.data.should.equal('12345');
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
                        should.exist(JSONmsg.user.data);
                        JSONmsg.user.data.should.equal('12345');
                        done();
                    });
                });
            });
        });
    });

    it("* user_login with illegal json(register without user)", function(done){
        var wsClient = create_ws_client(testConf.wsUrl+':'+testConf.wsPort,'brain_burst');
        wsClient.on('connect', function(connection){
            connection.sendUTF('{"msg_id":1, "type":"user_login"}');
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

    it("* user_login with illegal json(register without user.data)", function(done){
        var wsClient = create_ws_client(testConf.wsUrl+':'+testConf.wsPort,'brain_burst');
        wsClient.on('connect', function(connection){
            connection.sendUTF('{"msg_id":1, "type":"user_login", "user":"illegal"}');
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