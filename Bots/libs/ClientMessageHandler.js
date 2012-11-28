/**
 * Created with JetBrains WebStorm.
 * User: bxshi
 * Date: 12-11-27
 * Time: PM4:21
 * To change this template use File | Settings | File Templates.
 */

var EventEmitter = require('events').EventEmitter;
var util = require("util");

var ClientMessageHandler = function(){
    EventEmitter.call(this);
};

util.inherits(ClientMessageHandler, EventEmitter);


ClientMessageHandler.prototype.route = function(connection, JSONstr){

    try {
        var JSONmsg = JSON.parse(JSONstr);
    }catch(e){
        this.emit('NotJSON', connection, JSONstr);
    }

    if(JSONmsg.msg_id == -1){// this is a push

        switch(JSONmsg.type){
            case 'invited_match':
                this.emit('InvitedMatch', connection, JSONmsg);
                break;
            case 'join_match':
                this.emit('JoinMatch', connection, JSONmsg);
                break;
            case 'leave_match':
                this.emit('LeaveMatch', connection, JSONmsg);
                break;
            case 'update_match':
                this.emit('UpdateMatch', connection, JSONmsg);
                break;

        }

    }else{// normal feedback
        switch(JSONmsg.type){
            case 'user_login':
                this.emit('UserLogin', connection, JSONmsg);
                break;
            case 'bot_match':
            case 'create_match':
                this.emit('BotMatch', connection, JSONmsg);
                break;
        }
    }

};

module.exports = ClientMessageHandler;