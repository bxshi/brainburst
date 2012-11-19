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
    var uuid = require("node-uuid");
    var async = require('async');
    var ce = require('cloneextend');
    var WebSocketServer = require('websocket').server;
    var http = require('http');
    var https = require('https');
    var fs = require('fs');

    // Self-defined libs
    var connection_pool = require('./libs/redis_connection_pool.js');
    var mongo = require('./libs/MongoDBConnection.js');
    var mongoClient = new mongo.MongoDBConnection(conf.mongo);
    var player = require('./libs/PlayerDAO.js');
    var match = require('./libs/MatchDAO.js');
    var JSONValidation = require('./libs/JSONValidation.js');
    var JSONBuilder = require('./libs/JSONBuilder.js');

    // DAOs
    var matchDAO = new match.MatchDAO(mongoClient);
    var playerDAO = new player.PlayerDAO(mongoClient);

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
            if (message.type == 'utf8') {

                logger.debug("Received data: " + message.utf8Data);

                //JSON validation
                try {
                    var JSONmsg = JSON.parse(message.utf8Data);
                } catch (e) {
                    logger.warn('Client\'s request is not a valid JSON string, connection from '+connection.remoteAddress+' closed.');
                    connection.close();
                    return;
                }

                //JSON message validation
                if (!JSONValidation.json_validation(JSONmsg)){
                    connection.sendUTF('{"status":"error","msg":"request json does not contains a msg_id or type."}',function(){
                        logger.warn("get a request without a msg_id or type, connection from "+connection.remoteAddress+" closed.");
                    });
                    connection.close();//is that ok?
                    return;
                }

                //router

                //DONE: change json based log to connection.sendUTF()'s callback
                switch (JSONmsg.type) {
                    case 'user_login':

                        /*
                         * If user successfully logged in, redis's connection pool will contains user's uuid and its worker's pid.
                         */

                        if(!JSONValidation.user_login(JSONmsg)){
                            //DONE: change error message to a list, and get error from it
                            connection.sendUTF(JSON.stringify(JSONBuilder.illegal_json_builder(JSONmsg.msg_id,"user_login json illegal")), function(err){
                                if(err){
                                    logger.warn("JSON send error! err message:"+err);
                                }
                                logger.warn("JSONmsg illegal, json:"+JSON.stringify(JSONmsg)+" , connection from "+connection.remoteAddress);
                            });
                            return;
                        }

                        if (JSONmsg.user.user_id!=undefined) {//login
                            // user validation (mongoDB)
//                            logger.info("user_id is " + JSONmsg.user.user_id);
                            playerDAO.getPlayerById(JSONmsg.user.user_id, function (doc) {
                                if (doc) {// it is a true user
                                    logger.info("mongoDB getPlayer " + JSON.stringify(doc));
                                    connection_pool.setConnection(JSONmsg.user.user_id, process.pid);
                                    connection.id = JSONmsg.user.user_id;
                                    connections[connection.id] = connection;
                                    var JSON2Send = JSON.stringify(JSONBuilder.user_login_builder(JSONmsg.msg_id,{'user_id':connection.id,'user_data':doc.user_data}));
                                    connection.sendUTF(JSON2Send,function(err){
                                        if(err){
                                            logger.warn("JSON send error! err message:"+err);
                                        }
                                        logger.debug("send "+connection.id+" a JSON:"+JSON2Send);
                                    });
                                    logger.info("connection accepted, worker pid is " + process.pid + ". uuid is " + connection.id);
                                    //acknowledge master there is a new login(then master will try send push notifications)
                                    process.send({'type':"get_push",'receiver':[connection.id]});
                                    logger.debug("send a get_push request to master from worker "+process.pid+" receivers are "+connection.id);
                                } else {// user not exists
                                    var JSON2Send = JSON.stringify(JSONBuilder.illegal_json_builder(JSONmsg.msg_id,"user does not exist"));
                                    connection.sendUTF( JSON2Send, function(err){
                                        if(err){
                                            logger.warn("JSON send error! err message:"+err);
                                        }
                                        logger.warn("get a non-exist user uuid "+JSONmsg.user.user_id+", connection from "+connection.remoteAddress);
                                    });
                                }
                            });
                        }else{//register
                            var connection_uuid = uuid.v4();
                            connection.id = connection_uuid;
                            connection_pool.setConnection(connection_uuid, process.pid);
                            //TODO: add other data fields
                            var user = {user_id:connection.id, user_data:JSONmsg.user.user_data};
                            playerDAO.createPlayer(user, function () {
                                logger.debug("create an user " + JSON.stringify(user));
                                connections[connection.id] = connection;
                                var JSON2Send = JSON.stringify(JSONBuilder.user_login_builder(JSONmsg.msg_id,user));
                                connection.sendUTF(JSON2Send, function(err){
                                    if(err){
                                        logger.warn("JSON send error! err message:"+err);
                                    }
                                    logger.debug("send "+user.user_id+" a JSON:"+JSON2Send);
                                });
                                logger.debug("connection accepted, worker pid is " + process.pid + ". user_id is " + connection.id+" ip is "+connection.remoteAddress);
                                //acknowledge master there is a new login(then master will try send push notifications)
                                process.send({'type':"get_push",'receiver':[connection.id]});
                                logger.debug("send a get_push request to master from worker "+process.pid+" receivers are "+connection.id);

                            });
                        }
                        break;

                    case 'change_profile':
                        if(!JSONValidation.change_profile(JSONmsg)){
                            connection.sendUTF(JSON.stringify(JSONBuilder.illegal_json_builder(JSONmsg.msg_id,"change_profile json illegal")), function(err){
                                if(err){
                                    logger.warn("JSON send error! err message:"+err);
                                }
                                logger.warn("JSONmsg illegal, json:"+JSON.stringify(JSONmsg)+" , connection from "+connection.remoteAddress);
                            });
                            return;
                        }
                        playerDAO.getPlayerById(JSONmsg.user.user_id,function(player){
                             if(player != null && JSONmsg.user.user_id == connection.id){
                                 //user legal
                                 playerDAO.updatePlayer(JSONmsg.user.user_id,JSONmsg.user,function(){
                                     var JSON2Send = JSON.stringify(JSONBuilder.change_profile_builder(JSONmsg.msg_id, JSONmsg.user));
                                     connection.sendUTF(JSON2Send, function(err){
                                         if(err){
                                             logger.warn("JSON send error! err message:"+err);
                                         }
                                         logger.debug("send "+connection.id+" a JSON:"+JSON2Send);
                                    });
                                 });
                             }else{
                                 connection.sendUTF(JSON.stringify(JSONBuilder.illegal_json_builder(JSONmsg.msg_id,"please login first")),function(err){
                                     if(err){
                                         logger.warn("JSON send error! err message:"+err);
                                     }
                                     logger.error("Get change_profile but user not login! request JSON is "+JSON.stringify(JSONmsg));
                                 });
                             }
                        });
                        break;

                    case 'create_match':
                        if(!JSONValidation.create_match(JSONmsg)){
                            connection.sendUTF(JSON.stringify(JSONBuilder.illegal_json_builder(JSONmsg.msg_id,"create_match json illegal")),function(err){
                                if(err){
                                    logger.warn("JSON send error! err message:"+err);
                                }
                                logger.warn("JSONmsg illegal, json:"+JSON.stringify(JSONmsg)+" , connection from "+connection.remoteAddress);
                            });
                            return;
                        }

                        //TODO: simplify login check, just compare connection.id and user.user_id
                        playerDAO.getPlayerById(JSONmsg.user.user_id,function(player){
                            if(player != null && JSONmsg.user.user_id == connection.id){
                                if(JSONmsg.create_method == 'auto'){
                                    //search for existing waiting match
                                    matchDAO.ensureIndex(JSONmsg.game);
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
                                                    connection.sendUTF(JSON2Send,function(err){
                                                        if(err){
                                                            logger.warn("JSON send error! err message:"+err);
                                                        }
                                                        logger.debug("send "+JSONmsg.user.user_id+" a JSON:"+JSON2Send);
                                                    });
                                                    //DONE:send push to others
                                                    //If you want send push to all players in this game, change receiver from `push_players` to `match['players']`
                                                    var Push2Send = JSONBuilder.join_match_push_builder(match,players);
                                                    process.send({'type':'new_push', 'receiver':push_players, 'json':Push2Send});
                                                    logger.debug("send a new_push request to master from worker "+process.pid+" receivers are "+JSON.stringify(push_players)+", json is "+JSON.stringify(Push2Send));
                                                });
                                            });

                                        }catch(e){
                                            logger.warn(e);
                                            //no waiting match, create one
                                            var match_uuid = uuid.v4();
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
                                                        connection.sendUTF(JSON2Send,function(err){
                                                            if(err){
                                                                logger.warn("JSON send error! err message:"+err);
                                                            }
                                                            logger.debug("send "+JSONmsg.user.user_id+" a JSON:"+JSON2Send);
                                                        });
                                                    });
                                                });
                                        }
                                    });
                                }else if(JSONmsg.create_method == 'player'){

                                    //firstly, create a match
                                    var match_uuid = uuid.v4();
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
                                                connection.sendUTF(JSON2Send,function(err){
                                                    if(err){
                                                        logger.warn("JSON send error! err message:"+err);
                                                    }
//                                                    logger.debug("send "+JSONmsg.user.user_id+" a JSON:"+JSONBuilder.create_match_builder(JSONmsg.msg_id,'ok',null,match,players));
                                                });

                                                //DONE: add create_match's push notifications
                                                //**This only pushes to players who were invited (exclude the one who create this match)**
                                                //if you want to include the creator, change receiver from `JSONmsg.opponent_user_id` to `all_players`
                                                process.send({'type':'new_push', 'receiver':JSONmsg.opponent_user_id, 'json':JSONBuilder.create_match_push_builder(match,players_sorted)});
                                                logger.debug("send a new_push request to master from worker "+process.pid+" receivers are "+JSONmsg.opponent_user_id+", json is "+JSON2Send);

                                            });
                                        });
                                }
                            }else{
                                connection.sendUTF(JSON.stringify(JSONBuilder.illegal_json_builder(JSONmsg.msg_id,"please login first")),function(err){
                                    if(err){
                                        logger.warn("JSON send error! err message:"+err);
                                    }
                                    logger.error("Get create_match but user not login! request JSON is "+JSON.stringify(JSONmsg));
                                });
                            }
                        });
                        break;
                    case 'leave_match':
                        if(!JSONValidation.leave_match(JSONmsg)){
                            connection.sendUTF(JSON.stringify(JSONBuilder.illegal_json_builder(JSONmsg.msg_id,"leave_match json illegal")),function(err){
                                if(err){
                                    logger.warn("JSON send error! err message:"+err);
                                }
                                logger.warn("JSONmsg illegal, json:"+JSON.stringify(JSONmsg)+" , connection from "+connection.remoteAddress);
                            });
                            return;
                        }
                        //validate login
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
                                                var JSON2Send = JSON.stringify(JSONBuilder.response_json_builder(JSONmsg.msg_id));
                                                connection.sendUTF(JSON2Send,function(err){
                                                    if(err){
                                                        logger.warn("JSON send error! err message:"+err);
                                                    }
                                                    logger.debug("send "+JSONmsg.user.user_id+" a JSON:"+JSON2Send);
                                                });
                                                //send `leave_match` push
                                                //Check players, if it is empty, do not create push
                                                if(match.players.length>0){
                                                    process.send({'type':'new_push', 'receiver':match.players, 'json':JSONBuilder.leave_match_push_builder(match,players_sorted)});
                                                }
                                            });
                                        });
                                    }catch(e){
                                        var JSON2Send = JSON.stringify(JSONBuilder.illegal_json_builder(JSONmsg.msg_id,e));
                                        connection.sendUTF(JSON2Send,function(err){
                                            if(err){
                                                logger.warn("JSON send error! err message:"+err);
                                            }
                                            logger.debug("send "+JSONmsg.user.user_id+" a JSON:"+JSON2Send);
                                            logger.error("client send a non-exists match id!");
                                        });
                                    }
                                });
                            }else{
                                connection.sendUTF(JSON.stringify(JSONBuilder.illegal_json_builder(JSONmsg.msg_id,"please login first")),function(err){
                                    if(err){
                                        logger.warn("JSON send error! err message:"+err);
                                    }
                                    logger.error("Get leave_match but user not login! request JSON is "+JSON.stringify(JSONmsg));
                                });
                            }

                        });
                        break;
                    case 'submit_match':
                        if(!JSONValidation.submit_match(JSONmsg)){
                            connection.sendUTF(JSON.stringify(JSONBuilder.illegal_json_builder(JSONmsg.msg_id,"submit_match json illegal")),function(err){
                                if(err){
                                    logger.warn("JSON send error! err message:"+err);
                                }
                                logger.warn("JSONmsg illegal, json:"+JSON.stringify(JSONmsg)+" , connection from "+connection.remoteAddress);
                            });
                            return;
                        }
                        //validate login
                        playerDAO.getPlayerById(JSONmsg.user.user_id,function(player){
                            if(player != null && JSONmsg.user.user_id == connection.id){
                                matchDAO.getMatchById(JSONmsg.game,JSONmsg.match.match_id, function(match){
                                    if(match != null){
                                        //DONE do we need validation about who should submit match data? (No need)
                                        match.match_data = JSONmsg.match.match_data;
                                        matchDAO.updateMatch(JSONmsg.game,JSONmsg.match.match_id,match,function(){
                                            var JSON2Send = JSON.stringify(JSONBuilder.response_json_builder(JSONmsg.msg_id));
                                            connection.sendUTF(JSON2Send,function(err){
                                                if(err){
                                                    logger.warn("JSON send error! err message:"+err);
                                                }
                                                logger.debug("send "+JSONmsg.user.user_id+" a JSON:"+JSON2Send);
                                            });
                                            //push to all players
                                            var Push2Send = JSONBuilder.submit_match_push_builder(JSONmsg.user.user_id,match);
                                            process.send({'type':'new_push','receiver':match.players,'json':Push2Send});
                                            logger.debug("send a new_push request to master from worker "+process.pid+" receivers are "+match.players+", json is "+JSON.stringify(Push2Send));
                                        });
                                    }else{
                                        connection.sendUTF(JSON.stringify(JSONBuilder.illegal_json_builder(JSONmsg.msg_id,"match not exists")),function(err){
                                            if(err){
                                                logger.warn("JSON send error! err message:"+err);
                                            }
                                            logger.debug("send "+JSONmsg.user.user_id+" a JSON:"+JSON.stringify(JSONBuilder.illegal_json_builder(JSONmsg.msg_id,"match not exists")));
                                        });
                                    }
                                });
                            }else{
                                connection.sendUTF(JSON.stringify(JSONBuilder.illegal_json_builder(JSONmsg.msg_id,"please login first")),function(err){
                                    if(err){
                                        logger.warn("JSON send error! err message:"+err);
                                    }
                                    logger.debug("send "+JSONmsg.user.user_id+" a JSON:"+JSON.stringify(JSONBuilder.illegal_json_builder(JSONmsg.msg_id,"please login first")));
                                    logger.error("Get submit_match but user not login! request JSON is "+JSON.stringify(JSONmsg));
                                });
                            }
                        });
                        break;
                    case 'get_matches':
                        if(!JSONValidation.get_matches(JSONmsg)){
                            connection.sendUTF(JSON.stringify(JSONBuilder.illegal_json_builder(JSONmsg.msg_id,"get_matches json illegal")),function(err){
                                if(err){
                                    logger.warn("JSON send error! err message:"+err);
                                }
                                logger.warn("JSONmsg illegal, json:"+JSON.stringify(JSONmsg)+" , connection from "+connection.remoteAddress);
                            });
                            return;
                        }
                        //validate login
                        playerDAO.getPlayerById(JSONmsg.user.user_id,function(player){
                            if(player != null && JSONmsg.user.user_id == connection.id){
                                matchDAO.getMatchesByGameAndPlayer(JSONmsg.game,JSONmsg.user.user_id,0,100,function(matches){
                                    logger.error(1);
                                    if (matches.length != 0){
                                        logger.error(2);
                                        logger.error(JSON.stringify(matches));
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
                                            connection.sendUTF(JSON2Send,function(err){
                                                if(err){
                                                    logger.warn("JSON send error! err message:"+err);
                                                }
                                                logger.debug("send "+JSONmsg.user.user_id+" a JSON:"+JSON2Send);
                                            });
                                        });
                                    }else{
                                        logger.error("NOMATCHES");
                                        connection.sendUTF(JSON.stringify(JSONBuilder.get_matches_builder(JSONmsg.msg_id,null,null)),function(err){
                                            if(err){
                                                logger.warn("JSON send error! err message:"+err);
                                            }
                                            logger.debug("send "+JSONmsg.user.user_id+" a JSON:"+JSON.stringify(JSONBuilder.illegal_json_builder(JSONmsg.msg_id,"no match for this user")));
                                        });
                                    }
                                });
                            }else{
                                connection.sendUTF(JSON.stringify(JSONBuilder.illegal_json_builder(JSONmsg.msg_id,"please login first")),function(err){
                                    if(err){
                                        logger.warn("JSON send error! err message:"+err);
                                    }
                                    logger.debug("send "+JSONmsg.user.user_id+" a JSON:"+JSON.stringify(JSONBuilder.illegal_json_builder(JSONmsg.msg_id,"please login first")));
                                    logger.error("Get get_matches but user not login! request JSON is "+JSON.stringify(JSONmsg));
                                });
                            }
                        });
                        break;
                    case 'online_players':
                        if(!JSONValidation.online_players(JSONmsg)){
                            connection.sendUTF(JSON.stringify(JSONBuilder.illegal_json_builder(JSONmsg.msg_id,"online_players json illegal")),function(err){
                                if(err){
                                    logger.warn("JSON send error! err message:"+err);
                                }
                                logger.warn("JSONmsg illegal, json:"+JSON.stringify(JSONmsg)+" , connection from "+connection.remoteAddress);
                            });
                            return;
                        }
                        //validate login
                        playerDAO.getPlayerById(JSONmsg.user.user_id,function(player){
                            if(player != null && JSONmsg.user.user_id == connection.id){
                                connection_pool.getOnline(JSONmsg.user.user_id, function(opponents_user_ids){
                                    playerDAO.getPlayersById(opponents_user_ids,function(opponents){
                                        var JSON2Send = JSON.stringify(JSONBuilder.online_players_builder(JSONmsg.msg_id,opponents));
                                        connection.sendUTF(JSON2Send,function(err){
                                            if(err){
                                                logger.warn("JSON send error! err message:"+err);
                                            }
                                            logger.debug("send "+JSONmsg.user.user_id+" a JSON:"+JSON2Send);
                                        });
                                    });
                                });
                            }else{
                                connection.sendUTF(JSON.stringify(JSONBuilder.illegal_json_builder(JSONmsg.msg_id,"please login first")),function(err){
                                    if(err){
                                        logger.warn("JSON send error! err message:"+err);
                                    }
                                    logger.debug("send "+JSONmsg.user.user_id+" a JSON:"+JSON.stringify(JSONBuilder.illegal_json_builder(JSONmsg.msg_id,"please login first")));
                                    logger.error("Get online_players but user not login! request JSON is "+JSON.stringify(JSONmsg));
                                });
                            }
                        });
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
            });
        });
    });

    wsServer.on('close', function(connection, reason, description){
        logger.info("Peer " + connection.id + " disconnected");
        connection.close();
    });

    //workers' push sending logic
    process.on('message', function(message){
        if(message.type=='send_push') {
            //There we use a loop, but there some callback functions, will that cause conflict about message.receiver[i]?
            for(var id in message.receiver){
                if(connections[message.receiver[id]]!=undefined) {
                    //what if the connection is dropped just after this ?
                    try{
                        connections[message.receiver[id]].sendUTF(JSON.stringify(message.json), function(err){
                            if(err){
                                logger.debug("push send status"+err);
                                throw "user not online";
                            }else{
                                logger.debug("push send to "+message.receiver[id]+" ok");
                            }
                        });
                    }catch(e){
                        logger.debug(e);
                        logger.debug("the user_id "+message.receiver[id]+" of this push is not online!");
                        //push failed, put it back.
                        process.send({'type':"restore_push", 'receiver':[message.receiver[id]], 'json':message.json});
                        logger.info("send a restore_push request to master from worker "+process.pid+" receivers are "+message.receiver[id]+", json is "+JSON.stringify(message.json));
                    }
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
        logger.error('worker ' + worker.process.pid + ' terminated');
    });


}