var redis = require('redis');

var RedisConnection = function(config) {
	this.client = redis.createClient(config.port, config.host, config.options);
	this.client.on('error', function(err){
		console.log('redis error : ' + err);
	});
}
RedisConnection.prototype.flushdb = function() {
	this.client.flushdb();
}

exports.RedisConnection = RedisConnection;

