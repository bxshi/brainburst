/**
 * Created with JetBrains WebStorm.
 * User: bxshi
 * Date: 12-11-12
 * Time: PM7:04
 * To change this template use File | Settings | File Templates.
 */
var should = require("should");
var testConf = require("./configuration.js").testConfig;
var ce = require('cloneextend');

describe('- Websocket remove_match test', function(){

    it("* create_match and then remove it, user will get a push", function(done){
        var user_id;
        var wsClient = create_ws_client(testConf.wsUrl+':'+testConf.wsPort,'brain_burst');
        wsClient.on('connect', function(connection){
            connection.sendUTF('{"msg_id":1,"type":"user_login","user":{"data":"wtf"}}');
            connection.on('message', function(message){
                var JSONmsg = JSON.parse(message.utf8Data);
                if(JSONmsg.msg_id == 1){
                    connection.sendUTF('{"msg_id":2, "user":{"user_id":"'+JSONmsg.user.user_id+'"},"type":"create_match", "game":"letter_press","create_method":"auto","max_players":2,"match_data":"aloha"}');
                }else if(JSONmsg.msg_id == 2){
                    should.exists(JSONmsg.match);
                    var wsClient2 = create_ws_client(testConf.wsUrl+':'+testConf.wsPort,'brain_burst');
                    wsClient2.on('connect', function(){
                        connection.sendUTF('{"msg_id":1,"type":"user_login","user":{"data":"wtf"}}');
                        connection.on('message', function(message){
                            var JSONmsg = JSON.parse(message.utf8Data);
                            if(JSONmsg.msg_id == 1){
                                should.exists(JSONmsg.user);
                                should.exists(JSONmsg.user.user_id);
                                user_id = ce.clone(JSONmsg.user.user_id);
                                connection.sendUTF('{"msg_id":2, "user":{"user_id":"'+JSONmsg.user.user_id+'"},"type":"create_match", "game":"letter_press","create_method":"auto","max_players":2,"match_data":"aloha"}');
                            }else if (JSONmsg.msg_id == 2){
                                should.exists(JSONmsg.match);
                                should.exists(JSONmsg.match.match_id);
                                should.exists(user_id);
                                connection.sendUTF('{"msg_id":3, "user":{"user_id":"'+user_id+'"},"type":"remove_match","game":"letter_press","match":{"match_id":"'+JSONmsg.match.match_id+'"}}');
                            }else if (JSONmsg.msg_id == 3){
                                should.exists(JSONmsg.status);
                                JSONmsg.status.should.equal('ok');
                            }
                        });
                    });
                }else if(JSONmsg.msg_id == -1){
                    if (JSONmsg.type != 'join_match'){
                        JSONmsg.type.should.equal('leave_match');
                        done();
                    }else{
                        JSONmsg.type.should.equal('join_match');
                    }
                }
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