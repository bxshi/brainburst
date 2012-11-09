exports.mongo = {
	host : '127.0.0.1',
	port : 27017,
	db : 'letter_press_test',
	options : {
		auto_reconnect : true
	}
	
};

exports.redis = {
	host : '127.0.0.1',
	port : 6379,
	options : {
		database : 'letter_press_test'
	}
}
