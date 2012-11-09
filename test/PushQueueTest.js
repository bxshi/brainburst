var PushQueue = require('../libs/PushQueue.js').PushQueue;
var RedisConnection = require('../libs/RedisConnection.js').RedisConnection;
var config  = require('./configuration.js').redis;
var redis = new RedisConnection(config);
var should = require('should');


describe('PushQueueTest', function() {
	it('test pop', function(done) {
		redis.flushdb();
		var queue = new PushQueue(redis);
		queue.pop('1234', function(msg) {
			should.not.exist(msg);
			done();
		});
	});
	it('test pushToEnd and pop', function(done) {
		var queue = new PushQueue(redis);
		queue.pushToEnd('1234', "fuck you", function() {
			queue.pop('1234', function(msg) {
				should.exist(msg);
				msg.should.equal("fuck you");
				done()
			});
		});
	});
	it('test pushToFront and pushToEnd and each', function(done) {
		redis.flushdb();
		var queue = new PushQueue(redis);
		var count = 0;
		var validCount = 0;
		var valid = function() {
			queue.each('1234', function(e) {
				e.should.equal('suck' + validCount);
				validCount++;
				if(validCount == 9)
					done();

			});
		}
		var pushCallback = function() {
			if(count < 10) {
				count++;
				queue.pushToEnd('1234', "suck" + count, pushCallback);
			}else {
				valid();
			}
		};
		queue.pushToEnd('1234', "suck" + count, pushCallback);
		
	});
});
