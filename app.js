#!/usr/bin/env node
/**
 * Created with JetBrains WebStorm.
 * User: Carmack.Shi <baoxu.shi@gmail.com>
 * Date: 12-11-2
 * Time: 下午12:06
 * Main logic of this app.
 */

var cluster = require('cluster');
var CPU_NUM = require('os').cpus().length;
var logger = require('./libs/logger.js');


//multi-core task

if (!cluster.isMaster) {//actual work flow

    var uuid = require("node-uuid");
    var async = require('async');

    var connection_pool = require('./libs/redis_connection_pool.js');

    var Conf = require('./configuration.js');
    var conf = new Conf();

    var player = require('./libs/PlayerDAO.js');
    var mongo = require('./libs/MongoDBConnection.js');
    var mongoClient = new mongo.MongoDBConnection(conf.mongo);

    var match = require('./libs/MatchDAO.js');

    var JSONValidation = require('./libs/JSONValidation.js');
    var JSONBuilder = require('./libs/JSONBuilder.js');

    var WebSocketServer = require('websocket').server;
    var http = require('http');

    var server = http.createServer(function (request, response) {
        logger.warn("Received http request for " + request.url + " that maybe a attack?");
        response.writeHead(404);
        response.end();
    });

    server.listen(conf.WebSocketPort, function () {
        logger.info('Server started, listening on port' + conf.WebSocketPort);
    });

    wsServer = new WebSocketServer({
        httpServer:server,

        //long-connection settings
        keepalive:true,
        keepaliveInterval:20000,
        dropConnectionOnKeepaliveTimeout:true,
        keepaliveGracePeriod:10000,

        autoAcceptConnections:false
    });

    //Pool of connections [for each process]

    var connections = {};

    wsServer.on('request', function (request) {

        try {
            var connection = request.accept('brain_burst', request.origin);
        } catch (e) {
            logger.warn("connection from " + request.remoteAddress + " is rejected, it does not holding the supported protocol.");
            var connection = request.reject('not supported');
            return;
        }

        //route of connection
        connection.on('message', function (message) {
            if (message.type == 'utf8') {

                logger.info("Received data: " + message.utf8Data);

                //JSON validation
                try {
                    var JSONmsg = JSON.parse(message.utf8Data);

                } catch (e) {
                    logger.error('Client\'s request is not a valid JSON string');
                    connection.close();
                }

                //JSON message validation
                if (!JSONValidation.json_validation(JSONmsg)){
                    connection.sendUTF('{"status":"error","msg":"request json does not contains a msg_id or type."}');
                    logger.error("get a request without a msg_id or type");
                    connection.close();//is that ok?
                    return;
                }

                //router

                //TODO: all objects returned by mongo should be output by console.dir function.
                //TODO: change json based log to connection.sendUTF()'s callback
                switch (JSONmsg.type) {
                    case 'user_login':

                        if(!JSONValidation.user_login(JSONmsg)){
                            logger.warn("JSONmsg illegal, json:"+JSON.stringify(JSONmsg));
                            //TODO: change error message to a list, and get error from it
                            connection.sendUTF('{"msg_id":'+JSONmsg.msg_id+',"status":"error","msg":"user_login message illegal."}');
                            return;
                        }

                        if (JSONmsg.user.user_id!=undefined) {//login
                            // user validation (mongoDB)
                            var playerDAO = new player.PlayerDAO(mongoClient);
                            logger.info("user_id is " + JSONmsg.user.user_id);
                            playerDAO.getPlayerById(JSONmsg.user.user_id, function (doc) {
                                if (doc) {// it is a true user
                                    logger.info("mongoDB getPlayer " + JSON.stringify(doc));
                                    connection_pool.setConnection(JSONmsg.user.user_id, process.pid);
                                    connection.id = JSONmsg.user.user_id;
                                    connections[connection.id] = connection;
                                    connection.sendUTF('{"msg_id":' + JSONmsg.msg_id + ',"status":"ok","user":{"user_id":"' + connection.id + '","data":"'+doc.data+'"}}');
                                    logger.info("connection accepted, worker pid is " + process.pid + ". uuid is " + connection.id);
                                    //acknowledge master there is a new login(then master will try send push notifications)
//                                    process.send({type:"save_push", user_id:JSONmsg.msg_id, data:"{\"status\":\"ok\"}"});
                                    process.send({type:"get_push",user_id:JSONmsg.msg_id});
                                } else {// user not exists
                                    connection.sendUTF('{"msg_id":' + JSONmsg.msg_id + ',"status":"error","msg":"user not exists"}');
                                    logger.warn("get a non-exist user uuid");
                                }
                            });
                        }else{//register
                            var connection_uuid = uuid.v4();
                            connection.id = connection_uuid;
                            connection_pool.setConnection(connection_uuid, process.pid);
                            var playerDAO = new player.PlayerDAO(mongoClient);
                            //TODO: add other data fields
                            playerDAO.createPlayer({user_id:connection.id, data:JSONmsg.user.data}, function () {
                                logger.info("create user, user_id is " + connection.id);
                                connections[connection.id] = connection;
                                connection.sendUTF('{"msg_id":' + JSONmsg.msg_id + ',"status":"ok","user":{"user_id":"' + connection.id + '","data":"'+JSONmsg.user.data+'"}}');
                                logger.info("connection accepted, worker pid is " + process.pid + ". uuid is " + connection.id);
                                //acknowledge master there is a new login(then master will try send push notifications)
                                process.send({type:"get_push",user_id:connection.id});
                            });
                        }
                        break;

                    //TODO: Add login validation(uuid in pool)

                    case 'create_match':
                        logger.info("create_match");
                        if(!JSONValidation.create_match(JSONmsg)){
                            logger.warn("JSONmsg illegal, json:"+JSON.stringify(JSONmsg));
                            //TODO: change error message to a list, and get error from it
                            connection.sendUTF('{"msg_id":'+JSONmsg.msg_id+',"status":"error","msg":"create_match message illegal."}');
                            return;
                        }
                        //TODO: Add user login validation (this must be done before publish)
                        var matchDAO = new match.MatchDAO(mongoClient);
                        if(JSONmsg.create_method == 'auto'){
                                //search for existing waiting match
                                matchDAO.pickOneWaitingMatch(JSONmsg.game, function(match){
                                    try{
                                        //the returned variable match is not a list but a single object
                                        if(match==undefined)
                                            throw "no waiting matches";
                                        //TODO: add check to exclude game created by user its own.
                                        console.dir(match);
                                        //if get a match with waiting status, join it
                                        match['players'][match['players'].length] = JSONmsg.user.user_id;
                                        match['status'] = 'pending';
                                        console.log(match['players']);
                                        matchDAO.updateMatch(JSONmsg.game,match['match_id'],match, function(){
                                            //send json back to user
                                            connection.sendUTF(JSONBuilder.create_match_builder(JSONmsg.msg_id,'ok',null,match));
                                        });

                                    }catch(e){
                                        logger.warn(e);
                                        //no waiting match, create one
                                        var match_uuid = uuid.v4();
                                        matchDAO.createMatch(JSONmsg.game,{'match_id':match_uuid,'players':[JSONmsg.user.user_id],'status':'waiting','match_data':JSONmsg.match_data},
                                            function(match){//successfully created
                                                //the returned variable match is a list, so need to change it to the first object
                                                match = match[match.length-1];
                                                logger.info(JSONmsg.game+" match created, uuid is "+match_uuid+" created by "+JSONmsg.user.user_id+", status is waiting");
//                                                console.dir(match);
                                                //send json back to client
                                                connection.sendUTF(JSONBuilder.create_match_builder(JSONmsg.msg_id,'ok',null,match));
                                            });
                                    }
                                });
                        }else if(JSONmsg.create_method == 'player'){

                            //firstly, create a match
                            var match_uuid = uuid.v4();
                            JSONmsg.opponent_user_id.push(JSONmsg.user.user_id);
                            //TODO: How to figure out whether the match is full or still waiting
                            //Currently, if you invite people to play, we treat such match is already full for default.
                            matchDAO.createMatch(JSONmsg.game,{'match_id':match_uuid,'players':JSONmsg.opponent_user_id,'status':'ok'},
                            function(match){
                                logger.info("Create Match result is "+match.stringify());
                            });
                        }
                        break;
                    case 'remove_match':
                        logger.info("remove_match");
                        connection.sendUTF('{"status":"ok"}');
                        break;
                    case 'submit_match':
                        logger.info("submit_match");
                        connection.sendUTF('{"status":"ok"}');
                        break;
                    case 'get_matches':
                        logger.info("get_matches");
                        connection.sendUTF('{"status":"ok"}');
                        break;
                    case 'online_players' :
                        logger.info("online_players");
                        connection.sendUTF('{"status":"ok"}');
                        break;
                }

            } else if (message.type == 'binary') {
                logger.warn('Get binary data, maybe an attack?');
                connection.send('{"status":"error"}');
            }
        });
        connection.on('close', function (reasonCode, description) {
            connection_pool.delConnection(connection.id, function () {
                delete connections[connection.id];
                logger.info("Peer " + connection.id + " disconnected");
            });
        });
    });

    process.on('message', function(message){
        if(message.type=='send_push') {
            if(message.user_id!=undefined && connections[message.user_id]!=undefined) {
                //what if the connection is dropped just after this ?
                try{
                    connections[message.user_id].sendUTF(message.data);
                }catch(e){
                    logger.warn("the user_id "+message.user_id+" of this push is not online!");
                    //push failed, put it back.
                    process.send({type:"restore_push", user_id:message.user_id, data:message.data});
                }
            }else{
                logger.warn("the user_id "+message.user_id+" of this push is not online!");
                //push failed, put it back.
                process.send({type:"restore_push", user_id:message.user_id, data:message.data});
            }
        }
    });

} else {//create multi-worker to handle websocket requests

    var Conf = require('./configuration.js');
    var conf = new Conf();
    //clear redis-connection-pool's data
    var redisConnectionPoolClient = require('./libs/redis_connection_pool.js');
    redisConnectionPoolClient.flush();
    logger.info("Redis connection pool flushed");

    var PushQueue = require('./libs/PushQueue.js').PushQueue;
    var redisPush = require('./libs/RedisConnection.js').RedisConnection;
    var redisPushClient = new redisPush(conf.redis);
    var queue = new PushQueue(redisPushClient);
    var workers={};
    //fork worker
    for (var i = 0; i < CPU_NUM; i++) {
        workers[i] = cluster.fork();

        //push DB handler (message.data is a JSON string which could directly send to client)
        workers[i].on('message', function(message){
            if(message.type!=undefined && message.user_id!=undefined){
                switch(message.type){
                    case 'get_push':
                        //TODO: does this foreach function series or async? If not series, it will cause push order problems.
                        queue.each(message.user_id,function(data){
                            workers[i].send({type:"send_push",user_id:message.user_id,data:data})
                        });
                        break;
                    case 'save_push'://new push
                        if(message.data!=undefined){
                            logger.info("save_push, JSON: "+JSON.stringify(message));
                            queue.pushToEnd(message.user_id,message.data, function(err,reply){
                                if(err){
                                    logger.error("push save error, "+err);
                                }
                                if(reply){
                                    logger.info("push saved, "+reply);
                                }
                            });
                        }else{
                            logger.warn("push data is empty");
                        }
                        break;
                    case 'restore_push'://push that failed
                        if(message.data!=undefined){
                            queue.pushToFront(message.user_id,message.data, function(err,reply){
                                if(err){
                                    logger.error("restore push save error, "+err);
                                }
                                if(reply){
                                    logger.info("restore push saved, "+err);
                                }
                            });
                        }else{
                            logger.error("push data is empty");
                        }
                        break;
                    default:
                        logger.warn("unsupported cluster message");
                        break;
                }
            }else{
                logger.warn("illegal cluster message, "+JSON.stringify(message));
            }

        });
    }

    cluster.on('exit', function (worker, code, signal) {
        logger.error('worker ' + worker.process.pid + ' terminated');
    });


}