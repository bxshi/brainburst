/**
 * Created with JetBrains WebStorm.
 * User: bxshi
 * Date: 12-11-23
 * Time: AM11:49
 * To change this template use File | Settings | File Templates.
 */


var JSONValidation = require('./JSONValidation.js');

var EventEmitter = require('events').EventEmitter();
var util = require('util');

var MessageHandler = function() {

};

var errorMsgHandler = 'IllegalJSON';

//check JSONmsg.type and emit different events
MessageHandler.prototype.route = function(connection, JSONstr){
    try{
        var JSONmsg = JSON.parse(JSONstr);
    }catch(e){
        //Can not parse to a JSON
        self.emit('NotJSON', connection);
        return;
    }

    if(!JSONValidation.json_validation(JSONmsg)){
        self.emit(errorMsgHandler, connection);
        return;
    }

    switch(JSONmsg.type){
        case 'user_login':
            if(JSONValidation.user_login(JSONmsg)){
                self.emit('UserLogin', connection, JSONmsg);
            }else{
                self.emit(errorMsgHandler, connection, JSONmsg);
            }
            break;
        case 'change_profile':
            if(JSONValidation.change_profile(JSONmsg)){
                self.emit('ChangeProfile', connection, JSONmsg);
            }else{
                self.emit(errorMsgHandler, connection, JSONmsg);
            }
            break;
        case 'create_match':
            if(JSONValidation.create_match(JSONmsg)){
                self.emit('CreateMatch', connection, JSONmsg);
            }else{
                self.emit(errorMsgHandler, connection, JSONmsg);
            }
            break;
        case 'leave_match':
            if(JSONValidation.leave_match(JSONmsg)){
                self.emit('LeaveMatch', connection, JSONmsg);
            }else{
                self.emit(errorMsgHandler, connection, JSONmsg);
            }
            break;
        case 'submit_match':
            if(JSONValidation.submit_match(JSONmsg)){
                self.emit('SubmitMatch', connection, JSONmsg);
            }else{
                self.emit(errorMsgHandler, connection, JSONmsg);
            }
            break;
        case 'get_matches':
            self.emit('GetMatches', connection, JSONmsg);
            break;
        case 'online_players':
            self.emit('OnlinePlayers', connection, JSONmsg);
            break;
        default:
            self.emit(errorMsgHandler);
    }
};

util.inherits(MessageHandler,EventEmitter);
module.exports = MessageHandler;