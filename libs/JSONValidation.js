/**
 * Created with JetBrains WebStorm.
 * User: bxshi
 * Date: 12-11-9
 * Time: PM1:33
 * Validate user's request, check necessary JSON fields.
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
        if(JSONmsg.user!=undefined && JSONmsg.user.user_id == undefined && JSONmsg.user.user_data == undefined){
            return false;
        }
        return true;
    },
    change_profile  :   function(JSONmsg){
      if(!normalValidation(JSONmsg)){
          return false;
      }
      if(JSONmsg.type == undefined || JSONmsg.type != 'change_profile'){
          return false;
      }
      if(JSONmsg.user == undefined || JSONmsg.user.user_id == undefined || JSONmsg.user.user_data == undefined){
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
            console.log("no type");
            return false;
        }
        //no other fields
        if(JSONmsg.game==undefined || JSONmsg.create_method==undefined || JSONmsg.max_players==undefined){
            console.log("no other fields");
            return false;
        }
        //create_method not correct
        if(JSONmsg.create_method!='player'&& JSONmsg.create_method!='auto'){
            console.log("create_method not correct");
            return false;
        }
        //method = player but without friends
        if(JSONmsg.create_method=='player' && JSONmsg.opponent_user_id == undefined){
            console.log("player but without friends");
            return false;
        }
        // opponent is larger than max number
        if(JSONmsg.opponent_user_id && JSONmsg.opponent_user_id.length >= JSONmsg.max_players){
            return false;
        }
        //no game creation info.
        if(JSONmsg.match==undefined || JSONmsg.match.match_data==undefined){
            console.log("no game creation info.");
            return false;
        }
        //not login
        if(JSONmsg.user==undefined || JSONmsg.user.user_id==undefined){
            console.log("not login");
            return false;
        }

        return true;
    },
    leave_match : function(JSONmsg){
        if(!normalValidation(JSONmsg)){
            return false;
        }
        if(JSONmsg.type == undefined || JSONmsg.type != 'leave_match'){
            console.log("no type");
            return false;
        }
        //not login
        if(JSONmsg.user==undefined || JSONmsg.user.user_id==undefined){
            console.log("not login");
            return false;
        }
        if(JSONmsg.game==undefined){
            console.log("no game string");
            return false;
        }
        if(JSONmsg.match==undefined || JSONmsg.match.match_id==undefined){
            console.log("no match or no match id");
        }
        return true;
    },
    submit_match : function(JSONmsg){
        if(!normalValidation(JSONmsg)){
            return false;
        }
        if(JSONmsg.type == undefined || JSONmsg.type != 'submit_match'){
            console.log("no type");
            return false;
        }
        //not login
        if(JSONmsg.user==undefined || JSONmsg.user.user_id==undefined){
            console.log("not login");
            return false;
        }
        //no match_id or match_data
        if(JSONmsg.game==undefined || JSONmsg.match == undefined || JSONmsg.match.match_id == undefined || JSONmsg.match.match_data == undefined){
            console.log("no match or match_id or match_data");
            return false;
        }
        return true;
    },
    get_matches : function(JSONmsg) {

        if(!normalValidation(JSONmsg)){
            return false;
        }
        if(JSONmsg.type == undefined || JSONmsg.type != 'get_matches'){
            console.log("no type");
            return false;
        }
        //not login
        if(JSONmsg.user==undefined || JSONmsg.user.user_id==undefined){
            console.log("not login");
            return false;
        }
        if(JSONmsg.game==undefined){
            console.log("no game string");
            return false;
        }
        return true;
    },
    online_players : function(JSONmsg) {
        if(!normalValidation(JSONmsg)){
            return false;
        }
        if(JSONmsg.type == undefined || JSONmsg.type != 'online_players'){
            console.log("no type");
            return false;
        }
        //not login
        if(JSONmsg.user==undefined || JSONmsg.user.user_id==undefined){
            console.log("not login");
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