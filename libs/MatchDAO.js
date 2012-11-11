

var collectionName = function(game) {
	return 'matches_' + game;
};

var MatchDAO = function(connection) {
	this.connection = connection;
	this.indexStatus = {};
}
MatchDAO.prototype.ensureIndex = function(game) {
	if(this.indexStatus[game] == null) {	
		this.connection.query(collectionName(game), function(collection){
			collection.ensureIndex({"match_id" : 1} ,function(err, msg) {
				if(err) {
					console.log('MatchDAO index err :' + err);
					throw err;
				}
			});
			collection.ensureIndex({"players" : 1} ,function(err, msg) {
				if(err) {
					console.log('MatchDAO index err :' + err);
					throw err;
				}
			});
			collection.ensureIndex({"status" : 1} ,function(err, msg) {
				if(err) {
					console.log('MatchDAO index err :' + err);
					throw err;
				}
			});
			this.indexStatus[game] = true;
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
			callback(match);
		});
	});
} 


MatchDAO.prototype.createMatch = function(game, match, callback) {
	if(!(match.status && match.match_id && match.players)) {
		throw new Error('match fields do not exist');
	}
	this.connection.query(collectionName(game), function(collection) {
		collection.insert(match, function(err, match) {
			callback(match);
		});
	});
}


MatchDAO.prototype.updateMatch = function(game, match_id, match, callback) {
	this.connection.query(collectionName(game), function(collection) {
		collection.update({'match_id': match_id}, match, function(err) {
			callback();
		});
	});
}


MatchDAO.prototype.pickOneWaitingMatch = function(game, callback) {
	this.connection.query(collectionName(game), function(collection) {
		collection.findAndModify({'status': 'waiting'}, {}, {'$set' : {'status' : 'pendding'}}, function(err) {
			console.log(err);
			callback();
		});
	});
	
}


exports.MatchDAO = MatchDAO;
