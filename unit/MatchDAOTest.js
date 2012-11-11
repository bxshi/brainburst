
var should = require('should');
var match = require('../libs/MatchDAO');
var config = require('../TestConfig');
var mongo = require('../libs/MongoDBConnection');
var connection = new mongo.MongoDBConnection(config.mongo);
var game = 'fuckgame';


describe('MatchDAOTest', function() {
	beforeEach(function(done){
					console.log('fuck');
		var matches = [
			{
				'match_id': '1',
				'players' : ['sb1', 'sb2'],
				'status' : 'waiting'
			},
			{
				'match_id': '2',
				'players' : ['sb1', 'sb2'],
				'status' : 'waiting'
			},
			{
				'match_id': '3',
				'players' : ['sb1', 'sb3'],
				'status' : 'waiting'
			}
		];
		connection.drop(function() {
			var dao = new match.MatchDAO(connection);
			var create = function(num) {
				if(!matches[num]) {
					done();
					console.log('asdf');
					return;
				}
				dao.createMatch(game, matches[num], function() {
					create(num+1);	
				});
			}	
			create(0);
		});
	});
	

	// it('create and get', function(done) {
		// console.log(1);
		// var dao = new match.MatchDAO(connection);
		// dao.getMatchById(game, '1', function(match) {
			// should.exist(match);
			// match.match_id.should.equal('1');
			// match.players[0].should.equal('sb1');
			// done();
		// console.log(2);
		// });
// 				
// 			
	// });
	// it('test find matches by game and player', function(done) {
		// console.log(3);
// 		
		// var dao = new match.MatchDAO(connection);
		// dao.getMatchesByGameAndPlayer(game, 'sb2', 0, 10, function(matches) {
			// matches.should.have.lengthOf(2);
			// done();
		// console.log(4);
		// });
	// });
	// it('test update match', function(done) {
		// console.log(5);
		// var dao = new match.MatchDAO(connection);
		// dao.updateMatch(game, '1', {
				// 'match_id': '1',
				// 'players' : ['sb1', 'sb2'],
				// 'status' : 'pendding'
			// }, function(){
			// dao.getMatchById(game, '1', function(match) {
				// should.exist(match);
				// match.status.should.equal('pendding');
				// done();
		// console.log(6);
			// });
		// });
	// });
	it('test pick one', function(done) {
		
		console.log(7);
		var dao = new match.MatchDAO(connection);
		dao.pickOneWaitingMatch(game, function() {
			done();
		console.log(8);
		});
	});

});
