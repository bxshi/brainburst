/**
 * Created with JetBrains WebStorm.
 * User: bxshi
 * Date: 12-11-14
 * Time: AM10:07
 * To change this template use File | Settings | File Templates.
 */
var should = require("should");
var wsconf = require("../libs4test/configuration.js").websocket;
var wsCreator = require("../libs4test/client.js");
var jsonBuilder = require("../libs4test/clientJSONBuilder.js");

describe('# Get Matches Test',function(){

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
                connection.sendUTF(JSON.stringify(jsonBuilder.user_login_builder(null,"get_matches client"+i)));
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

    var test1 = "## create match by `player` method";
    it(test1, function(done){
        var pusher = 0;
        var creator = 0;
        var get_matches_push = 0;
        Object.keys(workers).forEach(function(i){
            var opponent_index = (parseInt(i) < (worker_number-1))?parseInt(i)+1:0;
            var invitation_index = (parseInt(i) > 0)?parseInt(i)-1:worker_number-1;
            workers[i].connection.sendUTF(JSON.stringify(jsonBuilder.create_match_builder('player',workers[i].user,{'match_data':"worker"+i},[workers[opponent_index].user.user_id])));
            workers[i].connection.on('message', function(message){
                var JSONmsg = JSON.parse(message.utf8Data);
//                console.dir(JSONmsg);
                should.exists(JSONmsg);
                if(JSONmsg.msg_id == -1){//it is a push
                    should.exists(JSONmsg.match);
                    should.exists(JSONmsg.match.match_id);
                    should.exists(JSONmsg.match.match_data);
                    should.exists(JSONmsg.match.players);
                    should.exists(JSONmsg.type);
                    JSONmsg.type.should.equal("invited_match");
                    JSONmsg.match.players.should.include(workers[invitation_index].user.user_id);
                    pusher++;
                }else if(JSONmsg.msg_id == 2){
                    should.exists(JSONmsg.match);
                    should.exists(JSONmsg.match.match_id);
                    should.exists(JSONmsg.match.match_data);
                    should.exists(JSONmsg.match.players);
                    should.exists(JSONmsg.status);
                    JSONmsg.status.should.equal('ok');
                    JSONmsg.match.match_data.should.equal('worker'+i);
                    JSONmsg.match.players.should.include(workers[i].user.user_id);
                    creator++;
                }else if(JSONmsg.msg_id == 5){
                    should.exists(JSONmsg.status);
                    JSONmsg.status.should.equal('ok');
                    should.exists(JSONmsg.matches);
                    JSONmsg.matches.length.should.above(0);
                    for(var j in JSONmsg.matches){
                        JSONmsg.matches[j].should.have.property('match_id');
                        JSONmsg.matches[j].should.have.property('players');
                        JSONmsg.matches[j].should.have.property('match_data');
                    }
                    get_matches_push++;
                    if(get_matches_push==worker_number){
                        done();
                    }
                }
                if(creator == 10 && pusher == 10){
                    workers[i].connection.sendUTF(JSON.stringify(jsonBuilder.get_matches_builder(workers[i].user)));
                }
            });
        });
    });

    it("## Get matches when user do not have any match.", function(done){
        workers[0].connection.sendUTF(JSON.stringify(jsonBuilder.get_matches_builder(workers[0].user)));
        workers[0].connection.on('message',function(message){
            var JSONmsg = JSON.parse(message.utf8Data);
            should.exists(JSONmsg);
            should.exists(JSONmsg.status);
            JSONmsg.status.should.equal('ok');
            if(JSONmsg.msg_id == 5){
                //here it represents as undefined, but in JSON string it is a [] (empty array)
                should.not.exists(JSONmsg.match);
                done();
            }
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