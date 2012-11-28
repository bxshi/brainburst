/**
 * Created with JetBrains WebStorm.
 * User: bxshi
 * Date: 12-11-27
 * Time: AM11:12
 * To change this template use File | Settings | File Templates.
 */

var wsconf = require("../libs4test/configuration.js").websocket;
var wsCreator = require("../libs4test/client.js");
var jsonBuilder = require("../libs4test/clientJSONBuilder.js");
var ce = require("cloneextend");
var zlib = require("zlib");
var messageHandler = require("./libs/ClientMessageHandler.js");
var msgHandler = new messageHandler();

var mongo = require('../libs/MongoDBConnection.js');
var mongoClient = new mongo.MongoDBConnection({
    host : '127.0.0.1',
    port : 27017,
    db : 'letter_press_bot',
    options : {
        auto_reconnect : true
    }
});

var bot = require("./libs/BotDAO.js");
var botDAO = new bot.BotDAO(mongoClient);

var msg_id_cnt = 0;

var wsClient = wsCreator("ws://125.39.25.101", wsconf.port, wsconf.protocol);
var botInfo = {};
wsClient.on('connect', function(connection){
    console.log("connected");
    var JSON2Send = JSON.stringify(jsonBuilder.user_login_builder(null,{'nickname':'I\'m not a bot'}));
    zlib.gzip(JSON2Send, function(err, buffer){
       if(!err){
           connection.sendBytes(buffer);
       }
    });
    connection.on('message', function(message){
        console.log("got data");
        if(message.type == 'binary') {
            console.log("got binary data");
            zlib.unzip(message.binaryData, function(err, buffer){
               if(!err){
                   message.utf8Data = buffer.toString();
                   console.log("got data "+message.utf8Data);
                   msgHandler.route(connection, message.utf8Data);
               }
            });
        }
    });

    msgHandler.on('UserLogin', function(connection, JSONmsg){//logged in
        console.log("logged in");
        //save user data
        botInfo.user = ce.clone(JSONmsg.user);

        //get matches
        var JSON2Send = JSON.stringify(jsonBuilder.bot_match_builder(123,'letterpress', botInfo.user));
        console.log("try get waiting matches");
        zlib.gzip(JSON2Send, function(err, buffer){
           if(!err){
               connection.sendBytes(buffer);
           }
        });

        setInterval(function(){
            //get matches
            var JSON2Send = JSON.stringify(jsonBuilder.bot_match_builder(123,'letterpress', botInfo.user));
            console.log("try get waiting matches");
            zlib.gzip(JSON2Send, function(err, buffer){
                if(!err){
                    connection.sendBytes(buffer);
                }
            });
        }, 10000);

    });



    msgHandler.on('BotMatch', function(connection, JSONmsg){//deal with match
        console.log("botmatch");

        if(JSONmsg.msg){
            console.log("sorry, no waiting players");
        }else{
            //got game, figure out if it is already played.

            if(JSONmsg.match&&JSONmsg.match.match_data){
                var letters = JSONmsg.match.match_data.letters;
                var letter_stats = JSONmsg.match.match_data.letter_stats;
                var played_words = JSONmsg.match.match_data.played_words;
                var played = false;
                for(var i in letter_stats){
                    if (letter_stats[i] !=0 && letter_stats[i] < 3){
                        played = true;
                    }
                }
                console.log(played);
                if(played){

                    //sort game data
                    var letterOwner = {};
                    var letterPos = {};
                    for(var i =0; i<letters.length;i++){
                        if(letterOwner[letters[i]]){
                            letterOwner[letters[i]][letterOwner[letters[i]].length] = letter_stats[i];
                            letterPos[letters[i]][letterPos[letters[i]].length] = i;
                        }else{
                            letterOwner[letters[i]] = [];
                            letterPos[letters[i]] = [];
                            letterOwner[letters[i]][0] = letter_stats[i];
                            letterPos[letters[i]][0] = i;

                        }
                    }

                    console.dir(letterOwner);
                    console.dir(letterPos);

                    botDAO.findWord('lp',letters.toLowerCase(), function(docs){
                        var cnt = Math.random();
                        cnt = Math.round(cnt*docs.length);
                        docs[0] = docs[cnt]['word'].toUpperCase();
                        console.log(docs[0]);
                        var word_pos = [];
                        for(var i=0;i<docs[0].length;i++){
                            console.log("docs[0][i]"+docs[0][i]);
                            console.log("1:"+letterOwner[docs[0][i]].indexOf(1)+" 0:"+letterOwner[docs[0][i]].indexOf(0)+" 2:"+letterOwner[docs[0][i]].indexOf(2));
                            var pos = letterOwner[docs[0][i]].indexOf(1);
                            if(pos==-1){
                                pos = letterOwner[docs[0][i]].indexOf(0);
                                if(pos==-1){
                                    pos = letterOwner[docs[0][i]].indexOf(2);
                                }
                            }
                            console.log("pos :"+pos);
                            var delpos = pos;

                            pos = letterPos[docs[0][i]][pos];
                            console.log("real pos:"+ pos);

                            letterPos[docs[0][i]].splice(delpos,1);
                            letterOwner[docs[0][i]].splice(delpos,1);

                            letter_stats[pos] = 3;
                            word_pos[i] = pos;
                        }
                        console.log("word_pos:"+JSON.stringify(word_pos));
                        if(!played_words[botInfo.user.user_id]){
                            //has this tuple
                            played_words[botInfo.user.user_id]=[];
                        }
                        played_words[botInfo.user.user_id][played_words[botInfo.user.user_id].length] = {'word':docs[0], 'index':word_pos};
                        console.log(JSON.stringify(played_words));
                        //send data

                        var JSON2Send = {
                            'msg_id' : msg_id_cnt++,
                            'type' : "submit_match",
                            'user' : botInfo.user,
                            'game' : "letterpress",
                            'match' : {
                                'match_id' : JSONmsg.match.match_id,
                                'match_data' : {
                                    'letters' : letters,
                                    'letter_stats' : letter_stats,
                                    'played_words' : played_words,
                                    'last_player' : botInfo.user.user_id
                                }
                            }
                        };

                        JSON2Send = JSON.stringify(JSON2Send);
                        console.log("send json "+JSON2Send);

                        zlib.gzip(JSON2Send, function(err, buffer){
                           if(!err){
                               connection.sendBytes(buffer);
                           }
                        });

                    });
                }
            }
        }
    });

    msgHandler.on('UpdateMatch', function(connection, JSONmsg){//check if it is opponents' turn, if not, submit match data
        console.log("update match");
        if(JSONmsg.match&&JSONmsg.match.from_opponent!=botInfo.user.user_id){
            var letters = JSONmsg.match.match_data.letters;
            var letter_stats = JSONmsg.match.match_data.letter_stats;
            var played_words = JSONmsg.match.match_data.played_words;

            //sort game data
            var letterOwner = {};
            var letterPos = {};
            var letters_to_find = "";

            var ended = true;
            for(var i=0;i<letter_stats.length;i++){
                if(letter_stats[i] == 0){
                    ended = false;
                }
            }

            if(ended == true){
                return;
            }

            for(var i =0; i<letters.length;i++){
                if(letter_stats[i]<4){
                    letters_to_find+= letters[i];
                }
                if(letterOwner[letters[i]]){
                    letterOwner[letters[i]][letterOwner[letters[i]].length] = letter_stats[i];
                    letterPos[letters[i]][letterPos[letters[i]].length] = i;
                }else{
                    letterOwner[letters[i]] = [];
                    letterPos[letters[i]] = [];
                    letterOwner[letters[i]][0] = letter_stats[i];
                    letterPos[letters[i]][0] = i;

                }
            }

            if(letters_to_find.length < 3){
                letters = "";
                for(var i=0;i<letters.length;i++){
                    if(letter_stats[i]<4){
                        letters_to_find+= letters[i];
                    }else{
                        if (Math.random() > 0.5){
                            letters_to_find +=letters[i];
                        }
                    }
                }
            }

            console.log("ltf is:"+letters_to_find);


            botDAO.findWord('lp',letters_to_find.toLowerCase(), function(docs){
                if(docs.length == 0){
                    throw "fuck no word!";
                }
                var cnt = Math.random();
                cnt = Math.round(cnt*docs.length);
                docs[0] = docs[cnt]['word'].toUpperCase();
                var word_pos = [];
                for(var i=0;i<docs[0].length;i++){
                    var pos = letterOwner[docs[0][i]].indexOf(1);
                    if(pos == -1){
                        pos = letterOwner[docs[0][i]].indexOf(0);
                        if(pos == -1){
                            pos = letterOwner[docs[0][i]].indexOf(2);
                            if(pos == -1){
                                pos = letterOwner[docs[0][i]].indexOf(3);
                                if(pos == -1){
                                    pos = letterOwner[docs[0][i]].indexOf(4);
                                }
                            }
                        }
                    }
                    console.log("pos :"+pos);
                    var delpos = pos;

                    pos = letterPos[docs[0][i]][pos];
                    console.log("real pos:"+ pos);

                    letterPos[docs[0][i]].splice(delpos,1);
                    letterOwner[docs[0][i]].splice(delpos,1);

                    letter_stats[pos] = 3;
                    word_pos[i] = pos;
                }
                if(!played_words[botInfo.user.user_id]){
                    //has this tuple
                    played_words[botInfo.user.user_id]=[];
                }
                played_words[botInfo.user.user_id][played_words[botInfo.user.user_id].length] = {'word':docs[0], 'index':word_pos};

                //send data

                var JSON2Send = {
                    'msg_id' : msg_id_cnt++,
                    'type' : "submit_match",
                    'user' : botInfo.user,
                    'game' : "letterpress",
                    'match' : {
                        'match_id' : JSONmsg.match.match_id,
                        'match_data' : {
                            'letters' : letters,
                            'letter_stats' : letter_stats,
                            'played_words' : played_words,
                            'last_player' : botInfo.user.user_id
                        }
                    }
                };

                JSON2Send = JSON.stringify(JSON2Send);
                console.log("send "+JSON2Send);

                zlib.gzip(JSON2Send, function(err, buffer){
                    if(!err){
                        connection.sendBytes(buffer);
                    }
                });
            });
        }

    });

    msgHandler.on('LeaveMatch', function(connection, JSONmsg){//if others leave this match, bot will leave, too.
    });

});