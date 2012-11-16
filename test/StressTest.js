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
        var disconn_count = 0;

        var parallel_function = function(){
            var worker = wsCreator(wsconf.host,wsconf.port);
            worker.on('connectFailed', function(){
                disconn_count++;
                if(disconn_count == concurrency_number){
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
        var disconn_count = 0;

        var parallel_function = function(){
            var worker = wsCreator(wsconf.host,wsconf.port,wsconf.protocol);
            worker.on('connect', function(connection){
                connection.close();
                disconn_count++;
                if(disconn_count==concurrency_number){
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