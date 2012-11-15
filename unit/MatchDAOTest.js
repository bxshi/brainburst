
var should = require('should');
var MatchDAO = require('../libs/MatchDAO').MatchDAO;
var config = require('../TestConfig');
var MongoDBConnection = require('../libs/MongoDBConnection').MongoDBConnection;
var connection = new MongoDBConnection(config.mongo);
var game = "fuckgame";


describe('MatchDAOTest', function() {
	beforeEach(function(done){
					// console.log('fuck');
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
			var dao = new MatchDAO(connection);
			var create = function(num) {
				if(!matches[num]) {
					// console.log('asdf');
					done();
					return;
				}
                dao.ensureIndex(game);
				dao.createMatch(game, matches[num], function() {
					create(num+1);	
				});
			}	
			create(0);
		});
	});
	
	describe('create and get', function() {

		it('create and get', function(done) {
			// console.log(1);
			var dao = new MatchDAO(connection);
			dao.getMatchById(game, '1', function(match) {
				should.exist(match);
				match.match_id.should.equal('1');
				match.players[0].should.equal('sb1');
				done();
			// console.log(2);
			});
					
				
		});
		
	});
	
	describe('test find matches by game and player', function() {
		it('test find matches by game and player', function(done) {
			// console.log(3);
			
			var dao = new MatchDAO(connection);
			dao.getMatchesByGameAndPlayer(game, 'sb2', 0, 10, function(matches) {
				matches.should.have.lengthOf(2);
				done();
			// console.log(4);
			});
		});
		
	});
	describe('test update match', function() {
		it('test update match', function(done) {
			// console.log(5);
			var dao = new MatchDAO(connection);
			dao.updateMatch(game, '1', {
					'match_id': '1',
					'players' : ['sb1', 'sb2'],
					'status' : 'pending'
				}, function(){
				dao.getMatchById(game, '1', function(match) {
					should.exist(match);
					match.status.should.equal('pending');
					done();
			// console.log(6);
				});
			});
		});
	});
	describe('test pick one', function() {
		it('test pick one', function(done) {
			
			// console.log(7);
			var dao = new MatchDAO(connection);
			dao.pickOneWaitingMatch(game, 'sb2', function() {
				dao.getMatchById(game, '3', function(m) {
					m.status.should.equal('pending');
					done();
				});
			// console.log(8);
			});
		});
	});

});
