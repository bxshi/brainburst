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

    it('## plain connection with correct protocol (connect, then close it)', function(done){
        var latency = 0;
        var disconn_count = 0;

        var parallel_function = function(){
            var worker = wsCreator(wsconf.host,wsconf.port,wsconf.protocol);
            worker.on('connect', function(connection){
                disconn_count++;
                var JSON2Send = JSON.stringify(jsonBuilder.user_login_builder(null, {'nickname':'stress_test'}));
                sendData(connection, JSON2Send);
                console.log(disconn_count);
                if(disconn_count==4096){
                    setTimeout(done, 360000);
                }
            });
        };

        var parallel_task = [];
        for(var i=0;i<4096;i++){
            parallel_task[i] = parallel_function;
        }

        async.parallel(parallel_task,null);

    });


});