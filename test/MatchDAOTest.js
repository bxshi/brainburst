
var should = require('should');
var match = require('../libs/MatchDAO');
var config = require('../TestConfig');
var mongo = require('../libs/MongoDBConnection');
var connection = new mongo.MongoDBConnection(config.mongo);
var game = 'fuckgame';


describe('MatchDAOTest', function() {

	it('create and get', function(done) {
		connection.drop(function() {
			var dao = new match.MatchDAO(connection);
			dao.createMatch(game, {
				'match_id' : '1234',
				'players' : ['sb'],
				'status' : 'waiting'
			}, function() {
				dao.getMatchById(game, '1234', function(match) {
					should.exist(match);
					match.match_id.should.equal('1234');
					match.players[0].should.equal('sb');
					done();
				});
				
			});
			
		});
	});
	it('test find matches by game and player', function() {
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
			var dao = new match.MatchDAO(connections);
			var validate = function() {
				dao.getMatchesByGameAndPlayer(game, 'sb2', 0, 10, function(matches) {
					matches.should.have.lengthOf(2);
					done();
				});
			}
			var create = function(num) {
				if(!matches[num]) {
					validate();
					return;
				}
				dao.createMatch(game, matches[num], function() {
					create(num+1);	
				});
			}	
			create(0);
			
		});
	});

});
