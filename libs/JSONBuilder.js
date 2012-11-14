/**
 * Created with JetBrains WebStorm.
 * User: bxshi
 * Date: 12-11-12
 * Time: PM12:03
 * To change this template use File | Settings | File Templates.
 */


// There is a fucking problem that JSONStr actually a JSONObject!

module.exports = {
    user_login_builder : function(msg_id, user) {
        var JSONObj = {'msg_id':msg_id, 'status':'ok'};
        JSONObj.user = {'user_id':user.user_id,'user_data':user.user_data};
        return JSONObj;
    },
    create_match_builder : function(msg_id, status, msg, match) {
        var JSONObj = {'msg_id':msg_id,'status':status};
        if(status == 'error'){
            JSONObj.msg = msg;
        }else{
            JSONObj.match = {'match_id':match['match_id'],'players':match['players'],'match_data':match['match_data']};
        }
        console.dir(JSONObj);
        return JSONObj;
    },
    create_match_push_builder : function(match){
        var JSONObj = {'msg_id':-1, 'type':'invited_match'};
        JSONObj.match = {'match_id':match['match_id'],'players':match['players'],'match_data':match['match_data']};
        console.dir(JSONObj);
        return JSONObj;
    },
    join_match_push_builder : function(match){
        var JSONObj = {'msg_id':-1, 'type':'join_match'};
        JSONObj.match = {'match_id':match['match_id'],'players':match['players']};
        console.dir(JSONObj);
        return JSONObj;
    },
    leave_match_push_builder : function(match){
        var JSONObj = {'msg_id':-1, 'type':'leave_match'};
        JSONObj.match = {'match_id': match['match_id'],'players':match['players']};
        console.dir(JSONObj);
        return JSONObj;
    },
    illegal_json_builder : function(msg_id,msg){
        var JSONObj = {'msg_id':msg_id,'status':'error','msg':msg};
        console.dir(JSONObj);
        return JSONObj;
    },
    response_json_builder : function(msg_id){
        var JSONObj = {'msg_id':msg_id, 'status':'ok'};
        console.dir(JSONObj);
        return JSONObj;
    },
    submit_match_push_builder : function(user_id,match){
        var JSONObj = {'msg_id':-1, 'type':'update_match'};
        JSONObj.match = {'match_id':match.match_id,'from_opponent':user_id,'match_data':match.match_data};
        console.dir(JSONObj);
        return JSONObj;
    },
    get_matches_builder : function(msg_id, matches){
        var JSONObj = {'msg_id':msg_id, 'status':'ok'};
        //should we use clone to avoid reference problem?
        JSONObj.matches = [];
        for(var i =0;i<matches.length;i++){
            JSONObj.matches[i] = {'match_id':matches[i].match_id,'players':matches[i].players,'match_data':matches[i].match_data};
        }
        console.dir(JSONObj);
        return JSONObj;
    },
    online_players_builder : function(msg_id, opponents){
        var JSONObj = {'msg_id' : msg_id, 'status' : 'ok'};
        JSONObj.opponents = [];
        for(var i=0;i<opponents.length;i++){
            JSONObj.opponents[i] = {'user_id':opponents[i].user_id,'user_data':opponents[i].user_data};
        }
        console.dir(JSONObj);
        return JSONObj;
    }
}