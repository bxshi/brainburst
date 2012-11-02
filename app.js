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