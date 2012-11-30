


var PushQueue = function(connection) {
    this.client = connection.client;

};
PushQueue.queueName = function(playerId) {
    return "pq_" + playerId;
};

PushQueue.prototype.pop = function(playerId, callback) {
    var name = PushQueue.queueName(playerId);
    this.client.lpop(name, function(e, m) {
        callback(m);
    });
};

PushQueue.prototype.pushToEnd = function(playerId, message, callback) {
    var name = PushQueue.queueName(playerId);
    this.client.rpush(name, message, callback);
};
PushQueue.prototype.pushToFront = function(playerId, message, callback) {
    var name = PushQueue.queueName(playerId);
    this.client.lpush(name, message, callback);
};
PushQueue.prototype.each = function(playerId, callback) {
    var self = this;
    var iterate = function(msg) {
        if(msg != null) {
            callback(msg);
            self.pop(playerId, iterate);
        }
    };
    this.pop(playerId, iterate);

};
PushQueue.prototype.getPlayers = function(callback){
    this.client.keys("*", function(e, players){
       callback(players);
    });
};


exports.PushQueue = PushQueue;