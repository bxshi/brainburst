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
        'response_interval' : 15000
    },
    {
        'uuid':"BOT_002",
        'nickname':"Alex",
        'max_len' : 8,
        'min_len' : 2,
        "priority" : "empty",
        'check_interval' : 7000,
        'response_interval' : 18000
    },
    {
        'uuid':"BOT_003",
        'nickname':"熊本一郎",
        'max_len' : 25,
        'min_len' : 10,
        'priority' : "empty",
        'check_interval' : 11000,
        'response_interval' : 12000
    }
];

exports.BotConfigs = BotConfigs;