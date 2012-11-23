/**
 * Created with JetBrains WebStorm.
 * User: bxshi
 * Date: 12-11-12
 * Time: PM12:03
 * Construct JSON object for response user's request or push message.
 */


// There is a fucking problem that JSONStr actually a JSONObject!

module.exports = {
    user_login_builder : function(msg_id, user) {
        var JSONObj = {'type':'user_login','msg_id':msg_id, 'status':'ok'};
        JSONObj.user = {'user_id':user.user_id,'user_data':user.user_data};
        return JSONObj;
    },
    change_profile_builder : function(msg_id, user) {
        var JSONObj = {'type':'change_profile', 'msg_id':msg_id, 'status':'ok'};
        if(user){
            JSONObj.user = {'user_id':user.user_id,'user_data':user.user_data};
        }
        return JSONObj;
    },
    create_match_builder : function(msg_id, status, msg, match, players) {
        var JSONObj = {'type':'create_match','msg_id':msg_id,'status':status};
        if(status == 'error'){
            JSONObj.msg = msg;
        }else{
            JSONObj.match = {'match_id':match['match_id'],'match_data':match['match_data']};
            if(players) {
                JSONObj.match.players = [];
                for(var i = 0; i< players.length; i++) {
                    JSONObj.match.players[i] = {'user_id':players[i].user_id,'user_data':players[i].user_data};
                }
            }else{
                console.log("ERROR! "+JSON.stringify(JSONObj));
            }
        }
        //console.dir(JSONObj);
        return JSONObj;
    },
    create_match_push_builder : function(match, players){
        var JSONObj = {'msg_id':-1, 'type':'invited_match'};
        JSONObj.match = {'match_id':match['match_id'],'match_data':match['match_data']};
        if(players) {
            JSONObj.match.players = [];
            for(var i = 0; i< players.length; i++) {
                JSONObj.match.players[i] = {'user_id':players[i].user_id,'user_data':players[i].user_data};
            }
        }
        //console.dir(JSONObj);
        return JSONObj;
    },
    join_match_push_builder : function(match,players){
        var JSONObj = {'msg_id':-1, 'type':'join_match'};
        JSONObj.match = {'match_id':match['match_id']};
        if(players) {
            JSONObj.match.players = [];
            for(var i = 0; i< players.length; i++) {
                JSONObj.match.players[i] = {'user_id':players[i].user_id,'user_data':players[i].user_data};
            }
        }
        //console.dir(JSONObj);
        return JSONObj;
    },
    leave_match_push_builder : function(match,players){
        var JSONObj = {'msg_id':-1, 'type':'leave_match'};
        JSONObj.match = {'match_id': match['match_id']};
        if(players) {
            JSONObj.match.players = [];
            for(var i = 0; i< players.length; i++) {
                JSONObj.match.players[i] = {'user_id':players[i].user_id,'user_data':players[i].user_data};
            }
        }
        //console.dir(JSONObj);
        return JSONObj;
    },
    illegal_json_builder : function(msg_id,msg){
        var JSONObj = {'msg_id':msg_id,'status':'error','msg':msg};
        //console.dir(JSONObj);
        return JSONObj;
    },
    response_json_builder : function(msg_id){
        var JSONObj = {'msg_id':msg_id, 'status':'ok'};
        //console.dir(JSONObj);
        return JSONObj;
    },
    leave_match_builder : function(msg_id, match_id){
        var JSONObj = {'msg_id':msg_id, 'type':'leave_match', 'status':'ok'};
        JSONObj.match = {'match_id' : match_id};
        return JSONObj;
    },
    submit_match_push_builder : function(user_id,match, players){
        var JSONObj = {'msg_id':-1, 'type':'update_match'};
        JSONObj.match = {'match_id':match.match_id,'from_opponent':user_id,'match_data':match.match_data};
        if(players){
            JSONObj.match.players = [];
            for(var i=0;i<players.length;i++){
                JSONObj.match.players[i] ={'user_id':players[i].user_id,'user_data':players[i].user_data};
            }
        }
        //console.dir(JSONObj);
        return JSONObj;
    },
    get_matches_builder : function(msg_id, matches, players_list){
        var JSONObj = {'type':'get_matches','msg_id':msg_id, 'status':'ok'};
        //should we use clone to avoid reference problem?
        JSONObj.matches = [];
        if(matches){
            for(var i =0;i<matches.length;i++){
                JSONObj.matches[i] = {'match_id':matches[i].match_id,'players':[],'match_data':matches[i].match_data};
                if(players_list[i]) {
                    for(var j = 0; j< players_list[i].length; j++) {
                        JSONObj.matches[i].players[j] = {'user_id':players_list[i][j].user_id,'user_data':players_list[i][j].user_data};
                    }
                }
            }
        }
        //console.dir(JSONObj);
        return JSONObj;
    },
    online_players_builder : function(msg_id, opponents){
        var JSONObj = {'type':'online_players','msg_id' : msg_id, 'status' : 'ok'};
        JSONObj.opponents = [];
        for(var i=0;i<opponents.length;i++){
            JSONObj.opponents[i] = {'user_id':opponents[i].user_id,'user_data':opponents[i].user_data};
        }
        //console.dir(JSONObj);
        return JSONObj;
    },
    error_builder : function(){
        var JSONObj = {'status':"error", "msg":"requested json does not contains msg_id or type"};
        return JSONObj;
    }
}