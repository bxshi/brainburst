/**
 * Created with JetBrains WebStorm.
 * User: bxshi
 * Date: 12-11-27
 * Time: PM2:11
 * To change this template use File | Settings | File Templates.
 */


var fs = require('fs');
var mongo = require('../../libs/MongoDBConnection.js');
var mongoClient = new mongo.MongoDBConnection({
    host : '127.0.0.1',
    port : 27017,
    db : 'letter_press_bot',
    options : {
        auto_reconnect : true
    }
});

var bot = require("./BotDAO.js");
var botDAO = new bot.BotDAO(mongoClient);
//botDAO.ensureIndex('lp');
fs.readFile('../dicts/wordDict.txt', 'utf8', function(err, data){
   if(err){
       throw err;
   }else{
       var lines = data.split('\n');
       var JSONLines = [];
       for(var i=0;i<lines.length;i++){
           JSONLines[i] = {};
           JSONLines[i].word = lines[i];
           for(var j='a'.charCodeAt(0);j<='z'.charCodeAt(0);j++){
               var t =  lines[i].match(new RegExp(String.fromCharCode(j),'g'));
               if(t){
                   JSONLines[i][String.fromCharCode(j)] =t.length;
               }else{
                   JSONLines[i][String.fromCharCode(j)] = 0;
               }
           }

           JSONLines[i]['length'] = lines[i].length;

           botDAO.insertWord('lp', JSONLines[i], function(){
               console.log("insert"+i+"ok");
           });
           console.log(i+"/"+lines.length);
       }
//        fs.writeFile('../dicts/wordJSON.txt', JSON.stringify(JSONLines));

   }
});