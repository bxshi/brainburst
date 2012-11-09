var mongo = require('mongodb');
var logger = require('./logger.js');

var collectionName = 'players';

var PlayerDAO = function(connection) {
    this.connection = connection;
    this.connection.query(collectionName, function(collection){
        		collection.ensureIndex({"user_id" : 1} ,function(err, msg) {
            			if(err) {
                				console.log('PlayerDAO index err :' + err);
                				throw err;
                			}
            		});
    });
}

PlayerDAO.prototype.getPlayerById = function(id, cb) {
    this.connection.query(collectionName, function(collection){
        collection.findOne({"user_id" : id}, function(err, doc){            if(err){
                logger.error("mongoDB playerDAO query error, "+err);
            }
            var player = doc;
            cb(player);
        });
    });
}

PlayerDAO.prototype.createPlayer = function(player, cb) {
    if(player.user_id == null)
        throw "player has no user_id";
    this.connection.query(collectionName, function(collection) {
        var doc = player
        collection.insert(doc, function(err){
            if(err){
                logger.error("mongoDB playerDAO insert error, "+err);
            }
            cb();
        });
    });
}

exports.PlayerDAO = PlayerDAO;