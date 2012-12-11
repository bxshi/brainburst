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

/*
 * type is desperated.
 */

MessageHandler.prototype.route = function(connection, JSONstr){
    try{
        var JSONmsg = JSON.parse(JSONstr);
        JSONstr = null;
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
                this.emit('UserLogin', connection, JSONmsg);
            }else{
                this.emit(errorMsgHandler, connection, JSONmsg);
            }
            break;
        case 'change_profile':
            if(JSONValidation.change_profile(JSONmsg)){
                this.emit('ChangeProfile', connection, JSONmsg);
            }else{
                this.emit(errorMsgHandler, connection, JSONmsg);
            }
            break;
        case 'create_match':
            if(JSONValidation.create_match(JSONmsg)){
                this.emit('CreateMatch', connection, JSONmsg);
            }else{
                this.emit(errorMsgHandler, connection, JSONmsg);
            }
            break;
        case 'bot_match':
            if(JSONValidation.bot_match(JSONmsg)){
                this.emit('BotMatch', connection, JSONmsg);
            }else{
                this.emit(errorMsgHandler, connection, JSONmsg);
            }
            break;
        case 'leave_match':
            if(JSONValidation.leave_match(JSONmsg)){
                this.emit('LeaveMatch', connection, JSONmsg);
            }else{
                this.emit(errorMsgHandler, connection, JSONmsg);
            }
            break;
        case 'submit_match':
            if(JSONValidation.submit_match(JSONmsg)){
                this.emit('SubmitMatch', connection, JSONmsg);
            }else{
                this.emit(errorMsgHandler, connection, JSONmsg);
            }
            break;
        case 'get_matches':
            if(JSONValidation.get_matches(JSONmsg)){
                this.emit('GetMatches', connection, JSONmsg);
            }else{
                this.emit(errorMsgHandler, connection, JSONmsg);
            }
            break;
        case 'online_players':
            if(JSONValidation.online_players(JSONmsg)){
                this.emit('OnlinePlayers', connection, JSONmsg);
            }else{
                this.emit(errorMsgHandler, connection, JSONmsg);
            }
            break;
        case 'push_response':
            if(JSONValidation.push_response(JSONmsg)){
                this.emit('PushResponse', connection, JSONmsg);
            }else{
                this.emit(errorMsgHandler, connection, JSONmsg);
            }
            break;
        default:
            this.emit(errorMsgHandler, connection);
    }
};
module.exports = MessageHandler;