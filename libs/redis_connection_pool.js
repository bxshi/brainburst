/**
 * Created with JetBrains WebStorm.
 * User: Carmack.Shi <baoxu.shi@gmail.com>
 * Date: 12-11-8
 * Time: 下午3:54
 * To change this template use File | Settings | File Templates.
 */

var logger = require('./logger.js')
var redis = require("redis");
var Conf = require('../configuration.js');
var conf = new Conf();
var client = redis.createClient(conf.redisConnectionPool.port,conf.redisConnectionPool.host);
client.select(conf.redisConnectionPool.redisDB, function(err,res){
    if(err){
        logger.error('select redis connection pool DB failed');
    }
});


module.exports = {
  setConnection :   function(uuid, connection) {
      client.set(uuid, connection);
  },
  getConnection :   function(uuid, callback) {
      client.get(uuid, function(err, obj){
          if (err) {
              logger.error(err);
              callback();
              return;
          }

          callback(obj);
      });
  },
  delConnection :   function(uuid, callback) {
      client.del(uuid, function(err, obj){
         if(err){
             logger.error(err);
             callback();
             return;
         }
         callback(obj);
      });
  },
  flush : function() {
      client.flushall();
  },
  quit  :   function() {
    client.quit();
  }
};