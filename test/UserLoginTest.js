/**
 * Created with JetBrains WebStorm.
 * User: bxshi
 * Date: 12-11-13
 * Time: PM1:25
 * To change this template use File | Settings | File Templates.
 */

var should = require("should");
var wsconf = require("../libs4test/configuration.js").websocket;
var wsCreator = require("../libs4test/client.js");
var jsonBuilder = require("../libs4test/clientJSONBuilder.js");
var worker_number = require("../libs4test/configuration.js").worker_number;


describe('# User Login Test',function(){

    var workers=[];

    //create connections
    beforeEach(function(done){
        var count=0;
        for (var i=0;i<worker_number;i++){
            workers[i] = {};
            workers[i].client = wsCreator(wsconf.host,wsconf.port,wsconf.protocol);
        }
        Object.keys(workers).forEach(function(i) {
            workers[i].client.on('connect',function(connection){
                if(count<worker_number){
                    count++;
                    workers[i].connection = connection;
                }
                if(count==worker_number){
                    done();
                }
            });
        });
    });
    var test1 = "## login without user_id";
    var test1_user_id;
    it(test1, function(done){
        workers[0].connection.sendUTF(JSON.stringify(jsonBuilder.user_login_builder(null,test1)));
        workers[0].connection.on('message', function(message){
            var JSONmsg = JSON.parse(message.utf8Data);
            should.exists(JSONmsg);
            switch(JSONmsg.msg_id){
                case 1:
                    JSONmsg.status.should.not.equal('error');
                    should.exists(JSONmsg.user);
                    JSONmsg.user.user_data.should.equal(test1);
                    should.exists(JSONmsg.user.user_id);
                    test1_user_id = JSONmsg.user.user_id;
                    done();
                    break;
            }
        });
    });

    var test2 = "## login with a user_id";
    it(test2, function(done){
        workers[1].connection.sendUTF(JSON.stringify(jsonBuilder.user_login_builder(test1_user_id,null)));
        workers[1].connection.on('message', function(message){
            var JSONmsg = JSON.parse(message.utf8Data);
            should.exists(JSONmsg);
            switch(JSONmsg.msg_id){
                case 1:
                    JSONmsg.status.should.not.equal('error');
                    should.exists(JSONmsg.user);
                    JSONmsg.user.user_data.should.equal(test1);
                    should.exists(JSONmsg.user.user_id);
                    JSONmsg.user.user_id.should.equal(test1_user_id);
                    done();
                    break;
            }
        });
    });

    var test3 = "## login with an invalid user_id";
    it(test3, function(done){
        workers[2].connection.sendUTF(JSON.stringify(jsonBuilder.user_login_builder("fake uuid",null)));
        workers[2].connection.on('message', function(message){
            var JSONmsg = JSON.parse(message.utf8Data);
            should.exists(JSONmsg);
            switch(JSONmsg.msg_id){
                case 1:
                    JSONmsg.status.should.not.equal('ok');
                    should.exists(JSONmsg.msg);
                    done();
            }
        });
    });

    it("## login with valid user_id, then change it to other user's user_id",function(done){
        var count=0;
        Object.keys(workers).forEach(function(i) {
            workers[i].connection.sendUTF(JSON.stringify(jsonBuilder.user_login_builder(null,"login client"+i)));
            workers[i].connection.on('message', function(message){
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
                        }
                        if(count==worker_number){
                            workers[0].connection.sendUTF(JSON.stringify(jsonBuilder.get_matches_builder(workers[1].user,'123')));
                        }
                        break;
                    case 5:
                        should.exists(JSONmsg.status);
                        JSONmsg.status.should.equal('error');
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