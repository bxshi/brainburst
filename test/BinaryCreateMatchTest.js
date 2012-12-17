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
var worker_number = require("../libs4test/configuration.js").worker_number;
var sendData = require("../libs/common.js").sendData;
var messageHandler = require("../libs/ClientMessageHandler.js");
var getData = require("../libs/common.js").getData;

describe('# Create Match Test',function(){

    var workers=[];

    //create connections and login
    beforeEach(function(done){
        var count=0;
        for (var i=0;i<worker_number;i++){
            workers[i] = {};
            workers[i].client = wsCreator(wsconf.host,wsconf.port,wsconf.protocol);
            workers[i].opponent_index = (parseInt(i) < (worker_number-1))?parseInt(i)+1:0;
            workers[i].invitation_index = (parseInt(i) > 0)?parseInt(i)-1:worker_number-1;
        }
        var msgHandler1 = new messageHandler();
        Object.keys(workers).forEach(function(i) {
            workers[i].client.on('connect',function(connection){
                workers[i].connection = connection;
                if(count<worker_number){
                    count++;
                }
                if(count==worker_number){
                    done();
                }
            });
        });

    });

    var test1 = "## create match by `auto` method";
    it(test1, function(done){
        var msgHandler2 = new messageHandler();
        var creator = 0;
        var joiner = 0;
        Object.keys(workers).forEach(function(i){
            var JSON2Send = JSON.stringify(jsonBuilder.user_login_builder(null,"create_match client"+i));
            sendData(workers[i].connection, JSON2Send);
            workers[i].connection.on("message", function(message){
                getData(workers[i].connection, message.binaryData, msgHandler2);
            });
        });

        msgHandler2.on('UserLogin', function(connection, message){
            message.status.should.not.equal('error');
            should.exists(message.user);
            should.exists(message.user.user_id);
            should.exists(message.user.user_data);
            for(var i=0; i < workers.length; i++){
                if(workers[i].connection == connection){
                    workers[i].user = message.user;
                    break;
                }
            }
            var JSON2Send = JSON.stringify(jsonBuilder.create_match_builder('auto',message.user,{'match_data':"worker"+i}));
            sendData(connection, JSON2Send);
        });

        msgHandler2.on('JoinMatch', function(connection, message){
            message.match.players.length.should.above(1);
            message.match.players[0].should.have.property('user_id');
            message.match.players[0].should.have.property('user_data');
        });

        msgHandler2.on('BotMatch', function(connection, message){
            should.exists(message.status);
            message.status.should.equal('ok');
            should.exists(message.match.match_data);
            message.match.match_data.should.match(/worker[0-9]/gi);
            creator++;
            if(creator+joiner == worker_number){
                done();
            }
        });

        msgHandler2.on('PushResponse', function(connection, message){
            should.exists(message.push_id);
            var JSON2Send = JSON.stringify(jsonBuilder.push_response_builder(message.push_id));
            sendData(connection, JSON2Send);
            console.log("send push response");
        });

    });

    var test2 = "## create match by `player` method";
    it(test2, function(done){
        var msgHandler3 = new messageHandler();
        var pusher = 0;
        var creator = 0;
        Object.keys(workers).forEach(function(i){
            var JSON2Send = JSON.stringify(jsonBuilder.user_login_builder(null,"create_match client"+i));
            sendData(workers[i].connection, JSON2Send);
            workers[i].connection.on("message", function(message){
                getData(workers[i].connection, message.binaryData, msgHandler3);
            });
        });

        msgHandler3.on('UserLogin', function(connection, message){
            for(var i =0; i< workers.length; i++){
                if(connection == workers[i].connection){
                    if(workers[workers[i].opponent_index].user){
                        var JSON2Send = JSON.stringify(jsonBuilder.create_match_builder('player',message.user,{'match_data':"worker"+i},[workers[workers[i].opponent_index].user.user_id]));
                        sendData(workers[i].connection, JSON2Send);
                    }else{
                        creator++;
                        pusher++;
                    }
                    if(creator == worker_number && pusher == worker_number){
                        done();
                    }
                    break;
                }
            }
        });

        msgHandler3.on('InvitedMatch', function(connection, message){
            should.exists(message.type);
            message.type.should.equal("invited_match");
            message.match.players[0].should.have.property('user_id');
            message.match.players[0].should.have.property('user_data');
            for(var i=0; i>workers.length;i++){
                if(workers[i].user.user_id == message.match.players[1].user.user_id){
                    message.match.match_data.should.equal("worker"+workers[i].invitation_index);
                    message.match.players[0].user_id.should.equal(workers[workers[i].invitation_index].user.user_id);
                    break;
                }
            }
            pusher++;
            console.log("creator "+creator+" pusher "+pusher);
            if(creator == worker_number && pusher == worker_number){
                done();
            }
        });

        msgHandler3.on('CreateMatch', function(connection, message){
            should.exists(message.status);
            message.status.should.equal('ok');
            should.exists(message.match.match_data);
            message.match.players[0].should.have.property('user_id');
            message.match.players[0].should.have.property('user_data');
            creator++;
            console.log("creator "+creator+" pusher "+pusher);
            if(creator == worker_number && pusher == worker_number){
                done();
            }
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