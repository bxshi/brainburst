/**
 * Created with JetBrains WebStorm.
 * User: bxshi
 * Date: 12-11-23
 * Time: AM11:49
 * To change this template use File | Settings | File Templates.
 */


var JSONValidation = require('./JSONValidation.js');

var EventEmitter = require('events').EventEmitter;
var util = require('util');

var errorMsgHandler = 'IllegalJSON';


var MessageHandler = function MessageHandler(){
    EventEmitter.call(this);
};

util.inherits(MessageHandler, EventEmitter);

//check JSONmsg.type and emit different events
MessageHandler.prototype.route = function(connection, JSONstr, type){
    try{
        var JSONmsg = JSON.parse(JSONstr);
    }catch(e){
        //Can not parse to a JSON
        this.emit('NotJSON', connection);
        return;
    }

    if(!JSONValidation.json_validation(JSONmsg)){
        this.emit(errorMsgHandler, connection);
        return;
    }

    /*
     *
     * If new JSON string is designed in the future, add a case and emit a event
     *
     */
    switch(JSONmsg.type){
        case 'user_login':
            if(JSONValidation.user_login(JSONmsg)){
                this.emit('UserLogin', connection, JSONmsg, type);
            }else{
                this.emit(errorMsgHandler, connection, JSONmsg, type);
            }
            break;
        case 'change_profile':
            if(JSONValidation.change_profile(JSONmsg)){
                this.emit('ChangeProfile', connection, JSONmsg, type);
            }else{
                this.emit(errorMsgHandler, connection, JSONmsg, type);
            }
            break;
        case 'create_match':
            if(JSONValidation.create_match(JSONmsg)){
                this.emit('CreateMatch', connection, JSONmsg, type);
            }else{
                this.emit(errorMsgHandler, connection, JSONmsg, type);
            }
            break;
        case 'bot_match':
            if(JSONValidation.bot_match(JSONmsg)){
                this.emit('BotMatch', connection, JSONmsg, type);
            }else{
                this.emit(errorMsgHandler, connection, JSONmsg, type);
            }
            break;
        case 'leave_match':
            if(JSONValidation.leave_match(JSONmsg)){
                this.emit('LeaveMatch', connection, JSONmsg, type);
            }else{
                this.emit(errorMsgHandler, connection, JSONmsg, type);
            }
            break;
        case 'submit_match':
            if(JSONValidation.submit_match(JSONmsg)){
                this.emit('SubmitMatch', connection, JSONmsg, type);
            }else{
                this.emit(errorMsgHandler, connection, JSONmsg, type);
            }
            break;
        case 'get_matches':
            if(JSONValidation.get_matches(JSONmsg)){
                this.emit('GetMatches', connection, JSONmsg, type);
            }else{
                this.emit(errorMsgHandler, connection, JSONmsg, type);
            }
            break;
        case 'online_players':
            if(JSONValidation.online_players(JSONmsg)){
                this.emit('OnlinePlayers', connection, JSONmsg, type);
            }else{
                this.emit(errorMsgHandler, connection, JSONmsg, type);
            }
            break;
        default:
            this.emit(errorMsgHandler, connection, type);
    }
};
module.exports = MessageHandler;