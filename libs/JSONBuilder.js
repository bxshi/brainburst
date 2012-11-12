/**
 * Created with JetBrains WebStorm.
 * User: bxshi
 * Date: 12-11-12
 * Time: PM12:03
 * To change this template use File | Settings | File Templates.
 */

module.exports = {
    user_login_builder : function() {
        return "{}";
        //TODO: add user_login_builder
    },
    create_match_builder : function(msg_id, status, msg, match) {
        var JSONStr = {'msg_id':msg_id,'status':status};
        if(status == 'error'){
            JSONStr.msg = msg;
        }else{
            JSONStr.match = {'match_id':match['match_id'],'players':match['players'],'match_data':match['match_data']};
        }
        console.dir(JSONStr);
        return JSON.stringify(JSONStr);
    },
    create_match_push_builder : function(match){
        var JSONStr = {'msg_id':-1, 'type':'invited_match'};
        JSONStr.match = {'match_id':match['match_id'],'players':match['players'],'match_data':match['match_data']};
        console.dir(JSONStr);
        return JSONStr;
    }
}