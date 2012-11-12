/**
 * Created with JetBrains WebStorm.
 * User: bxshi
 * Date: 12-11-12
 * Time: PM5:06
 * To change this template use File | Settings | File Templates.
 */
var should = require("should");
var testConf = require("./configuration.js").testConfig;

describe('- Websocket create_match test', function(){

    it("* create_match with a valid uuid, auto match", function(done){
        var wsClient = create_ws_client(testConf.wsUrl+':'+testConf.wsPort,'brain_burst');
        wsClient.on('connect', function(connection){
            connection.sendUTF('{"msg_id":1, "type":"user_login", "user":{"data":"abcdefg"}}');
            connection.on('message', function(message){
                console.log(message.utf8Data);
                var JSONmsg = JSON.parse(message.utf8Data);
                if(JSONmsg.msg_id == 1){
                    connection.sendUTF('{"msg_id":2, "user":{"user_id":"'+JSONmsg.user.user_id+'"},"type":"create_match", "game":"letter_press","create_method":"auto","max_players":2,"match_data":"aloha"}');
                }else if(JSONmsg.msg_id == 2){
                    should.exists(JSONmsg.match);
                    done();
                }
            });
        });
    });
    it("* create_match with a valid uuid, player match", function(done){
        var wsClient = create_ws_client(testConf.wsUrl+':'+testConf.wsPort,'brain_burst');
        wsClient.on('connect', function(connection){
            connection.sendUTF('{"msg_id":1, "type":"user_login", "user":{"data":"abcdefg"}}');
            connection.on('message', function(message){
                console.log(message.utf8Data);
                var JSONmsg = JSON.parse(message.utf8Data);
                if(JSONmsg.msg_id == 1){
                    connection.sendUTF('{"msg_id":2, "user":{"user_id":"'+JSONmsg.user.user_id+'"},"type":"create_match", "game":"letter_press","create_method":"player","max_players":2,"opponent_user_id":["1"],"match_data":"aloha"}');
                }else if(JSONmsg.msg_id == 2){
                    should.exists(JSONmsg.match);
                    done();
                }
            });
        });
    });
    it("* create_match two clients, one login, the other invites him to play a game.", function(done){
        var wsClient1 = create_ws_client(testConf.wsUrl+':'+testConf.wsPort,'brain_burst');
        var JSONmsg1;
        wsClient1.on('connect', function(connection){
            connection.sendUTF('{"msg_id":1, "type":"user_login", "user":{"data":"abcdefg"}}');
            connection.on('message', function(message){
                JSONmsg1 = JSON.parse(message.utf8Data);
                if(JSONmsg1.msg_id == -1){
                    JSONmsg1.type.should.equal("invited_match");
                    done();
                }else{
                    should.exists(JSONmsg1);
                    var wsClient2 = create_ws_client(testConf.wsUrl+':'+testConf.wsPort,'brain_burst');
                    wsClient2.on('connect', function(connection){
                        connection.sendUTF('{"msg_id":1, "type":"user_login", "user":{"data":"abcdefg"}}');
                        connection.on('message', function(message){
                            var JSONmsg2 = JSON.parse(message.utf8Data);
                            should.exists(JSONmsg2);
                            if(JSONmsg2.msg_id == 1){
                                console.log("output "+JSON.stringify(JSONmsg2));
                                connection.sendUTF('{"msg_id":2, "user":{"user_id":"'+JSONmsg2.user.user_id+'"},"type":"create_match", "game":"letter_press","create_method":"player","max_players":2,"opponent_user_id":["'+JSONmsg1.user.user_id+'"],"match_data":"aloha"}');
                            }
                        });
                    });
                }
            });
        });
    });

    it("* create_match two clients, one login then logout, the other invites him to play a game.", function(done){

        var wsClient1 = create_ws_client(testConf.wsUrl+':'+testConf.wsPort,'brain_burst');
        var JSONmsg1;
        wsClient1.on('connect', function(connection){
            connection.sendUTF('{"msg_id":1, "type":"user_login", "user":{"data":"1"}}');
            connection.on('message', function(message){
                JSONmsg1 = JSON.parse(message.utf8Data);
                should.exists(JSONmsg1);
                connection.close();//close connection
            });
            connection.on('close',function(){
                console.log("disconnected");
                var wsClient2 = create_ws_client(testConf.wsUrl+':'+testConf.wsPort,'brain_burst');
                wsClient2.on('connect', function(connection){
                    connection.sendUTF('{"msg_id":1, "type":"user_login", "user":{"data":"2"}}');
                    connection.on('message', function(message){
                        var JSONmsg2 = JSON.parse(message.utf8Data);
                        should.exists(JSONmsg2);
                        if(JSONmsg2.msg_id == 1){
                            connection.sendUTF('{"msg_id":2, "user":{"user_id":"'+JSONmsg2.user.user_id+'"},"type":"create_match", "game":"letter_press","create_method":"player","max_players":2,"opponent_user_id":["'+JSONmsg1.user.user_id+'"],"match_data":"aloha"}');
                            var wsClient = create_ws_client(testConf.wsUrl+':'+testConf.wsPort,'brain_burst');
                            wsClient.on('connect', function(connection){
                                connection.sendUTF('{"msg_id":1, "type":"user_login", "user":{"user_id":"'+JSONmsg1.user.user_id+'"}}');
                                connection.on('message', function(message){
                                    var JSONmsg = JSON.parse(message.utf8Data);
                                    console.log(message.utf8Data);
                                    if(JSONmsg.msg_id == -1){
                                        JSONmsg.type.should.equal("invited_match");
                                        done();
                                    }
                                });
                            });
                        }
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