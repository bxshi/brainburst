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
var sendData = require("../libs/common.js").sendData;
var messageHandler = require("../libs/ClientMessageHandler.js");
var getData = require("../libs/common.js").getData;


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
        var msgHandler1 = new messageHandler();
        var count=0;
        Object.keys(workers).forEach(function(i){
            if(!workers[i].done){
                var JSON2Send = JSON.stringify(jsonBuilder.user_login_builder(null,"new"+i));
                sendData(workers[i].connection, JSON2Send);
                workers[i].done = true;
            }
            workers[i].connection.on('message', function(message){
                getData(workers[i].connection, message.binaryData, msgHandler1);
            });

            msgHandler1.on('UserLogin', function(connection, message){
                should.exists(message);
                message.status.should.equal('ok');
                should.exists(message.user.user_data);
                var JSON2Send = JSON.stringify(jsonBuilder.change_profile_builder(message.user.user_id,'bee'+message.user.user_id));
                sendData(connection, JSON2Send);
            });

            msgHandler1.on('ChangeProfile', function(connection, message){
                should.exists(message);
                message.user.user_data.should.equal('bee'+message.user.user_id);
                count++;
                if(count==worker_number){
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