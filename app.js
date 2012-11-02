#!/usr/bin/env node
/**
 * Created with JetBrains WebStorm.
 * User: Carmack.Shi <baoxu.shi@gmail.com>
 * Date: 12-11-2
 * Time: 下午12:06
 * To change this template use File | Settings | File Templates.
 */


var WebSocketServer =   require('websocket').server;
var http    =   require('http');

var server = http.createServer(function(request, response){
    console.log((new Date())+" Received request for "+request.url);
    response.writeHead(404);
    response.end();
});

server.listen(9876, function(){
   console.log((new Date)+" Server started, listening on port "+9876);
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
   console.log((new Date)+" connection accepted. connection details are "+connection.remoteAddress);

   //route of connection
   connection.on('message', function(message){
       if(message.type == 'utf-8' && message.isValidUTF8()) {
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