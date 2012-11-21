var redis = require('redis');
var Conf = require('../configuration.js');
var conf = new Conf();

var RedisConnection = function(config) {
    this.client = redis.createClient(config.port, config.host);
    this.client.on('error', function(err){
        console.log('redis error : ' + err);
    });
}
RedisConnection.prototype.flushdb = function() {
    this.client.flushdb();
}

RedisConnection.prototype.selectdb = function(cb) {
    this.client.select(conf.redis.db,cb);
}

exports.RedisConnection = RedisConnection;
