/**
 * Created with JetBrains WebStorm.
 * User: bxshi
 * Date: 12-11-13
 * Time: PM12:11
 * To change this template use File | Settings | File Templates.
 */

module.exports = {
    user_login_builder : function(user_id,user_data){
        var JSONObj = {'msg_id': 1, 'type':"user_login"};
        if(user_id){
            JSONObj.user = {'user_id':user_id};
        }
        if(user_data){
            JSONObj.user = {'user_data':user_data};
        }
        return JSONObj;
    },
    user_login_error_builder : function(){},
    create_match_builder : function(create_method,user,match,opponent){
        var JSONObj = {'msg_id': 2, 'type':"create_match",'game':"test_game",'max_players':2};
        if(create_method){
            JSONObj.create_method = create_method;
        }
        if(user){
            JSONObj.user = user;
        }
        if(match){
            JSONObj.match = match;
        }
        if(opponent){
            JSONObj.opponent_user_id = opponent;
        }
        return JSONObj;
    },
    create_match_error_builder : function(){},
    leave_match_builder : function(user,match_id){
        var JSONObj = {'msg_id': 3,'type':"leave_match",'game':"test_game"};
        if(user){
            JSONObj.user = user;
        }
        if(match_id){
            JSONObj.match={};
            JSONObj.match.match_id = match_id;
        }
        return JSONObj;
    },
    remove_match_error_builder : function(){},
    submit_match_builder : function(){},
    submit_match_error_builder : function(){},
    get_matches_builder : function(){},
    get_matches_error_builder : function(){},
    online_players_builder : function(){},
    online_players_error_builder : function(){}
};