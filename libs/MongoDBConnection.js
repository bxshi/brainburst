var mongo = require('mongodb');

var MongoDBConnection = function(config) {
	this.host = config.host;
	this.port = config.port;
	this.db = config.db;
	this.options = config.options;
	this.queue = [];
	this.db_handler = null;
}

MongoDBConnection.prototype.open = function() {
	this.server = new mongo.Server(this.host, this.port, this.options);
	this.db_object = new mongo.Db(this.db, this.server, {safe:false});
	var self = this;
	this.db_object.open(function(err, db_handler) {
		self.db_handler = db_handler;
		var queue = self.queue;
		for(var i = 0; i < queue.length; i++) {
			if(queue[i].collectionName != null) {
				collection = new mongo.Collection(queue[i].collectionName, db_handler);
				queue[i].callback(collection);
			}else {
				queue[i].callback(db_handler);
			}
		}
		self.queue = [];
	});
}
MongoDBConnection.prototype.close = function() {
	this.db_object.close();
}

MongoDBConnection.prototype.query = function(collectionName, callback) {
	if(this.db_handler) {
		var collection = new mongo.Collection( this.db_handler, collectionName);
		callback(collection);
		return 
	}
	this.queue.push({'collectionName': collectionName, 
			'callback' : callback});
}
MongoDBConnection.prototype.dbOperation = function( callback) {
	if(this.db_handler) {
		callback(this.db_handler);
		return ;
	}
	this.queue.push({'callback' : callback});
}
MongoDBConnection.prototype.drop = function(callback) {
	this.dbOperation(function(db_handler) {
		db_handler.dropDatabase(function(err) {
			callback();
		});
	});
}


exports.MongoDBConnection = MongoDBConnection;
//config = require('./test/TestConfig').mongo;
//var x = new MongoDBConnection({host: '127.0.0.1', port:27017, options: {}, db : 'test_fucks'});
//var x = new MongoDBConnection(config);
//x.open();
