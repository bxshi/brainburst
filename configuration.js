/**
 * Created with JetBrains WebStorm.
 * User: Carmack.Shi <baoxu.shi@gmail.com>
 * Date: 12-11-2
 * Time: 下午4:26
 * To change this template use File | Settings | File Templates.
 */

module.exports = function(){
    switch(process.env.NODE_ENV){
        case 'deployment':
            return {}
        case 'development':
            return {
                WebSocketPort   :   9876,
                mongo:{
                    host : '127.0.0.1',
                    port : 27017,
                    db : 'letter_press_test',
                    options : {
                        auto_reconnect : true
                    }
                },
                redisHost    :   '127.0.0.1',
                redisPort    :   6379,
                redisConnectionPoolDB : 0,
                redisPushDB : 1,
                mongoHost    :   '127.0.0.1',
                mongoPort  :    27017,
                mongoDB :   'user'
            }
        default:
    }
}