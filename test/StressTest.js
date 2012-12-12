/**
 * Created with JetBrains WebStorm.
 * User: bxshi
 * Date: 12-11-16
 * Time: PM3:36
 * To change this template use File | Settings | File Templates.
 */
var should = require("should");
var wsconf = require("../libs4test/configuration.js").websocket;
var wsCreator = require("../libs4test/client.js");
var jsonBuilder = require("../libs4test/clientJSONBuilder.js");
var concurrency_number = require("../libs4test/configuration.js").concurrency_number;
var async = require("async");

var sendData = require("../libs/common.js").sendData;
var messageHandler = require("../libs/ClientMessageHandler.js");
var getData = require("../libs/common.js").getData;

var ce = require("cloneextend");

describe('# Stress Test',function(){


//    it('## plain connection without correct protocol', function(done){
//        var latency = 0;
//
//        var disconn_count = 0;
//
//        var parallel_function = function(){
//            var tmpLatency = Date.now();
//            var worker = wsCreator(wsconf.host,wsconf.port);
//            worker.on('connectFailed', function(){
////                tmpLatency = Date.now() - tmpLatency;
//                disconn_count++;
//                console.log(disconn_count);
////                latency +=tmpLatency;
//                if(disconn_count == concurrency_number){
////                    latency = (latency / 2) / disconn_count;
////                    console.log("!!!!!"+latency);
//                    done();
//                }
//            });
//        };
//        var parallel_task = [];
//        for(var i=0;i<concurrency_number;i++){
//            parallel_task[i] = parallel_function;
//        }
//
//        async.parallel(parallel_task,null);
//
//    });

//    it('## plain connection with correct protocol (connect, then close it)', function(done){
//        var latency = 0;
//        var disconn_count = 0;
//
//        var parallel_function = function(){
//            var tmpLatency = Date.now();
//            var worker = wsCreator(wsconf.host,wsconf.port,wsconf.protocol);
//            worker.on('connect', function(connection){
//                connection.close();
////                tmpLatency = Date.now() - tmpLatency;
////                latency +=tmpLatency;
//                disconn_count++;
////                console.log(disconn_count);
//                console.log(disconn_count);
//                if(disconn_count==concurrency_number){
////                    latency = latency/2/disconn_count;
////                    console.log("!!!!!"+latency);
//                    done();
//                }
//            });
//        };
//
//        var parallel_task = [];
//        for(var i=0;i<concurrency_number;i++){
//            console.log("create "+i);
//            parallel_task[i] = parallel_function;
//        }
//
//        async.parallel(parallel_task,null);
//
//    });

    it('## connection, then create two matches, submit each match for 1 seconds.', function(done){
        var count = 0;
        var parallel_function = function(){
            var user;
            var msgHandler = new messageHandler();
            var worker = wsCreator(wsconf.host, wsconf.port, wsconf.protocol);
            worker.on('connect', function(connection){
                var JSON2Send = JSON.stringify(jsonBuilder.user_login_builder(null, {'nickname':'stress_test'}));
                sendData(connection, JSON2Send);
                connection.on('message', function(message){
                    var data = message.binaryData;
                    getData(connection, data, msgHandler);
                    message=null;
                });
            });
            msgHandler.on('UserLogin', function(connection, message){
                user = ce.clone(message.user);
                var JSON2Send = JSON.stringify(jsonBuilder.create_match_builder('auto',message.user,{'match_data':"stressTest"}));
                sendData(connection, JSON2Send);
                message = null;
            });
            msgHandler.on('BotMatch', function(connection, message){
                var JSON2Send = JSON.stringify(jsonBuilder.submit_match_builder(user, message.match));
                console.log(JSON2Send);
                setTimeout(sendData, Math.round(Math.random()*10000000)%900000, connection, JSON2Send);
                count++;
                if(count >= concurrency_number * 100){
                    done();
                }

                message = null;

            });
            msgHandler.on('UpdateMatch', function(connection, message){
                var JSON2Send = JSON.stringify(jsonBuilder.submit_match_builder(user, message.match));
                console.log(JSON2Send);
                setTimeout(sendData, Math.round(Math.random()*10000000)%900000, connection, JSON2Send);
                count++;
                if(count >= concurrency_number * 100){
                    done();
                }

                message = null;

            });
            msgHandler.on('PushResponse', function(connection, message){
                var JSON2Send = JSON.stringify(jsonBuilder.push_response_builder(message.push_id));
                sendData(connection, JSON2Send);
                message = null;

            });
        }

        var parallel_task = [];
        for(var i=0;i<concurrency_number;i++){
            parallel_task[i] = parallel_function;
        }

        async.parallel(parallel_task,null);

    });

    it('## parallel connect to server, register then logout.');

    it('## parallel connect to server, create 10 matches, then logout.');

});