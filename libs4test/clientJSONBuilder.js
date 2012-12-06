/**
 * Created with JetBrains WebStorm.
 * User: bxshi
 * Date: 12-11-13
 * Time: PM12:11
 * Construct json object for sending request.
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
    change_profile_builder : function(user_id, user_data){
        var JSONObj = {'msg_id' : 11, 'type':'change_profile'};
        JSONObj.user = {};
        if(user_id){
            JSONObj.user.user_id = user_id;
        }
        if(user_data){
            JSONObj.user.user_data = user_data;
        }
        return JSONObj;
    },
    bot_match_builder : function(msg_id,game, user){
        var JSONObj = {'msg_id':msg_id, 'type':"bot_match", 'game':game,'max_players':2, 'create_method':"auto"};
        JSONObj.user = user;
        return JSONObj;
    },
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
    submit_match_builder : function(user,match){
        var JSONObj = {'msg_id':4,'type':"submit_match",'game':"test_game"};
        if(user){
            JSONObj.user = user;
        }
        if(match){
            JSONObj.match = match;
        }
        return JSONObj;
    },
    get_matches_builder : function(user){
        var JSONObj = {'msg_id':5,'type':"get_matches",'game':"test_game"};
        if(user){
            JSONObj.user = user;
        }
        return JSONObj;
    },
    online_players_builder : function(user){
        var JSONObj = {'msg_id':6, 'type':"online_players"};
        if(user){
            JSONObj.user = user;
        }
        return JSONObj;
    },
    push_response_builder : function(push_id){
        var JSONObj = {'msg_id':-1, 'type':'push_response', 'push_id':push_id};
        return JSONObj;
    }
};