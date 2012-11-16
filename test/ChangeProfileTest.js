/**
 * Created with JetBrains WebStorm.
 * User: bxshi
 * Date: 12-11-16
 * Time: AM10:54
 * To change this template use File | Settings | File Templates.
 */
var should = require("should");
var wsconf = require("../libs4test/configuration.js").websocket;
var wsCreator = require("../libs4test/client.js");
var jsonBuilder = require("../libs4test/clientJSONBuilder.js");
var worker_number = require("../libs4test/configuration.js").worker_number;


describe('# Change Profile Test',function(){

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

    var test2 = "## login with a user_id";
    it(test2, function(done){
        var count=0;
        Object.keys(workers).forEach(function(i){
            if(!workers[i].done){
                workers[i].connection.sendUTF(JSON.stringify(jsonBuilder.user_login_builder(null,"new"+i)));
                workers[i].done = true;
            }
            workers[i].connection.on('message', function(message){
                var JSONmsg = JSON.parse(message.utf8Data);
                should.exists(JSONmsg);
                switch(JSONmsg.msg_id){
                    case 1:
                        JSONmsg.status.should.not.equal('error');
                        JSONmsg.user.user_data.should.equal('new'+i);
                        workers[i].connection.sendUTF(JSON.stringify(jsonBuilder.change_profile_builder(JSONmsg.user.user_id,'bee'+i)));
                        break;
                    case 11:
                        JSONmsg.status.should.not.equal('error');
                        JSONmsg.user.user_data.should.equal('bee'+i);
                        count++;
                        if(count==worker_number){
                            done();
                        }
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