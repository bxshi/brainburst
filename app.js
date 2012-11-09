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
                try {
                    var JSONmsg = JSON.parse(message.utf8Data);

                } catch (e) {
                    logger.error('Client\'s request is not a valid JSON string');
                    connection.close();
                }

                //validate msg_id & type

                try {
                    if (type(JSONmsg.msg_id) == undefined) {
                        throw 'error';
                    }
                    if(type(JSONmsg.type) == undefined) {
                        throw 'error';
                    }
                } catch (e) {
                    connection.sendUTF('{"status":"error","msg":"request json does not contains a msg_id or type."}');
                    logger.error("get a request without a msg_id or type");
                    connection.close();//is that ok?
                    return;
                }

                //router

                //TODO: add validation about each message styles.
                switch (JSONmsg.type) {
                    case 'user_login':
                        logger.info("user_login");
                        try {
                            if (JSONmsg.user.user_id) {

                                //TODO user validation (mongoDB)
                                var playerDAO = new player.PlayerDAO(mongoClient);
                                logger.info("user_id is " + JSONmsg.user.user_id);
                                playerDAO.getPlayerById(JSONmsg.user.user_id, function (doc) {
                                    logger.info("doc is " + doc);
                                    if (doc) {// it is a true user
                                        logger.info("mongoDB getPlayer " + doc);
                                        connection_pool.setConnection(JSONmsg.user.user_id, process.pid);
                                        connection.id = JSONmsg.user.user_id;
                                        connections[connection.id] = connection;
                                        connection.sendUTF('{"msg_id":"' + JSONmsg.msg_id + '","status":"ok","user":{"user_id":"' + connection.id + '"}}');
                                        logger.info("connection accepted, worker pid is " + process.pid + ". uuid is " + connection.id);
                                    } else {// user not exists
                                        connection.sendUTF('{"msg_id":' + JSONmsg.msg_id + '","status":"error","msg":"user not exists"}');
                                        logger.warn("get a non-exist user uuid");
                                    }
                                });
                            }
                        } catch (e) {
                            var connection_uuid = uuid.v4();
                            connection.id = connection_uuid;
                            connection_pool.setConnection(connection_uuid, process.pid);
                            var playerDAO = new player.PlayerDAO(mongoClient);
                            //TODO: add other data fields
                            playerDAO.createPlayer({user_id:connection.id}, function () {
                                logger.info("create user, user_id is " + connection.id);
                                connections[connection.id] = connection;
                                connection.sendUTF('{"msg_id":"' + JSONmsg.msg_id + '","status":"ok","user":{"user_id":"' + connection.id + '"}}');
                                logger.info("connection accepted, worker pid is " + process.pid + ". uuid is " + connection.id);
                            });

                        }
                        break;

                    //TODO: Add login validation(uuid in pool)

                    case 'create_match':
                        logger.info("create_match");
                        connection.sendUTF('{"status":"ok"}');
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
} else {//create multi-worker to handle websocket requests

    //clear redis-connection-pool's data
    var client = require('./libs/redis_connection_pool.js');
    client.flush();
    logger.info("Redis connection pool flushed");

    //fork worker
    for (var i = 0; i < CPU_NUM; i++) {
        cluster.fork();
    }

    cluster.on('exit', function (worker, code, signal) {
        logger.error('worker ' + worker.process.pid + ' terminated');
    });
}