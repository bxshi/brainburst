var mongo = require('mongodb');

var collectionName = "players";

var PlayerDAO = function(connection) {
	this.connection = connection;
}

PlayerDAO.prototype.getPlayerById = function(id, cb) {
	this.connection.query(collectionName, function(collection){
		collection.findOne({user_id : id}, function(err, doc){
			var player = doc;
			cb(player);
		});
	});
}

PlayerDAO.prototype.createPlayer = function(player, cb) {
	this.connection.query(collectionName, function(collection) {
		var doc = player
		collection.insert(doc, function(err){
			cb();
		});
	});
}

exports.PlayerDAO = PlayerDAO;

