var should = require('should');
var player = require('../PlayerDAO');
var config = require('../TestConfig').mongo;
var mongo = require('../MongoDBConnection');

var connection = new mongo.MongoDBConnection(config);

//		connection.open();

describe('playerDAO', function() {
	it('getPlayerById', function(done) {
//		connection.open();
		var dao = new player.PlayerDAO(connection);
		var logic = function(result) {
			should.not.exist(result);
//			connection.close();
			done();
		}
		connection.drop(function() {
			dao.getPlayerById('1234', logic);

		});
	});
	it('create and find', function(done) {
//		connection.open();
		var dao = new player.PlayerDAO(connection);
		var p = {user_id: '1234', name : 'sb'};
		var afterCreate = function() {
			dao.getPlayerById('1234', function(doc) {
				should.exist(doc);
				doc.should.have.property('user_id', '1234');
//				connection.close();
				done();
			})
		}
		connection.drop(function() {
			dao.createPlayer(p, function() {
				afterCreate();
				connection.close();
			});	
		});
	});
	
});

