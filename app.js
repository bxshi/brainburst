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

// Configurations
var Conf = require('./configuration.js');
var conf = new Conf();

//workers -- handling websocket connections
if (!cluster.isMaster) {//actual work flow

    // 3rd-party packages
    var uuidGenerator = require("./libs/uuidGenerator.js");
    var ce = require('cloneextend');
    var WebSocketServer = require('websocket').server;
    var http = require('http');
    var https = require('https');
    var fs = require('fs');
    var zlib = require('zlib');

    // Self-defined libs
    var connection_pool = require('./libs/RedisConnectionPool.js');
    connection_pool.selectDB();
    var mongo = require('./libs/MongoDBConnection.js');
    var mongoClient = new mongo.MongoDBConnection(conf.mongo);
    var JSONBuilder = require('./libs/JSONBuilder.js');
    var messageHandler = require('./libs/MessageHandler.js');
    var msgHandler = new messageHandler();
    var sendData = require('./libs/common.js').sendData;
    var player = require('./libs/PlayerDAO.js');
    var match = require('./libs/MatchDAO.js');

    // DAOs
    var matchDAO = new match.MatchDAO(mongoClient);
    var playerDAO = new player.PlayerDAO(mongoClient);



//    var options = {
//        key: fs.readFileSync('./ssl/server.key'),
//        passphrase: 'BrainBurst',
//        cert: fs.readFileSync('./ssl/server.crt')
//    };

//    var httpsServer = https.createServer(options, function (req, res) {
//        logger.warn("Received http request for " + req.url + " that maybe an attack?");
//        res.writeHead(404);
//        res.end();
//    });


    var server = http.createServer(function (request, response) {
        logger.warn("Received http request for " + request.url + " that maybe an attack?");
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
            request.reject('not supported');
            return;
        }

        //route of connection
        connection.on('message', function (message) {
            if (message.type == 'binary') {
                zlib.unzip(message.binaryData, function(err, buffer){
                    if(!err){
                        message.utf8Data = buffer.toString();
                        //fix android send lots of \0 in message
                        var trimmed = message.utf8Data.split('\0');
                        message.utf8Data = trimmed[0];
                        msgHandler.route(connection, message.utf8Data, message.type);
                    }else{
                        logger.warn('Get binary data has an error '+err);
                    }
                });
            }else if(message.type == 'utf8'){
                //fix android send lots of \0 in message
                var trimmed = message.utf8Data.split('\0');
                message.utf8Data = trimmed[0];
                msgHandler.route(connection, message.utf8Data, message.type);
            }

        });

        connection.on('close', function (reasonCode, description) {
            connection_pool.delConnection(connection.id, function () {
                delete connections[connection.id];
            });
        });
    });

    wsServer.on('close', function(connection, reason, description){
        connection_pool.delConnection(connection.id, function () {
            delete connections[connection.id];
        }); //re-delete to make sure
        logger.info("Peer " + connection.id + " disconnected");
        connection.close();
    });

    //router logic

    msgHandler.on('UserLogin', function(connection, JSONmsg, msgType){
        if (JSONmsg.user.user_id!=undefined) {//login
            // user validation (mongoDB)
            playerDAO.getPlayerById(JSONmsg.user.user_id, function (doc) {
                if (doc) {// it is a true user
                    logger.info("mongoDB getPlayer " + JSON.stringify(doc));
                    connection_pool.setConnection(JSONmsg.user.user_id, process.pid);
                    connection.id = JSONmsg.user.user_id;
                    connections[connection.id] = connection;
                    var JSON2Send = JSON.stringify(JSONBuilder.user_login_builder(JSONmsg.msg_id,{'user_id':connection.id,'user_data':doc.user_data}));
                    sendData(connection, JSON2Send);
                    logger.info("connection accepted, worker pid is " + process.pid + ". uuid is " + connection.id);
                    //acknowledge master there is a new login(then master will try send push notifications)
                    process.send({'type':"get_push",'receiver':[connection.id]});
                    logger.debug("send a get_push request to master from worker "+process.pid+" receivers are "+connection.id);
                } else {// user not exists
                    var JSON2Send = JSON.stringify(JSONBuilder.illegal_json_builder(JSONmsg.msg_id,"user does not exist"));
                    sendData(connection, JSON2Send);
                }
            });
        }else{//register
            var connection_uuid = uuidGenerator();
            connection.id = connection_uuid;
            connection_pool.setConnection(connection_uuid, process.pid);
            //TODO: add other data fields e.g. A game String specify your game type.(If two games are using the same server, this must be specify)
            //TODO: easily, we could just add a prefix on user_id, like test_game_23df4-sf4wsf2-w44gsf-blablabla
            var user = {user_id:connection.id, user_data:JSONmsg.user.user_data};
            playerDAO.createPlayer(user, function () {
                logger.debug("create an user " + JSON.stringify(user));
                connections[connection.id] = connection;
                var JSON2Send = JSON.stringify(JSONBuilder.user_login_builder(JSONmsg.msg_id,user));
                if(msgType == 'binary'){
                    zlib.gzip(JSON2Send, function(err, buffer){
                        if(!err){
                            connection.sendBytes(buffer);
                        }else{
                            logger.warn("send "+connection.id+" binary JSON error:"+err);
                        }
                        logger.debug("send "+connection.id+" a JSON:"+JSON2Send);

                    });
                }else{
                    connection.sendUTF(JSON2Send, function(err){
                        if(err){
                            logger.warn("JSON send error! err message:"+err);
                        }
                        logger.debug("send "+user.user_id+" a JSON:"+JSON2Send);
                    });
                }
                logger.debug("connection accepted, worker pid is " + process.pid + ". user_id is " + connection.id+" ip is "+connection.remoteAddress);
                //acknowledge master there is a new login(then master will try send push notifications)
                process.send({'type':"get_push",'receiver':[connection.id]});
                logger.debug("send a get_push request to master from worker "+process.pid+" receivers are "+connection.id);

            });
        }
    });

    msgHandler.on('ChangeProfile', function(connection, JSONmsg, msgType){
        playerDAO.getPlayerById(JSONmsg.user.user_id,function(player){
            if(player != null && JSONmsg.user.user_id == connection.id){
                //user legal
                playerDAO.updatePlayer(JSONmsg.user.user_id,JSONmsg.user,function(){
                    var JSON2Send = JSON.stringify(JSONBuilder.change_profile_builder(JSONmsg.msg_id, JSONmsg.user));
                    if(msgType == 'binary'){
                        zlib.gzip(JSON2Send, function(err, buffer){
                            if(!err){
                                connection.sendBytes(buffer);
                            }else{
                                logger.warn("send "+connection.id+" binary JSON error:"+err);
                            }
                            logger.debug("send "+connection.id+" a JSON:"+JSON2Send);

                        });
                    }else{
                        connection.sendUTF(JSON2Send, function(err){
                            if(err){
                                logger.warn("JSON send error! err message:"+err);
                            }
                            logger.debug("send "+connection.id+" a JSON:"+JSON2Send);
                        });
                    }
                });
            }else{
                msgHandler.emit('IllegalJSON', connection, JSONmsg, msgType);
                logger.error("Get change_profile but user not login! request JSON is "+JSON.stringify(JSONmsg));
            }
        });
    });

    msgHandler.on('BotMatch', function(connection, JSONmsg, msgType){
        playerDAO.getPlayerById(JSONmsg.user.user_id, function(player){
           if(player != null && JSONmsg.user.user_id == connection.id){
               if(JSONmsg.create_method == 'auto'){
                   matchDAO.ensureIndex(JSONmsg.game);
                   matchDAO.pickOneWaitingMatch(JSONmsg.game, JSONmsg.user.user_id, function(match){
                      try{
                          if(match == undefined){
                              throw "no waiting matches";
                          }
                          var push_players = ce.clone(match['players']);
                          match['players'][match['players'].length] = JSONmsg.user.user_id;
                          if (match['players'].length == match['max_players']){//if there is enough people here
                              match['status'] = 'pending';
                          }
                          matchDAO.updateMatch(JSONmsg.game,match['match_id'],match, function(){
                              playerDAO.getPlayersById(match.players, function(players){
                                  //send json back to user
                                  //TODO: optimize sort function
                                  var players_sorted=[];
                                  for(var i=0; i<players.length;i++){
                                      players_sorted[match.players.indexOf(players[i].user_id)] = players[i];
                                  }
                                  var JSON2Send = JSON.stringify(JSONBuilder.create_match_builder(JSONmsg.msg_id,'ok',null,match,players_sorted));
                                  sendData(connection, JSON2Send);
                                  //DONE:send push to others
                                  //If you want send push to all players in this game, change receiver from `push_players` to `match['players']`
                                  var Push2Send = JSONBuilder.join_match_push_builder(match,players_sorted);
                                  process.send({'type':'new_push', 'receiver':push_players, 'json':Push2Send});
                                  logger.debug("send a new_push request to master from worker "+process.pid+" receivers are "+JSON.stringify(push_players)+", json is "+JSON.stringify(Push2Send));
                              });
                          });
                      }catch(e){
                            var JSON2Send = JSON.stringify({'msg_id':JSONmsg.msg_id,'type':JSONmsg.type, 'status':'error','msg':'no waiting matches'});
                            sendData(connection, JSON2Send);
                      }
                   });
               }
           }
        });
    });

    msgHandler.on('CreateMatch', function(connection, JSONmsg, msgType){
        //TODO: simplify login check, just compare connection.id and user.user_id
        playerDAO.getPlayerById(JSONmsg.user.user_id,function(player){
            if(player != null && JSONmsg.user.user_id == connection.id){
                if(JSONmsg.create_method == 'auto'){
                    //search for existing waiting match
                    matchDAO.ensureIndex(JSONmsg.game);
                    //TODO: Where there be a problem that A submit data, and while this B got this data?
                    matchDAO.pickOneWaitingMatch(JSONmsg.game, JSONmsg.user.user_id, function(match){
                        //TODO: Maybe need add error handling?
                        try{
                            //the returned variable match is not a list but a single object
                            if(match==undefined)
                                throw "no waiting matches";
                            //DONE: add check to exclude game created by user its own.
//                                            console.dir(match);
                            //if get a match with waiting status, join it
                            var push_players = ce.clone(match['players']);
                            match['players'][match['players'].length] = JSONmsg.user.user_id;
                            if (match['players'].length == match['max_players']){//if there is enough people here
                                match['status'] = 'pending';
                            }
//                                            console.log(match['players']);
                            matchDAO.updateMatch(JSONmsg.game,match['match_id'],match, function(){
                                playerDAO.getPlayersById(match.players, function(players){
                                    //send json back to user
                                    //TODO: optimize sort function
                                    var players_sorted=[];
                                    for(var i=0; i<players.length;i++){
                                        players_sorted[match.players.indexOf(players[i].user_id)] = players[i];
                                    }
                                    var JSON2Send = JSON.stringify(JSONBuilder.create_match_builder(JSONmsg.msg_id,'ok',null,match,players_sorted));
                                    sendData(connection, JSON2Send);
                                    //DONE:send push to others
                                    //If you want send push to all players in this game, change receiver from `push_players` to `match['players']`
                                    var Push2Send = JSONBuilder.join_match_push_builder(match,players_sorted);
                                    process.send({'type':'new_push', 'receiver':push_players, 'json':Push2Send});
                                    logger.debug("send a new_push request to master from worker "+process.pid+" receivers are "+JSON.stringify(push_players)+", json is "+JSON.stringify(Push2Send));
                                });
                            });

                        }catch(e){
                            logger.warn(e);
                            //no waiting match, create one
                            var match_uuid = uuidGenerator();
                            matchDAO.createMatch(JSONmsg.game,
                                {
                                    'match_id':match_uuid,
                                    'max_players':JSONmsg.max_players,
                                    'players':[JSONmsg.user.user_id],
                                    'status':'waiting',
                                    'match_data':JSONmsg.match.match_data
                                },
                                function(match){//successfully created
                                    //the returned variable match is a list, so need to change it to the first object
                                    match = match[match.length-1];
                                    logger.info(JSONmsg.game+" match created, uuid is "+match_uuid+" created by "+JSONmsg.user.user_id+", status is waiting");
                                    playerDAO.getPlayersById(match.players, function(players){
                                        //send json back to client
                                        //TODO: optimize sort function
                                        var players_sorted=[];
                                        for(var i=0; i<players.length;i++){
                                            players_sorted[match.players.indexOf(players[i].user_id)] = players[i];
                                        }
                                        var JSON2Send = JSON.stringify(JSONBuilder.create_match_builder(JSONmsg.msg_id,'ok',null,match,players_sorted));
                                        sendData(connection, JSON2Send);
                                    });
                                });
                        }
                    });
                }else if(JSONmsg.create_method == 'player'){

                    //firstly, create a match
                    var match_uuid = uuidGenerator();
                    //TODO: validate user_ids provided by client
                    var all_players =  ce.clone(JSONmsg.opponent_user_id);
                    all_players.splice(0,0,JSONmsg.user.user_id);
                    //DONE: How to figure out whether the match is full or still waiting
                    //check if your invitation is already meets the max players, set match status to pending, otherwise set it to waiting .
                    var match_status = 'waiting';
                    if (all_players.length == JSONmsg.max_players) {
                        match_status = 'pending';
                    }
                    matchDAO.ensureIndex(JSONmsg.game);
                    matchDAO.createMatch(JSONmsg.game,{'match_id':match_uuid,'max_players':JSONmsg.max_players,'players':all_players,'status':match_status,'match_data':JSONmsg.match.match_data},
                        function(match){//successfully created
                            //the returned variable match is a list, so need to change it to the first object
                            match = match[match.length-1];
                            logger.info(JSONmsg.game+" match created, uuid is "+match_uuid+" created by "+JSONmsg.user.user_id+", status is waiting");

                            //get opponent user

                            playerDAO.getPlayersById(match.players,function(players){

                                if(!players){
                                    logger.error("ERR! "+JSONmsg);
                                }

                                //TODO: optimize sort function
                                var players_sorted=[];
                                for(var i=0; i<players.length;i++){
                                    players_sorted[all_players.indexOf(players[i].user_id)] = players[i];
                                }
                                //send json back to client
                                var JSON2Send = JSON.stringify(JSONBuilder.create_match_builder(JSONmsg.msg_id,'ok',null,match,players_sorted));
                                sendData(connection, JSON2Send);
                                //DONE: add create_match's push notifications
                                //**This only pushes to players who were invited (exclude the one who create this match)**
                                //if you want to include the creator, change receiver from `JSONmsg.opponent_user_id` to `all_players`
                                process.send({'type':'new_push', 'receiver':JSONmsg.opponent_user_id, 'json':JSONBuilder.create_match_push_builder(match,players_sorted)});
                                logger.debug("send a new_push request to master from worker "+process.pid+" receivers are "+JSONmsg.opponent_user_id+", json is "+JSON2Send);

                            });
                        });
                }
            }else{
                msgHandler.emit('IllegalJSON', connection, JSONmsg, type);
                logger.error("Get change_profile but user not login! request JSON is "+JSON.stringify(JSONmsg));
            }
        });
    });

    msgHandler.on('LeaveMatch', function(connection, JSONmsg, msgType){
        playerDAO.getPlayerById(JSONmsg.user.user_id,function(player){
            if(player != null && JSONmsg.user.user_id == connection.id){
                //DONE: validate match_id
                matchDAO.getMatchById(JSONmsg.game, JSONmsg.match.match_id, function(match){
                    try{
                        if(match==undefined){
                            throw "no such match";
                        }
                        //remove user
                        for(var i in match.players) {
                            if (match.players[i] == JSONmsg.user.user_id){
                                match.players.splice(i,1);
                            }
                        }
                        match.status = "end";
                        playerDAO.getPlayersById(match.players, function(players){
                            matchDAO.updateMatch(JSONmsg.game, JSONmsg.match.match_id, match,function(){
                                //TODO: optimize sort function
                                var players_sorted=[];
                                for(var i=0; i<players.length;i++){
                                    players_sorted[match.players.indexOf(players[i].user_id)] = players[i];
                                }
                                var JSON2Send = JSON.stringify(JSONBuilder.leave_match_builder(JSONmsg.msg_id, JSONmsg.match.match_id));
                                sendData(connection, JSON2Send);

                                //send `leave_match` push
                                //Check players, if it is empty, do not create push
                                if(match.players.length>0){
                                    process.send({'type':'new_push', 'receiver':match.players, 'json':JSONBuilder.leave_match_push_builder(match,players_sorted)});
                                }
                            });
                        });
                    }catch(e){
                        var JSON2Send = JSON.stringify(JSONBuilder.illegal_json_builder(JSONmsg.msg_id,e));
                        sendData(connection, JSON2Send);
                    }
                });
            }else{
                msgHandler.on('IllegalJSON', connection, JSONmsg, msgType);
                logger.error("Get leave_match but user not login! request JSON is "+JSON.stringify(JSONmsg));
            }

        });
    });

    msgHandler.on('SubmitMatch', function(connection, JSONmsg, msgType){
        //validate login
        playerDAO.getPlayerById(JSONmsg.user.user_id,function(player){
            if(player != null && JSONmsg.user.user_id == connection.id){
                matchDAO.getMatchById(JSONmsg.game,JSONmsg.match.match_id, function(match){
                    if(match != null){
                        //DONE do we need validation about who should submit match data? (No need)
                        match.match_data = JSONmsg.match.match_data;
                        matchDAO.updateMatch(JSONmsg.game,JSONmsg.match.match_id,match,function(){
                            var JSON2Send = JSON.stringify(JSONBuilder.response_json_builder(JSONmsg.msg_id));
                            sendData(connection, JSON2Send);
                            //push to all players

                            playerDAO.getPlayersById(match.players, function(players){
                                //send json back to client
                                //TODO: optimize sort function
                                var players_sorted=[];
                                for(var i=0; i<players.length;i++){
                                    players_sorted[match.players.indexOf(players[i].user_id)] = players[i];
                                }
                                var Push2Send = JSONBuilder.submit_match_push_builder(JSONmsg.user.user_id,match,players_sorted);
                                process.send({'type':'new_push','receiver':match.players,'json':Push2Send});
                                logger.debug("send a new_push request to master from worker "+process.pid+" receivers are "+match.players+", json is "+JSON.stringify(Push2Send));
                            });


                        });
                    }else{
                        var JSON2Send = JSON.stringify(JSONBuilder.illegal_json_builder(JSONmsg.msg_id,"match not exists"));
                        sendData(connection, JSON2Send);

                        logger.debug("send "+JSONmsg.user.user_id+" a JSON:"+JSON.stringify(JSONBuilder.illegal_json_builder(JSONmsg.msg_id,"match not exists")));
                    }
                });
            }else{
                msgHandler.emit('IllegalJSON', connection, JSONmsg, msgType);
                logger.error("Get submit_match but user not login! request JSON is "+JSON.stringify(JSONmsg));
            }
        });
    });

    msgHandler.on('GetMatches', function(connection, JSONmsg, msgType){
        //validate login
        playerDAO.getPlayerById(JSONmsg.user.user_id,function(player){
            if(player != null && JSONmsg.user.user_id == connection.id){
                //TODO: add start and limit to json protocol
                var start = 0;
                var limit = 20;
                if(JSONmsg.start!=undefined && (typeof JSONmsg.start) == (typeof 1)){
                    start = JSONmsg.start;
                }
                if(JSONmsg.limit!=undefined && (typeof JSONmsg.limit) == (typeof 1)){
                    limit = JSONmsg.limit;
                }
                matchDAO.getMatchesByGameAndPlayer(JSONmsg.game,JSONmsg.user.user_id,start,limit,function(matches){
                    if (matches.length != 0){
                        var matches_players = [];
                        for(var i = 0; i< matches.length; i++) {
                            matches_players[i] = matches[i].players;
                        }
                        playerDAO.getPlayersByIdList(matches_players,function(match_players){
                            //TODO: optimize sort function
                            var players_sorted=[];
                            for(var i in match_players){
                                players_sorted[parseInt(i)] = [];
                                for(var j=0;j<matches_players[parseInt(i)].length; j++){
                                    players_sorted[parseInt(i)][matches_players[parseInt(i)].indexOf(match_players[i][j].user_id)] = match_players[i][j];
                                }
                            }
                            var JSON2Send = JSON.stringify(JSONBuilder.get_matches_builder(JSONmsg.msg_id,matches,players_sorted));
                            sendData(connection, JSON2Send);
                        });
                    }else{
                        logger.error("NOMATCHES");
                        var JSON2Send = JSON.stringify(JSONBuilder.get_matches_builder(JSONmsg.msg_id,null,null));
                        sendData(connection, JSON2Send);
                        logger.debug("send "+JSONmsg.user.user_id+" a JSON:"+JSON2Send);
                    }
                });
            }else{
                msgHandler.emit("IllegalJSON", connection, JSONmsg, msgType);
                logger.error("Get get_matches but user not login! request JSON is "+JSON.stringify(JSONmsg));
            }
        });
    });

    msgHandler.on('OnlinePlayers', function(connection, JSONmsg, msgType){
        //validate login
        playerDAO.getPlayerById(JSONmsg.user.user_id,function(player){
            if(player != null && JSONmsg.user.user_id == connection.id){
                connection_pool.getOnline(JSONmsg.user.user_id, function(opponents_user_ids){
                    var start=0;
                    var limit=20;
                    if(JSONmsg.start != undefined && (typeof JSONmsg.start) == (typeof 1)){
                        start = JSONmsg.start;
                    }
                    if(JSONmsg.limit != undefined && (typeof JSONmsg.limit) == (typeof 1)){
                        limit = JSONmsg.limit;
                    }
                    //trim opponents_user_id
                    opponents_user_ids.splice(0,start);
                    opponents_user_ids.splice(start+limit,opponents_user_ids.length - start - limit);
                    playerDAO.getPlayersById(opponents_user_ids,function(opponents){
                        var JSON2Send = JSON.stringify(JSONBuilder.online_players_builder(JSONmsg.msg_id,opponents));
                        sendData(connection, JSON2Send);
                    });
                });
            }else{
                msgHandler.emit("IllegalJSON", connection, JSONmsg, msgType);
                logger.error("Get online_players but user not login! request JSON is "+JSON.stringify(JSONmsg));
            }
        });
    });

    msgHandler.on('NotJSON', function(connection, msgType){
        var JSON2Send = JSON.stringify({'status':"error", 'msg':"hey, DO not try to fuck me up!"});
        sendData(connection, JSON2Send);
    });

    msgHandler.on('IllegalJSON', function(connection, JSONmsg, msgType){
        if(JSONmsg){
            var JSON2Send = JSON.stringify(JSONBuilder.illegal_json_builder(JSONmsg.msg_id, "json illegal"));
            sendData(connection, JSON2Send);
            logger.warn("JSONmsg illegal, json:"+JSON.stringify(JSONmsg)+" , connection from "+connection.remoteAddress);
        }else{
            var JSON2Send = JSON.stringify(JSONBuilder.error_builder());
            sendData(connection, JSON2Send);
        }
    });

    //workers' push sending logic
    process.on('message', function(message){
        if(message.type=='send_push') {
            //There we use a loop, but there some callback functions, will that cause conflict about message.receiver[i]?
            for(var id in message.receiver){
                if(connections[message.receiver[id]]!=undefined) {
                    //what if the connection is dropped just after this ?
                    zlib.gzip(JSON.stringify(message.json), function(err, buffer){
                        try{
                            if(!err){
                                logger.debug("push send to "+message.receiver[id]+" ok");
                                connections[message.receiver[id]].sendBytes(buffer);
                            }else{
                                logger.debug("push send status"+err);
                            }
                        }catch(e){
                            logger.debug(e);
                            logger.debug("the user_id "+message.receiver[id]+" of this push is not online!");
                            //push failed, put it back.
                            process.send({'type':"restore_push", 'receiver':[message.receiver[id]], 'json':message.json});
                        }

                    });
                }else{
                    logger.debug("the user_id "+message.receiver[id]+" of this push is not online!");
                    //push failed, put it back.
                    process.send({'type':"restore_push", 'receiver':[message.receiver[id]], 'json':message.json});
                    logger.info("send a restore_push request to master from worker "+process.pid+" receivers are "+message.receiver[id]+", json is "+JSON.stringify(message.json));
                }
            }
        }
    });

} else {//create multi-worker to handle websocket requests

    //clear redis-connection-pool's data
    var redisConnectionPoolClient = require('./libs/RedisConnectionPool.js');
    redisConnectionPoolClient.selectDB(function(){
        redisConnectionPoolClient.flush();
        logger.info("Redis connection pool flushed");
    });

    var PushQueue = require('./libs/PushQueue.js').PushQueue;
    var redisPush = require('./libs/RedisConnection.js').RedisConnection;
    var redisPushClient = new redisPush(conf.redis);
    redisPushClient.selectdb();
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
                logger.debug("Get a Push from worker:"+JSON.stringify(message));
                switch(message.type){
                    case 'new_push':
                        for (var i in message.receiver){
                            //find out which worker is handling this connection
                            redisConnectionPoolClient.getConnection(message.receiver[i], function(user_id,pid){
                                logger.debug("get "+user_id+"'s worker: "+pid);
                                if(pid == null){//already disconnected
                                    //DONE: add restore push
                                    logger.warn("user is not online! push send error, user_id:"+user_id+" restore push:"+JSON.stringify(message.json));
                                    //TODO: there is an order problem here, if client really got some problems here, this will be changed.
                                    queue.pushToFront(user_id,JSON.stringify(message.json), function(err,reply){
                                        if(err){
                                            logger.error("restore push save error, "+err);
                                        }else{
                                            logger.debug("restore push saved, "+reply);
                                        }
                                    });
                                }else{
                                    workers[pid].send({'type':"send_push", 'receiver':[user_id], 'json':message.json});
                                }
                            });
                        }
                        break;
                    case 'get_push':
                        //TODO: does this foreach function series or async? If not series, it will cause push order problems.
                        for (var i in message.receiver){
                            queue.each(message.receiver[i],function(json){
                                logger.error(JSON.parse(json));
                                cluster.workers[id].send({type:"send_push",'receiver':[message.receiver[i]],'json':JSON.parse(json)});
                            });
                        }
                        break;
                    case 'restore_push'://push that failed
                        if(message.json!=undefined){
                            queue.pushToFront(message.receiver[0],message.json, function(err,reply){
                                if(err){
                                    logger.error("restore push save error, "+err);
                                }
                                if(reply){
                                    logger.debug("restore push saved, "+reply);
                                }
                            });
                        }else{
                            logger.error("push data is empty");
                        }
                        break;
                    default:
                        logger.error("unsupported cluster message");
                        break;
                }
            }else{
                logger.error("illegal cluster message, "+JSON.stringify(message));
            }
        });
    });

    cluster.on('exit', function (worker, code, signal) {
        logger.error('worker ' + worker.process.pid + ' terminated by singal '+signal+" and code "+code);
        workers[worker.process.pid] = undefined;
        //delete all out of date connections
        redisConnectionPoolClient.getOnline('nothing', function(onlineplayers){
            for(var i =0; i< onlineplayers.length;i++){
                redisConnectionPoolClient.delConnection(onlineplayers[i]);
            }
        });

        //restart worker
        var newWorker = cluster.fork();
        workers[newWorker.process.pid] = newWorker;
    });

    //Monitor stuff

    // curl -u xinmei:brainburst url:8808

    var Monitorhttp = require("http");
    var Monitorurl = require("url");

    var mongo = require('./libs/MongoDBConnection.js');
    var mongoClient = new mongo.MongoDBConnection(conf.mongo);

    var player = require('./libs/PlayerDAO.js');
    var match = require('./libs/MatchDAO.js');

    // DAOs
    var matchDAO = new match.MatchDAO(mongoClient);
    var playerDAO = new player.PlayerDAO(mongoClient);

    Monitorhttp.createServer(function(req, res){
       var header = req.headers['authorization']||'';
       var token = header.split(/\s+/).pop()||'';
       var auth = new Buffer(token, 'base64').toString();
       var up = auth.split(/:/);
       if(up[0] != 'xinmei' || up[1] != 'brainburst'){
           res.writeHead(404);
           res.end();
           console.log("some one try to get status without auth");
       }else{
           switch(Monitorurl.parse(req.url).path){
               case "/":
                   res.writeHead(200, {'Content-Type': 'text/plain'});
                   res.end(JSON.stringify(MonitorStatus));
                   break;
               default:
                   res.writeHead(404);
                   res.end();
           }
       }
    }).listen(8808);

    var MonitorStatus = {
        'onlinePlayers': 0,
        'totalPlayers' : 0,
        'playersWithUnSendPush': 0,
        'totalMatches' : 0
    };

    var getStatus = function(){
        redisConnectionPoolClient.getOnline("", function(docs){
            MonitorStatus.onlinePlayers = docs.length;
        });
        playerDAO.playersCount(function(count){
            MonitorStatus.totalPlayers = count;
        });
        queue.getPlayers(function(players){
           MonitorStatus.playersWithUnSendPush = players.length;
        });
        matchDAO.matchesCount("letterpress",function(count){
           MonitorStatus.totalMatches = count;
        });
    };

    setInterval(getStatus, 60000);

}