var mongo = require('mongodb');

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
        collection.findOne({"user_id" : id}, function(err, doc){
            var player = doc;
            cb(player);
        });
    });
}

PlayerDAO.prototype.getPlayersById = function(id_list, cb) {
    this.connection.query(collectionName, function(collection){
        collection.find({'user_id':{'$in':id_list}}).toArray(function(err,docs){
            if(err){
                throw err;
            }
            var players = docs;
//            console.log("WTF"+JSON.stringify(docs));
            cb(players);
        });
    });
}

PlayerDAO.prototype.updatePlayer = function(id,data,cb) {
    this.connection.query(collectionName, function(collection){
        collection.update({'user_id':id}, data, {}, function(err){
            if(err){
                throw err;
            }
            cb();
        });
    });
}

PlayerDAO.prototype.createPlayer = function(player, cb) {
    if(player.user_id == null)
        throw "player has no user_id";
    this.connection.query(collectionName, function(collection) {
        var doc = player
        collection.insert(doc, function(err){
            cb();
        });
    });
}

exports.PlayerDAO = PlayerDAO;
