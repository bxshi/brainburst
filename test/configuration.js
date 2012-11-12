/**
 * Created with JetBrains WebStorm.
 * User: bxshi
 * Date: 12-11-9
 * Time: AM10:00
 * To change this template use File | Settings | File Templates.
 */

exports.testConfig = {
  wsUrl :   "ws://127.0.0.1",
  wsPort:   "9876"
};

exports.mongo = {
    host : '127.0.0.1',
    port : 27017,
    db : 'letter_press_test',
    options : {
        auto_reconnect : true
    }

};

exports.redis = {
    host : '127.0.0.1',
    port : 6379,
    options : {
        database : 'letter_press_test'
    },
    redisPushDB : 1
}