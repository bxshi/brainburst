/**
 * Created with JetBrains WebStorm.
 * User: bxshi
 * Date: 12-11-13
 * Time: PM4:39
 * To change this template use File | Settings | File Templates.
 */
var should = require("should");
var wsconf = require("../libs4test/configuration.js").websocket;
var wsCreator = require("../libs4test/client.js");
var jsonBuilder = require("../libs4test/clientJSONBuilder.js");

describe('# Leave Match Test',function(){

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
                connection.sendUTF(JSON.stringify(jsonBuilder.user_login_builder(null,"remove_match client"+i)));
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

    var test2 = "## leave match by `player` method";
    it(test2, function(done){
        var leaver = 0;
        var leave_push = 0;
        Object.keys(workers).forEach(function(i){
            var opponent_index = (parseInt(i) < (worker_number-1))?parseInt(i)+1:0;
            var invitation_index = (parseInt(i) > 0)?parseInt(i)-1:worker_number-1;
            workers[i].connection.sendUTF(JSON.stringify(jsonBuilder.create_match_builder('player',workers[i].user,{'match_data':"worker"+i},[workers[opponent_index].user.user_id])));
            workers[i].connection.on('message', function(message){
//                console.log(message.utf8Data);
                var JSONmsg = JSON.parse(message.utf8Data);
                should.exists(JSONmsg);
                if(JSONmsg.msg_id!=3){
                    should.exists(JSONmsg.match);
                    should.exists(JSONmsg.match.match_id);
                    should.exists(JSONmsg.match.players);
                }
                if(JSONmsg.msg_id == -1 && JSONmsg.type == "invited_match"){//it is a push
                    should.exists(JSONmsg.type);
                    should.exists(JSONmsg.match.match_data);
                    JSONmsg.type.should.equal("invited_match");
                    JSONmsg.match.players.should.include(workers[invitation_index].user.user_id);
                    workers[i].connection.sendUTF(JSON.stringify(jsonBuilder.leave_match_builder(workers[i].user,JSONmsg.match.match_id)));
                    leaver++;
                }else if(JSONmsg.msg_id == 2){
                    should.exists(JSONmsg.status);
                    JSONmsg.status.should.equal('ok');
                    JSONmsg.match.match_data.should.equal('worker'+i);
                    JSONmsg.match.players.should.include(workers[i].user.user_id);
                }else if(JSONmsg.type == "leave_match"){//get push about "leave_match"
                    should.exists(JSONmsg.match);
                    should.exists(JSONmsg.match.players);
                    JSONmsg.match.players.should.include(workers[i].user.user_id);
                    JSONmsg.match.players.should.not.include(workers[invitation_index].user.user_id);
                    leave_push++;
                }
                if(leaver == 10 && leave_push == 10){
                    done();
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