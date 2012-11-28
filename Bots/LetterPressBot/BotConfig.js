/**
 * Created with JetBrains WebStorm.
 * User: bxshi
 * Date: 12-11-28
 * Time: PM1:03
 * To change this template use File | Settings | File Templates.
 */

var BotConfigs = [
    {
        'uuid':"BOT_001",
        'nickname':"Carmack",
        'max_len' : 25,
        'min_len' : 4,
        "priority" : "opponent",
        'check_interval' : 15000,
        'response_interval' : 5000
    },
    {
        'uuid':"BOT_002",
        'nickname':"Alex",
        'max_len' : 8,
        'min_len' : 2,
        "priority" : "opponent",
        'check_interval' : 7000,
        'response_interval' : 8000
    }
];

exports.BotConfigs = BotConfigs;