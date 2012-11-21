/**
 * Created with JetBrains WebStorm.
 * User: Carmack.Shi <baoxu.shi@gmail.com>
 * Date: 12-11-8
 * Time: 下午3:54
 * global connection pool.
 */

var logger = require('./logger.js')
var redis = require("redis");
var Conf = require('../configuration.js');
var conf = new Conf();
var client = redis.createClient(conf.redisConnectionPool.port,conf.redisConnectionPool.host);


module.exports = {
  selectDB : function(cb){
      client.select(conf.redisConnectionPool.db, cb);
  },
  setConnection :   function(uuid, connection) {
      client.set(uuid, connection);
  },
  getConnection :   function(uuid, callback) {
      client.get(uuid, function(err, obj){
          if (err) {
              logger.error(err);
              throw err;
          }

          callback(uuid,obj);
      });
  },
  delConnection :   function(uuid, callback) {
      client.del(uuid, function(err, obj){
         if(err){
             logger.error(err);
             throw err;
         }
         callback(obj);
      });
  },
  getOnline : function(uuid, callback) {
      client.keys("*",function(err,objs){
          if(err){
              logger.error(err);
              throw err;
          }
          for (var i in objs){
              if (objs[i] == uuid){
                  objs.splice(i,1);
              }
          }
          callback(objs);
      });
  },
  flush : function() {
      client.flushdb();
  },
  quit  :   function() {
    client.quit();
  }
};