/**
 * Created with JetBrains WebStorm.
 * User: bxshi
 * Date: 12-11-30
 * Time: AM10:19
 * To change this template use File | Settings | File Templates.
 */

var zlib = require("zlib");
var logger = require("./logger.js");

exports.sendData = function(connection, JSON2Send){
    zlib.gzip(JSON2Send, function(err, buffer){
        if(!err){
            connection.sendBytes(buffer);
        }else{
            logger.warn("send "+connection.id+" binary JSON error:"+err);
        }
        logger.debug("send "+connection.id+" a JSON:"+JSON2Send);

    });
};



exports.getData = function(connection, data, msgHandler){
    zlib.unzip(data, function(err, buffer){
       if(!err){
           msgHandler.route(connection, buffer.toString());
       }
    });
};

