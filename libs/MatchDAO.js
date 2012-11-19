

var collectionName = function(game) {
	return 'matches_' + game;
};

var MatchDAO = function(connection) {
	this.connection = connection;
	this.indexStatus = {};
}
MatchDAO.prototype.setIndexStatus = function(game){
    this.indexStatus[game] = true;
}
MatchDAO.prototype.ensureIndex = function(game) {
    var parent = this;
	if(this.indexStatus[game] != true) {
		this.connection.query(collectionName(game), function(collection){
			collection.ensureIndex({"match_id" : 1},{'background':'true'} ,function(err, msg) {
				if(err) {
					console.log('MatchDAO match_id index err :' + err);
					throw err;
				}
                collection.ensureIndex({"players" : 1},{'background':'true'} ,function(err, msg) {
                    if(err) {
                        console.log('MatchDAO players index err :' + err);
                        throw err;
                    }
                    collection.ensureIndex({"status" : 1},{'background':'true'} ,function(err, msg) {
                        if(err) {
                            console.log('MatchDAO status index err :' + err);
                            throw err;
                        }
                    });
                });
			});


            parent.setIndexStatus(game);
		});
	}
}


MatchDAO.prototype.getMatchesByGameAndPlayer = function(game, player, start, num, callback) {
	// console.log(start + "  " + num);
	this.connection.query(collectionName(game), function(collection) {
		collection.find({'players': player}, {'limit': num, 'skip' : start}).toArray(function(err, docs) {
			callback(docs);
		});
	});
}


MatchDAO.prototype.getMatchById = function(game, id, callback) {
	this.connection.query(collectionName(game), function(collection) {
		collection.findOne({'match_id': id}, function(err, match) {
			if(err)
				throw err;
			callback(match);
		});
	});
} 


MatchDAO.prototype.createMatch = function(game, match, callback) {
	if(!(match.status && match.match_id && match.players)) {
		throw new Error('match fields do not exist');
	}
	this.connection.query(collectionName(game), function(collection) {
		collection.insert(match, {}, function(err, match) {
            if(err){
               console.log("Create Match error");
            }
			callback(match);
		});
	});
}


MatchDAO.prototype.updateMatch = function(game, match_id, match, callback) {
	this.connection.query(collectionName(game), function(collection) {
		collection.update({'match_id': match_id}, match,  {}, function(err) {
			if(err)
				throw err;
			callback();
		});
	});
}


MatchDAO.prototype.pickOneWaitingMatch = function(game, playerId, callback) {
	this.connection.query(collectionName(game), function(collection) {
		collection.findAndModify({'$and' : [{players : {'$nin' : [playerId]}}, {status : 'waiting'}]}, {}, {'$set' : {'status' : 'pending'}},{}, function(err,object) {
			if(err)
				throw err;
			callback(object);
		});
	});
	
}


exports.MatchDAO = MatchDAO;
