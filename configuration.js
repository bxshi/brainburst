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
            return {
                WebSocketPort   :   9988,
                mongo:{
                    host : '127.0.0.1',
                    port : 27017,
                    db : 'letter_press_deploy',
                    options : {
                        auto_reconnect : true
                    }
                },
                redis:{
                    host : '127.0.0.1',
                    port : 6379,
                    db : 3
                },
                redisConnectionPool:{
                    host:'127.0.0.1',
                    port:6379,
                    db : 5
                }
            }
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
                redis:{
                    host : '127.0.0.1',
                    port : 6379,
                    db : 3
                },
                redisConnectionPool:{
                    host:'127.0.0.1',
                    port:6379,
                    db : 5
                }
            }
        default:
            return null
    }
}