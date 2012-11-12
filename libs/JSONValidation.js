/**
 * Created with JetBrains WebStorm.
 * User: bxshi
 * Date: 12-11-9
 * Time: PM1:33
 * To change this template use File | Settings | File Templates.
 */

module.exports = {
    json_validation : function(JSONmsg) {
        return normalValidation(JSONmsg);
    },
    user_login  :   function(JSONmsg){
        if(!normalValidation(JSONmsg)){
            return false;
        }
        // no type
        if(JSONmsg.type == undefined || JSONmsg.type != 'user_login'){
            return false;
        }
        // no user_id and user data
        if(JSONmsg.user == undefined){
            return false;
        }

        // without user_id (which means register) but without user data
        if(JSONmsg.user!=undefined && JSONmsg.user.user_id == undefined && JSONmsg.user.data == undefined){
            return false;
        }
        return true;
    },
    create_match    : function(JSONmsg){
        if(!normalValidation(JSONmsg)){
            return false;
        }
        //no type
        if(JSONmsg.type == undefined || JSONmsg.type != 'create_match'){
            return false;
        }
        //no other fields
        if(JSONmsg.game==undefined || JSONmsg.create_method==undefined){
            return false;
        }
        //method = player but without friends
        if(JSONmsg.create_method=='player' && (JSONmsg.opponent_user_id == undefined || typeof JSONmsg.opponent_user_id != Object)){
            return false;
        }
        //no game creation info.
        if(JSONmsg.match==undefined){
            return false;
        }
        //not login
        if(JSONmsg.user==undefined || JSONmsg.user.user_id==undefined){
            return false;
        }

        return true;
    }
};

// all JSON got from client should pass this validation
function normalValidation(JSONmsg) {
    if(JSONmsg==undefined){
        return false;
    }
    if(JSONmsg.msg_id == undefined){
        return false;
    }
    if(JSONmsg.type == undefined){
        return false;
    }

    return true;
}