var should = require('should');
var player = require('../libs/PlayerDAO.js');
var config = require('./configuration.js').mongo;
var mongo = require('../libs/MongoDBConnection.js');

var connection = new mongo.MongoDBConnection(config);

describe('playerDAO', function() {
	it('getPlayerById', function(done) {
		var dao = new player.PlayerDAO(connection);
		var logic = function(result) {
			should.not.exist(result);
			done();
		}
		connection.drop(function() {
			dao.getPlayerById('1234', logic);

		});
	});
	it('create and find', function(done) {
		var dao = new player.PlayerDAO(connection);
		var p = {user_id: '1234', name : 'sb'};
		var afterCreate = function() {
			dao.getPlayerById('1234', function(doc) {
				should.exist(doc);
				doc.should.have.property('user_id', '1234');
				done();
			})
		}
		connection.drop(function() {
			dao.createPlayer(p, function() {
				afterCreate();
			});
		});
	});
	
});

