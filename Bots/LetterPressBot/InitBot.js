/**
 * Created with JetBrains WebStorm.
 * User: bxshi
 * Date: 12-12-12
 * Time: PM4:29
 * To change this template use File | Settings | File Templates.
 */

const Conf = require('../../configuration.js');
const conf = new Conf();

var mongo = require('../../libs/MongoDBConnection.js');
var mongoClient = new mongo.MongoDBConnection(conf.mongo);
var messageHandler = require('../../libs/MessageHandler.js');
const msgHandler = new messageHandler();
const sendData = require('../../libs/common.js').sendData;
var player = require('../../libs/PlayerDAO.js');
var match = require('../../libs/MatchDAO.js');

// DAOs
var matchDAO = new match.MatchDAO(mongoClient);
var playerDAO = new player.PlayerDAO(mongoClient);

var Bots = require("./BotConfig.js").BotConfigs;


for(var i = 0; i< Bots.length; i++){
    var botInfo = {'user_id' : Bots[i].uuid, 'user_data':{'nick_name':Bots[i].nickname}};
    playerDAO.createPlayer(botInfo, function(){
        console.log("bot created");
    });
}