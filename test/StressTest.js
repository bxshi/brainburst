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

describe('# Stress Test',function(){


    it('## plain connection without correct protocol', function(done){
        var latency = 0;

        var disconn_count = 0;

        var parallel_function = function(){
            var tmpLatency = Date.now();
            var worker = wsCreator(wsconf.host,wsconf.port);
            worker.on('connectFailed', function(){
                tmpLatency = Date.now() - tmpLatency;
                disconn_count++;
                latency +=tmpLatency;
                if(disconn_count == concurrency_number){
                    latency = (latency / 2) / disconn_count;
                    console.log("!!!!!"+latency);
                    done();
                }
            });
        };
        var parallel_task = [];
        for(var i=0;i<concurrency_number;i++){
            parallel_task[i] = parallel_function;
        }

        async.parallel(parallel_task,null);

    });

    it('## plain connection with correct protocol (connect, then close it)', function(done){
        var latency = 0;
        var disconn_count = 0;

        var parallel_function = function(){
            var tmpLatency = Date.now();
            var worker = wsCreator(wsconf.host,wsconf.port,wsconf.protocol);
            worker.on('connect', function(connection){
                connection.close();
                tmpLatency = Date.now() - tmpLatency;
                latency +=tmpLatency;
                disconn_count++;
//                console.log(disconn_count);
                if(disconn_count==concurrency_number){
                    latency = latency/2/disconn_count;
                    console.log("!!!!!"+latency);
                    done();
                }
            });
        };

        var parallel_task = [];
        for(var i=0;i<concurrency_number;i++){
            parallel_task[i] = parallel_function;
        }

        async.parallel(parallel_task,null);

    });

    it('## parallel connect to server, register then logout.');

    it('## parallel connect to server, create 10 matches, then logout.');

});