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
var sendData = require("../libs/common.js").sendData;
var messageHandler = require("../libs/ClientMessageHandler.js");
var getData = require("../libs/common.js").getData;


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
        var msgHandler1 = new messageHandler();
        var JSON2Send = JSON.stringify(jsonBuilder.user_login_builder(null,test1));
        sendData(workers[0].connection, JSON2Send);
        workers[0].connection.on('message', function(message){
            getData(workers[0].connection, message.binaryData, msgHandler1);
        });

        msgHandler1.on('UserLogin', function(connection, message){
            should.exists(message);
            message.status.should.equal('ok');
            should.exists(message.user);
            message.user.user_data.should.equal(test1);
            should.exists(message.user.user_id);
            test1_user_id = message.user.user_id;
            done();
        });

    });

    var test2 = "## login with a user_id";
    it(test2, function(done){
        var msgHandler2 = new messageHandler();
        var JSON2Send = JSON.stringify(jsonBuilder.user_login_builder(test1_user_id,null));
        sendData(workers[1].connection, JSON2Send);
        workers[1].connection.on('message', function(message){
            getData(workers[1].connection, message.binaryData, msgHandler2);
        });

        msgHandler2.on('UserLogin', function(connection, message){
            message.status.should.equal('ok');
            should.exists(message.user);
            message.user.user_data.should.equal(test1);
            should.exists(message.user.user_id);
            message.user.user_id.should.equal(test1_user_id);
            done();
        });
    });

    var test3 = "## login with an invalid user_id";
    it(test3, function(done){
        var msgHandler3 = new messageHandler();
        var JSON2Send = JSON.stringify(jsonBuilder.user_login_builder("fake uuid",null));
        sendData(workers[2].connection, JSON2Send);
        workers[2].connection.on('message', function(message){
            getData(workers[2].connection, message.binaryData, msgHandler3);
        });

        msgHandler3.on('NoType', function(connection, message){
           message.status.should.equal('error');
           should.exists(message.msg);
           done();
        });
    });

    it("## login with valid user_id, then change it to other user's user_id",function(done){
        var msgHandler4 = new messageHandler();
        var count=0;
        Object.keys(workers).forEach(function(i) {
            var JSON2Send = JSON.stringify(jsonBuilder.user_login_builder(null,"login client"+i));
            sendData(workers[i].connection, JSON2Send);
            workers[i].connection.on('message', function(message){
                getData(workers[i].connection, message.binaryData, msgHandler4);
            });
        });
        msgHandler4.on('UserLogin', function(connection, message){
            message.status.should.equal('ok');
            should.exists(message.user);
            should.exists(message.user.user_id);
            should.exists(message.user.user_data);
            count++;
            if(count == worker_number){
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