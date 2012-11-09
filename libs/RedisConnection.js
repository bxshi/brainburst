var redis = require('redis');

var logger = require('./logger.js')

var RedisConnection = function(config) {
	this.client = redis.createClient(config.port, config.host, config.options);
	this.client.on('error', function(err){
		logger.error('redis PushDB error : ' + err);
	});
    this.client.select(config.redisPushDB, function(err){
        if(err){
            logger.error('select redis PushDB '+config.redisPushDB+' error : ' + err);
        }
    });
}
RedisConnection.prototype.flushdb = function() {
	this.client.flushdb();
}

exports.RedisConnection = RedisConnection;

