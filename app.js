#!/usr/bin/env node
/**
 * Created with JetBrains WebStorm.
 * User: Carmack.Shi <baoxu.shi@gmail.com>
 * Date: 12-11-2
 * Time: 下午12:06
 * To change this template use File | Settings | File Templates.
 */

var cluster = require('cluster');
var CPU_NUM = require('os').cpus().length;

//multi-core task

if (cluster.isMaster) {//create multi-worker to handle websocket requests
    //fork worker
    for (var i = 0; i< CPU_NUM; i++) {
        cluster.fork();
    }

    cluster.on('exit', function(worker, code, signal){
        console.log('worker' + worker.process.pid + ' terminated');
    });
}else{//actual work flow
    var Conf = require('./configuration.js');
//PLEASE CHANGE THIS IF YOU WANT TO RUN UNDER DIFFERENT PRODUCTION ENVIRONMENT: development or deployment
    var conf = new Conf();

    var WebSocketServer = require('websocket').server;
    var http = require('http');

    var server = http.createServer(function(request, response){
        console.log((new Date())+" Received request for "+request.url);
        response.writeHead(404);
        response.end();
    });

    server.listen(conf.WebSocketPort, function(){
        console.log((new Date)+" Server started, listening on port "+conf.WebSocketPort);
    });

    wsServer = new WebSocketServer({
        httpServer  : server,

        //long-connection settings
        keepalive   :   true,
        keepaliveInterval   :   20000,
        dropConnectionOnKeepaliveTimeout    :   true,
        keepaliveGracePeriod    :   10000,

        autoAcceptConnections   :   false
    });

//Pool of connections

    var connections = {};
    var connectionIDCounter = 0;


    wsServer.on('request', function(request){

        //TODO could add `request.origin` 's check

        try{
            var connection = request.accept('brain_burst', request.origin);
        }catch(e){
            console.log((new Date)+" connection from "+request.remoteAddress+" reject, it does not have the supported protocol.");
            console.log((new Date)+" the protocol of request is "+request.requestedProtocols);
            var connection = request.reject('not supported');
            return;
        }

        //Maintain the pool
        connection.id = connectionIDCounter++;
        connections[connection.id] = connection;

        console.log((new Date)+" connection accepted by "+process.pid+". connection details are "+connection.remoteAddress);

        //output connection pool
        Object.keys(connections).forEach(function(key){
            console.log("online user : key:"+key+" value:"+connections[key]);
        });


        //route of connection
        connection.on('message', function(message){
            if(message.type == 'utf8') {
                console.log("Received string: "+message.utf8Data);
                connection.sendUTF(message.utf8Data);
            }else if (message.type == 'binary'){
                console.log('Received Binary Message, which currently not supported.');
                connection.send("{status:'error'}");
            }
        });
        connection.on('close', function(reasonCode, description){
            console.log((new Date)+" Peer "+connection.remoteAddress+' disconnected.');
        });
    });
}