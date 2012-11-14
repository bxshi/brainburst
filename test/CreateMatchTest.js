/**
 * Created with JetBrains WebStorm.
 * User: bxshi
 * Date: 12-11-13
 * Time: PM2:50
 * To change this template use File | Settings | File Templates.
 */
var should = require("should");
var wsconf = require("../libs4test/configuration.js").websocket;
var wsCreator = require("../libs4test/client.js");
var jsonBuilder = require("../libs4test/clientJSONBuilder.js");

describe('# Create Match Test',function(){

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
                connection.sendUTF(JSON.stringify(jsonBuilder.user_login_builder(null,"create_match client"+i)));
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
    var test1 = "## create match by `auto` method";
    it(test1, function(done){
        var creator = 0;
        var joiner = 0;
        Object.keys(workers).forEach(function(i){
            workers[i].connection.sendUTF(JSON.stringify(jsonBuilder.create_match_builder('auto',workers[i].user,{'match_data':"worker"+i})));
            workers[i].connection.on('message', function(message){
                var JSONmsg = JSON.parse(message.utf8Data);
                should.exists(JSONmsg);
                if(JSONmsg.msg_id != -1){//it is not a push
                    should.exists(JSONmsg.status);
                    JSONmsg.status.should.equal('ok');
                }
                should.exists(JSONmsg.match);
                if(JSONmsg.type != 'join_match') {
                    should.exists(JSONmsg.match.match_data);
                    JSONmsg.match.match_data.should.match(/worker[0-9]/gi);
                    if(JSONmsg.match.match_data == "worker"+i) {
                        creator++;
                    }else{
                        joiner++;
                    }

                    if(creator+joiner == worker_number){
                        done();
                    }
                }
            });
        });
    });

    var test2 = "## create match by `player` method";
    it(test2, function(done){
        var pusher = 0;
        var creator = 0;
        Object.keys(workers).forEach(function(i){
            var opponent_index = (parseInt(i) < (worker_number-1))?parseInt(i)+1:0;
            var invitation_index = (parseInt(i) > 0)?parseInt(i)-1:worker_number-1;
            workers[i].connection.sendUTF(JSON.stringify(jsonBuilder.create_match_builder('player',workers[i].user,{'match_data':"worker"+i},[workers[opponent_index].user.user_id])));
            workers[i].connection.on('message', function(message){
                var JSONmsg = JSON.parse(message.utf8Data);
                should.exists(JSONmsg);
                should.exists(JSONmsg.match);
                should.exists(JSONmsg.match.match_id);
                should.exists(JSONmsg.match.match_data);
                should.exists(JSONmsg.match.players);
                if(JSONmsg.msg_id == -1){//it is a push
                    should.exists(JSONmsg.type);
                    JSONmsg.type.should.equal("invited_match");
                    JSONmsg.match.players.should.include(workers[invitation_index].user.user_id);
                    pusher++;
                }else if(JSONmsg.msg_id == 2){
                    should.exists(JSONmsg.status);
                    JSONmsg.status.should.equal('ok');
                    JSONmsg.match.match_data.should.equal('worker'+i);
                    JSONmsg.match.players.should.include(workers[i].user.user_id);
                    creator++;
                }
                if(creator == 10 && pusher == 10){
                    done();
                }
            });
        });
    });

    it("## invite non-exist user to play");

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