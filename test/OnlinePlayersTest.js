/**
 * Created with JetBrains WebStorm.
 * User: bxshi
 * Date: 12-11-14
 * Time: AM10:49
 * To change this template use File | Settings | File Templates.
 */
var should = require("should");
var wsconf = require("../libs4test/configuration.js").websocket;
var wsCreator = require("../libs4test/client.js");
var jsonBuilder = require("../libs4test/clientJSONBuilder.js");

describe('# Online Player Test',function(){

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
                connection.sendUTF(JSON.stringify(jsonBuilder.user_login_builder(null,"online_players client"+i)));
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

    it("## get online players",function(done){
        var zero = 0;
        var res_count = 0;
        Object.keys(workers).forEach(function(i){
            var opponent_index = (parseInt(i) < (worker_number-1))?parseInt(i)+1:0;
            var invitation_index = (parseInt(i) > 0)?parseInt(i)-1:worker_number-1;
            workers[i].connection.sendUTF(JSON.stringify(jsonBuilder.online_players_builder(workers[i].user)));
            workers[i].connection.on('message', function(message){
                var JSONmsg = JSON.parse(message.utf8Data);
                should.exists(JSONmsg);
                if(JSONmsg.msg_id == 6){
                    should.exists(JSONmsg.status);
                    JSONmsg.status.should.equal('ok');
                    should.exists(JSONmsg.opponents);
                    if(JSONmsg.opponents.length == 0){
                        zero++;
                        zero.should.below(2);
                    }else{
                        for(var j in JSONmsg.opponents){
                            JSONmsg.opponents[j].should.have.property('user_id')
                            JSONmsg.opponents[j].should.have.property('user_data');
                        }
                    }
                    res_count++;
                }
                if(res_count == worker_number){
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