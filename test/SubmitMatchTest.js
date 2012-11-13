/**
 * Created with JetBrains WebStorm.
 * User: bxshi
 * Date: 12-11-13
 * Time: PM5:14
 * To change this template use File | Settings | File Templates.
 */
var should = require("should");
var wsconf = require("../libs4test/configuration.js").websocket;
var wsCreator = require("../libs4test/client.js");
var jsonBuilder = require("../libs4test/clientJSONBuilder.js");

describe('# Submit Match Test',function(){

    var worker_number = 10;
    var workers=[];

    //create connections and login
    beforeEach(function(done){
        var count=0;
        for (var i=0;i<worker_number;i++){
            workers[i] = {};
            workers[i].client = wsCreator(wsconf.host,wsconf.port,wsconf.protocol);
        }
        Object.keys(workers).forEach(function(i) {
            workers[i].client.on('connect',function(connection){
                connection.sendUTF(JSON.stringify(jsonBuilder.user_login_builder(null,"submit_match client"+i)));
                connection.on('message', function(message){
                    var JSONmsg = JSON.parse(message.utf8Data);
                    should.exists(JSONmsg);
                    switch(JSONmsg.msg_id){
                        case 1:
                            JSONmsg.status.should.not.equal('error');
                            should.exists(JSONmsg.user);
                            should.exists(JSONmsg.user.user_id);
                            should.exists(JSONmsg.user.user_data);
                            workers[i].user = JSONmsg.user;
                            if(count<worker_number){
                                count++;
                                workers[i].connection = connection;
                            }
                            if(count==worker_number){
                                done();
                            }
                            break;
                    }
                });
            });
        });
    });

    var test2 = "## submit match by `player` method";
    it(test2, function(done){
        var get_opponent_push = 0;
        var submit = 0;
        Object.keys(workers).forEach(function(i){
            var lock = false;
            var opponent_index = (parseInt(i) < (worker_number-1))?parseInt(i)+1:0;
            var invitation_index = (parseInt(i) > 0)?parseInt(i)-1:worker_number-1;
            workers[i].connection.sendUTF(JSON.stringify(jsonBuilder.create_match_builder('player',workers[i].user,{'match_data':"worker"+i},[workers[opponent_index].user.user_id])));
            workers[i].connection.on('message', function(message){
                var JSONmsg = JSON.parse(message.utf8Data);
                should.exists(JSONmsg);
                if(JSONmsg.msg_id == 4){
                    should.exists(JSONmsg.status);
                    JSONmsg.status.should.equal('ok');
                    return;
                }
                should.exists(JSONmsg.match);
                should.exists(JSONmsg.match.match_id);
                should.exists(JSONmsg.match.match_data);
                if(JSONmsg.msg_id == -1&&JSONmsg.type=="invited_match"){//it is a push
                    should.exists(JSONmsg.match.players);
                    should.exists(JSONmsg.type);
                    JSONmsg.type.should.equal("invited_match");
                    JSONmsg.match.players.should.include(workers[invitation_index].user.user_id);
                }else if(JSONmsg.msg_id == 2){
                    should.exists(JSONmsg.match.players);
                    should.exists(JSONmsg.status);
                    JSONmsg.status.should.equal('ok');
                    JSONmsg.match.match_data.should.equal('worker'+i);
                    JSONmsg.match.players.should.include(workers[i].user.user_id);
                    JSONmsg.match.match_data = "round1";
                    workers[i].connection.sendUTF(JSON.stringify(jsonBuilder.submit_match_builder(workers[i].user,JSONmsg.match)));
                    submit++;
                    if(get_opponent_push==worker_number&&submit==worker_number){
                        done();
                    }
                }else if(JSONmsg.msg_id == -1 && JSONmsg.type == "update_match"){
                    should.exists(JSONmsg.match.from_opponent);
//                    console.log("js:"+JSONmsg.match.from_opponent+" worker:"+workers[i].user.user_id+" invitation:"+workers[invitation_index].user.user_id+" opponent:"+workers[opponent_index].user.user_id);
                    if(JSONmsg.match.from_opponent == workers[i].user.user_id){
                        JSONmsg.match.match_data.should.equal("round1");
                    }else if(JSONmsg.match.from_opponent == workers[invitation_index].user.user_id && lock==false){
                        get_opponent_push++;
                        if(get_opponent_push==worker_number&&submit==worker_number){
                            done();
                        }
                        workers[i].connection.sendUTF(JSON.stringify(jsonBuilder.submit_match_builder(workers[i].user,JSONmsg.match)));
                        lock=true;
                    }
//                    JSONmsg.match.from_opponent.should.equal(workers[invitation_index].user.user_id);
//                    lock=true;
//                    get_opponent_push++;
                }
            });
        });
    });

    //close connections
    afterEach(function(done){
        var count = 0;
        Object.keys(workers).forEach(function(i){
            workers[i].connection.close();
            workers[i].connection.on('close', function(){
                if(count<worker_number){
                    count++;
                }
                if(count==worker_number){
                    done();
                }
            });
        });
    });

});