/**
 * Created with JetBrains WebStorm.
 * User: bxshi
 * Date: 12-11-28
 * Time: PM12:57
 * To change this template use File | Settings | File Templates.
 */


var Bots = require("./BotConfig.js").BotConfigs;

var cluster = require('cluster');

if(cluster.isMaster){
    var workersConcurrency = 3;
    var workers = [];

    var botShiftingLeave = function(){
        if(workers.length){
            for(var i = 0; i< workers.length;i++){//kill all bots
                console.dir(workers[i]);
                workers[i].send('suicide');
                //workers[i].destroy();
            }
            setTimeout(botShiftingWork, 4000);
        }else{
            botShiftingWork();
        }
    };

    var botShiftingWork = function(){
        console.log("=========Shifting Start=========");
        console.log("=========New Bots will start working=========");
        for(var i = 0; i< workersConcurrency;i++){//kill bots and restart a new one
            //workers[i] = null;
            delete workers[i];
            workers[i] = cluster.fork({'id':Math.round(Math.random()*100) % Bots.length});
        }
        console.log("=========Shifting End=========");
    };

    setInterval(botShiftingLeave, 1800000); //leave after 30mins

    botShiftingLeave();

}else{

    var wsCreator = require("../../libs4test/client.js");
    var logger = require("../../libs/logger.js");
    var zlib = require("zlib");
    var ce = require("cloneextend");
    var jsonBuilder = require("../../libs4test/clientJSONBuilder.js");
    var messageHandler = require("../../libs/ClientMessageHandler.js");
    var msgHandler = new messageHandler();

    //global suicide count
    var suicide_count = 0;

    var mongo = require('../../libs/MongoDBConnection.js');
    var mongoClient = new mongo.MongoDBConnection({
        host : '127.0.0.1',
        port : 27017,
        db : 'letter_press_bot',
        options : {
            auto_reconnect : true
        }
    });

    var bot = require("../../libs/BotDAO.js");
    var botDAO = new bot.BotDAO(mongoClient);

    var conn2Bot = {};

    Bots[process.env.id].client = wsCreator('ws://letterwords.textcutie.com', 9988, "brain_burst");
    Bots[process.env.id].client.on('connect', function(connection){
        conn2Bot[connection] = Bots[process.env.id];
        logger.info("Bot "+Bots[process.env.id].nickname+" invaded into game server!");
        var JSON2Send = JSON.stringify(jsonBuilder.user_login_builder(Bots[process.env.id].uuid,null));
        sendData(connection, JSON2Send);
        connection.on('message', function(message){
            logger.info("Bot "+Bots[process.env.id].nickname+" got a message");
            unzipData(connection, message.binaryData);
        });
        connection.on('error', function(error){
            logger.error('connection failed, error is "+error+" try reconnect');
            Bots[process.env.id].client = wsCreator('ws://125.39.25.101', 9876, "brain_burst");
        });
    });

    /*
     * send data via websocket (with gzip compression)
     */
    var sendData = function(connection, data){
        logger.warn("send json:"+data);
        zlib.gzip(data, function(err, buffer){
            if(!err){
                connection.sendBytes(buffer);
            }
        });
    };

    var unzipData = function(connection, data){
        zlib.unzip(data, function(err,buffer){
            if(!err){
                msgHandler.route(connection, buffer);
            }
        });
    };

    var gameValidation = function(user, JSONmsg){
        var game_started = false;
        var game_ended = true;

        if(JSONmsg.status == 'error'){
            logger.warn(JSONmsg.msg);
            return false;
        }

        if(JSONmsg.match.from_opponent && JSONmsg.match.from_opponent == user.user_id){
            return false;
        }



        for(var i = 0; i< JSONmsg.match.match_data.letter_stats.length;i++){
            if(JSONmsg.match.match_data.letter_stats[i]==0){
                game_ended = false;
            }else{
                game_started = true;
            }
        }

        if(JSONmsg.type == 'update_match' && JSONmsg.match.from_opponent != user.user_id && !game_ended){
            return true;
        }

        if(!game_started || game_ended){
            return false;
        }else{
            return true;
        }

    };

    var orgMatchData = function(JSONmsg){
        var organizedData = {
            'match_id' : JSONmsg.match.match_id,
            'letters' : JSONmsg.match.match_data.letters,
            'letter_stats' : JSONmsg.match.match_data.letter_stats,
            'played_words' : JSONmsg.match.match_data.played_words
        };

        organizedData.letterOwner = {};
        organizedData.letterPos = {};

        for(var i =0; i<organizedData.letters.length;i++){
            if(!organizedData.letterOwner[organizedData.letters[i]]){
                organizedData.letterOwner[organizedData.letters[i]] = [];
                organizedData.letterPos[organizedData.letters[i]] = [];
            }
            organizedData.letterOwner[organizedData.letters[i]][organizedData.letterOwner[organizedData.letters[i]].length] = organizedData.letter_stats[i];
            organizedData.letterPos[organizedData.letters[i]][organizedData.letterPos[organizedData.letters[i]].length] = i;
        }

        organizedData.lettersForNewWords = "";

        return organizedData;

    };

    var getLetters = function(priority,organizedData){

        for(var i=0;i<organizedData.letters.length;i++){
            if(organizedData.letter_stats[i] >0 && organizedData.letter_stats[i]<3){
                //opponents' tile
                if(priority == 'opponent' || Math.random() < 0.4){
                    organizedData.lettersForNewWords+=organizedData.letters[i];
                }
            }else if(organizedData.letter_stats[i] == 0){
                //empty' tile
                if(priority == 'empty' || Math.random() < 0.8){
                    organizedData.lettersForNewWords+=organizedData.letters[i];
                }
            }else{
                //my own tile
                if(Math.random() < 0.3){
                    organizedData.lettersForNewWords+=organizedData.letters[i];
                }
            }
        }

        return organizedData;

    };

    var constructJSON = function(user, organizedData){
        return JSON2Send = {
            'msg_id' : 0,
            'type' : "submit_match",
            'user' : user,
            'game' : 'letterpress',
            'match' : {
                'match_id' : organizedData.match_id,
                'match_data' : {
                    'letters' : organizedData.letters,
                    'letter_stats' : organizedData.letter_stats,
                    'played_words' : organizedData.played_words,
                    'last_player' : user.user_id
                }
            }
        }
    };

    var findWord = function(connection, priority, user, played_words, organizedData,mustIncludeWord, max_len, min_len){
        logger.error("lettersForNewWords :"+organizedData.lettersForNewWords);
        botDAO.findWord('lp', organizedData.lettersForNewWords.toLowerCase(), mustIncludeWord.toLowerCase(), max_len, min_len, function(words){

            if(words.length == 0){
                //no words here

                if(max_len >= 25 && min_len == 0 && organizedData.lettersForNewWords.length == 25 && mustIncludeWord == ""){
                    //pass this turn
                    if(!organizedData.played_words[user.user_id]){
                        organizedData.played_words[user.user_id] = [];
                    }

                    organizedData.played_words[user.user_id][organizedData.played_words[user.user_id].length] = {
                        'word' : "",
                        'index' : []
                    };

                    sendData(connection, JSON.stringify(constructJSON(user, organizedData)));
                    suicide_count--;
                }else if(mustIncludeWord!="" && organizedData.lettersForNewWords.length < 25){ // not get full of this
                    logger.warn("not find any words with a must have character "+mustIncludeWord+", try got words with more characters");
                    organizedData.lettersForNewWords = organizedData.letters;
                    findWord(connection, priority, user, played_words, organizedData, mustIncludeWord.toLowerCase(), 25,0);
                }else{
                    logger.warn("not find any words, try got any word that does not used.");
                    organizedData.lettersForNewWords = organizedData.letters;
                    findWord(connection, priority, user, played_words, organizedData, "", 25,0);
                }
            }else{
                var dup = true;
                var tried = 0;
                while (dup){
                    var word = words[Math.round(Math.random() * (words.length-1))]['word'].toUpperCase();
                    if (played_words.indexOf(word) == -1){
                        var played_words_string = JSON.stringify(played_words);
                        if(played_words_string.indexOf(word) == -1){
                            dup = false;
                        }
                    }
                    tried++;
                    if(tried > words.length){
                        //pass this turn
                        if(!organizedData.played_words[user.user_id]){
                            organizedData.played_words[user.user_id] = [];
                        }

                        organizedData.played_words[user_id][organizedData.played_words[user_id].length] = {
                            'word' : "",
                            'index' : []
                        };

                        sendData(connection, JSON.stringify(constructJSON(user, organizedData)));
                        suicide_count--;
                        return;
                    }
                }

                logger.error("choose word:"+word);

                var tileOrder = [];
                switch(priority){
                    case 'opponent':
                        tileOrder = [1,2,0,3,4];
                        break;
                    case 'empty':
                        tileOrder = [0,1,2,3,4];
                        break;
                    default:
                        tileOrder = [0,1,2,3,4];
                        break;
                }

                for(var i = 0; i< word.length;i++){
                    var pos = -1;
                    var j = 0;
                    while(pos == -1 && j < 5){
                        pos = organizedData.letterOwner[word[i]].indexOf(tileOrder[j++]);
                    }

                    var delpos = pos;

                    pos = organizedData.letterPos[word[i]][pos];
                    organizedData.letterPos[word[i]].splice(delpos,1);
                    organizedData.letterOwner[word[i]].splice(delpos,1);

                    if(organizedData.letter_stats[pos] != 2){//if it is unchangeable, ignore it
                        organizedData.letter_stats[pos] = 3;
                    }

                    if(!organizedData.word_pos){
                        organizedData.word_pos = [];
                    }
                    organizedData.word_pos[i] = pos;
                }

                if(!organizedData.played_words[user.user_id]){
                    organizedData.played_words[user.user_id] = [];
                }

                organizedData.played_words[user.user_id][organizedData.played_words[user.user_id].length] = {
                    'word' : word,
                    'index' : organizedData.word_pos
                };

                sendData(connection, JSON.stringify(constructJSON(user, organizedData)));
                suicide_count--;
            }
        });
    };

    var submit_match_logic = function(connection, JSONmsg){

        logger.info(JSON.stringify(JSONmsg));
        //check if it is bot's turn
        if(!gameValidation(conn2Bot[connection].user, JSONmsg)){
            return;
        }

        if(!conn2Bot[connection].matches){
            conn2Bot[connection].matches = {};
        }

        //save played words
        conn2Bot[connection].matches[JSONmsg.match.match_id] = ce.clone(JSONmsg.match.match_data.played_words);

        //find out which word to play

        //step1. reorganize data

        var reorganizedData = getLetters(conn2Bot[connection].priority,orgMatchData(JSONmsg));

        //step2. find word

        var playedWords = [];

        for(var i = 0; i < JSONmsg.match.match_data.played_words[JSONmsg.match.players[0].user_id].length; i++){
            playedWords[playedWords.length] = JSONmsg.match.match_data.played_words[JSONmsg.match.players[0].user_id][i]['word'];
        }
        if(JSONmsg.match.match_data.played_words[JSONmsg.match.players[1].user_id]){
            for(var i = 0; i < JSONmsg.match.match_data.played_words[JSONmsg.match.players[1].user_id].length; i++){
                playedWords[playedWords.length] = JSONmsg.match.match_data.played_words[JSONmsg.match.players[1].user_id][i]['word'];
            }
        }

        //step3. check non-occupied word, if only one, must included it.
        var ncpCount =0;
        var botCount = 0;
        var opponentCount = 0;
        var ncpPos = 0;
        for(var i = 0; i< reorganizedData.letter_stats.length;i++){
            if(reorganizedData.letter_stats[i] == 0){
                ncpCount++;
                ncpPos = i;
            }else if (reorganizedData.letter_stats[i] > 0 && reorganizedData.letter_stats[i]<3){
                opponentCount++;
            }else{
                botCount++;
            }
        }

        var mustIncludeWord = "";

        if(ncpCount == 1 && opponentCount <= botCount){//bot may win, so just finish the game!
            mustIncludeWord += reorganizedData.letters[ncpPos];
        }else if(conn2Bot[connection].priority == 'empty'){//may not win, so still follow the priority setting(this will lose:<)
            mustIncludeWord += reorganizedData.letters[ncpPos];
        }else{
            for(var i = 0; i< reorganizedData.letter_stats.length;i++){//just like the previous one, but this may win :)
                if(reorganizedData.letter_stats[i] > 0 && reorganizedData.letter_stats[i] < 2){
                    mustIncludeWord += reorganizedData.letters[i];
                    break;
                }
            }
        }

        findWord(connection, conn2Bot[connection].priority,conn2Bot[connection].user, playedWords, reorganizedData, mustIncludeWord.toLowerCase(), conn2Bot[connection]['max_len'],conn2Bot[connection]['min_len']);

    };

    var submit_match_logic_wrapper = function(connection, JSONmsg){
        suicide_count++;
        setTimeout(submit_match_logic, Math.round(Math.random() * 100000)%(conn2Bot[connection].response_interval)+10000, connection, JSONmsg);
    };

    msgHandler.on('UserLogin', function(connection, JSONmsg){
        console.log("bot "+JSONmsg.user.user_data.nickname+" logged in");
        conn2Bot[connection].user = ce.clone(JSONmsg.user);

        //after login, try get matches by interval

        setInterval(function(connection){
            logger.warn(conn2Bot[connection].nickname+" try check game");
            var JSON2Send = JSON.stringify(jsonBuilder.bot_match_builder(0, 'letterpress', conn2Bot[connection].user));
            sendData(connection, JSON2Send);
        }, conn2Bot[connection]['check_interval']+30000, connection);
    });

    msgHandler.on('BotMatch', submit_match_logic_wrapper);

    msgHandler.on('UpdateMatch', submit_match_logic_wrapper);

    msgHandler.on('GetMatches', function(connection, JSONmsg){
        //when login, firstly deal with this.
    });

    msgHandler.on('PushResponse', function(connection, JSONmsg){
        suicide_count++;
        if(JSONmsg.push_id){
            console.log("send push response");
            var JSON2Send = JSON.stringify(jsonBuilder.push_response_builder(JSONmsg.push_id));
            sendData(connection, JSON2Send);
        }
        suicide_count--;
    });

    process.on('message', function(msg){
       if(msg == 'suicide'){
           //got suicide message, try kill myself

           trySuicide();

       }
    });

    var trySuicide = function(){
        if(suicide_count == 0){
            process.kill(process.pid, 'SIGHUP');
        }else{
            logger.error("worker still working, delay destory for 1 min");
            setTimeout(trySuicide, 60000);
        }
    }

}