/**
 * Created with JetBrains WebStorm.
 * User: bxshi
 * Date: 12-11-20
 * Time: AM10:18
 * To change this template use File | Settings | File Templates.
 */

var uuid = require("node-uuid");

module.exports = function(){
   var seeds = [];
   for(var i = 0; i< 16; i++){
       seeds[i] = Math.floor(Math.random()*0x0100);
   }
   return uuid.v4(seeds);
};