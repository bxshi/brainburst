
var collectionName = function(game) {
	return 'bot_' + game;
};

var BotDAO = function(connection) {
	this.connection = connection;
};

BotDAO.prototype.ensureIndex = function(game) {
    this.connection.query(collectionName(game), function(collection){
        for(var i = 'a'.charAt(0); i<'z'.charAt(0); i++){
            var c = String.fromCharCode(i);
            var index = {};
            index[c] = 1;
            collection.ensureIndex(index, function(err, msg){
                if(err){
                    throw err;
                }else{
                    console.log(msg);
                }
            });
        }
    });
};

BotDAO.prototype.findWord = function(game, str, max_len, min_len, callback){
    var queryJSON = {};

    for(var j='a'.charCodeAt(0);j<='z'.charCodeAt(0);j++){
        queryJSON[String.fromCharCode(j)] = {'$lte': 0};
    }

    for(var i=0; i<str.length;i++){
        console.log(str[i]);
            queryJSON[str[i]]['$lte']++;
    }

    queryJSON['length'] = {'$gt':min_len, '$lt':max_len};

    console.log("str is"+JSON.stringify(queryJSON));

    this.connection.query(collectionName(game), function(collection){
       collection.find(queryJSON, {'word' : 1}).sort({'length':-1}).toArray(function(err, docs){
          callback(docs);
       });
    });
};


BotDAO.prototype.insertWord = function(game, line, callback){
    this.connection.query(collectionName(game), function(collection){
        collection.insert(line, {safe:true}, function(err, line){
            if(err){
                throw err;
            }
            callback();
        });
    });
};

exports.BotDAO = BotDAO;
