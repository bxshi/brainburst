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

    var ce = require('cloneextend');
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
                        /*
                         * If user successfully logged in, redis's connection pool will contains user's uuid and its worker's pid.
                         */

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
                                    process.send({'type':"get_push",'receiver':[connection.id]});
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
                                process.send({'type':"get_push",'receiver':[connection.id]});
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
                                    //TODO: Maybe need add error handling?
                                    try{
                                        //the returned variable match is not a list but a single object
                                        if(match==undefined)
                                            throw "no waiting matches";
                                        //TODO: add check to exclude game created by user its own.
                                        console.dir(match);
                                        //if get a match with waiting status, join it
                                        var push_players = ce.clone(match['players']);
                                        match['players'][match['players'].length] = JSONmsg.user.user_id;
                                        if (match['players'].length == match['max_players']){//if there is enough people here
                                            match['status'] = 'pending';
                                        }
                                        console.log(match['players']);
                                        matchDAO.updateMatch(JSONmsg.game,match['match_id'],match, function(){
                                            //send json back to user
                                            connection.sendUTF(JSON.stringify(JSONBuilder.create_match_builder(JSONmsg.msg_id,'ok',null,match)));
                                            //DONE:send push to others
                                            //If you want send push to all players in this game, change receiver from `push_players` to `match['players']`
                                            process.send({'type':'new_push', 'receiver':push_players, 'json':JSONBuilder.join_match_push_builder(match)});
                                        });

                                    }catch(e){
                                        logger.warn(e);
                                        //no waiting match, create one
                                        var match_uuid = uuid.v4();
                                        matchDAO.createMatch(JSONmsg.game,{'match_id':match_uuid,'max_players':JSONmsg.max_players,'players':[JSONmsg.user.user_id],'status':'waiting','match_data':JSONmsg.match_data},
                                            function(match){//successfully created
                                                //the returned variable match is a list, so need to change it to the first object
                                                match = match[match.length-1];
                                                logger.info(JSONmsg.game+" match created, uuid is "+match_uuid+" created by "+JSONmsg.user.user_id+", status is waiting");
                                                //send json back to client
                                                connection.sendUTF(JSON.stringify(JSONBuilder.create_match_builder(JSONmsg.msg_id,'ok',null,match)));
                                            });
                                    }
                                });
                        }else if(JSONmsg.create_method == 'player'){

                            //firstly, create a match
                            var match_uuid = uuid.v4();
                            //TODO: validate user_ids
                            logger.error("before"+JSONmsg.opponent_user_id);
                            var all_players =  ce.clone(JSONmsg.opponent_user_id);
                            all_players.push(JSONmsg.user.user_id);
                            logger.error("after"+JSONmsg.opponent_user_id);
                            //DONE: How to figure out whether the match is full or still waiting
                            //check if your invitation is already meets the max players, set match status to pending, otherwise set it to waiting .
                            var match_status = 'waiting';
                            if (all_players.length == JSONmsg.max_players) {
                                match_status = 'pending';
                            }
                            matchDAO.createMatch(JSONmsg.game,{'match_id':match_uuid,'max_players':JSONmsg.max_players,'players':all_players,'status':match_status,'match_data':JSONmsg.match_data},
                                function(match){//successfully created
                                    //the returned variable match is a list, so need to change it to the first object
                                    match = match[match.length-1];
                                    logger.info(JSONmsg.game+" match created, uuid is "+match_uuid+" created by "+JSONmsg.user.user_id+", status is waiting");
                                    //send json back to client
                                    connection.sendUTF(JSON.stringify(JSONBuilder.create_match_builder(JSONmsg.msg_id,'ok',null,match)));

                                    //DONE: add create_match's push notifications
                                    //**This only pushes to players who were invited (exclude the one who create this match)**
                                    //if you want to include the creator, change receiver from `JSONmsg.opponent_user_id` to `all_players`
                                    logger.warn("push_receiver"+JSONmsg.opponent_user_id);
                                    process.send({'type':'new_push', 'receiver':JSONmsg.opponent_user_id, 'json':JSONBuilder.create_match_push_builder(match)});

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
                connection.send('{"status":"error","msg":"DO NOT TRYING TO FUCK ME UP!"}');
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
            //There we use a loop, but there some callback functions, will that cause conflict about message.receiver[i]?
            for(var id in message.receiver){
                if(connections[message.receiver[id]]!=undefined) {
                    //what if the connection is dropped just after this ?
                    try{
                        connections[message.receiver[id]].sendUTF(JSON.stringify(message.json), function(err){
                            if(err){
                                logger.error("push send status"+err);
                            }else{
                                logger.error("push send to "+message.receiver[id]+" ok");
                            }
                        });
                    }catch(e){
                        logger.warn(e);
                        logger.warn("the user_id "+message.receiver[id]+" of this push is not online!");
                        //push failed, put it back.
                        process.send({'type':"restore_push", 'receiver':[message.receiver[id]], 'json':message.json});
                    }
                }else{
                    logger.warn("the user_id "+message.receiver[id]+" of this push is not online!");
                    //push failed, put it back.
                    process.send({'type':"restore_push", 'receiver':[message.receiver[id]], 'json':message.json});
                }
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
        var worker = cluster.fork();
        workers[worker.process.pid] = worker;
    }
        /* Push Logic:
         * 1. If a push request got by this process, it will check online pool, if it is online, send it to corresponding process.
         * 2. If a push request's sending failed, save it to redisDB.
         * 3. If a online message got by this process, it will check redisDB and try sending all pushes that belongs to him.
         */

    //push DB handler (message.data is a JSON string which could directly send to client)
    Object.keys(cluster.workers).forEach(function(id) {
        cluster.workers[id].on('message', function(message){
            if(message.type!=undefined && message.receiver!=undefined){
                switch(message.type){
                    case 'new_push':
                        logger.warn(JSON.stringify(message));
                        logger.warn(message.receiver);
                        for (var i in message.receiver){
                            logger.warn(message.receiver[i]);
                            //find out which worker is handling this connection
                            redisConnectionPoolClient.getConnection(message.receiver[i], function(user_id,pid){
                                logger.error("get "+user_id+"'s worker: "+pid);
                                if(pid == null){//already disconnected
                                    //TODO: add restore push
                                    logger.error("send error, user_id:"+user_id+" restore push:"+JSON.stringify(message.json));
                                    queue.pushToFront(user_id,JSON.stringify(message.json), function(err,reply){
                                        if(err){
                                            logger.error("restore push save error, "+err);
                                        }else{
                                            logger.info("restore push saved, "+reply);
                                        }
                                    });
                                }else{
                                    workers[pid].send({'type':"send_push", 'receiver':[user_id], 'json':message.json});
                                }
                            });
                        }
                        break;
                    case 'get_push':
                        logger.error("get_push");
                        //TODO: does this foreach function series or async? If not series, it will cause push order problems.
                        for (var i in message.receiver){
                            logger.error("get_push uuid:"+message.receiver[i]);
                            queue.each(message.receiver[i],function(json){
                                logger.error("get_push data:"+json);
                                cluster.workers[id].send({type:"send_push",'receiver':[message.receiver[i]],'json':JSON.parse(json)});
                            });
                        }
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
                        if(message.json!=undefined){
                            queue.pushToFront(message.receiver[0],message.json, function(err,reply){
                                if(err){
                                    logger.error("restore push save error, "+err);
                                }
                                if(reply){
                                    logger.info("restore push saved, "+reply);
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
    });

    cluster.on('exit', function (worker, code, signal) {
        logger.error('worker ' + worker.process.pid + ' terminated');
    });


}