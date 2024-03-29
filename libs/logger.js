/**
 * Created with JetBrains WebStorm.
 * User: Carmack.Shi <baoxu.shi@gmail.com>
 * Date: 12-11-8
 * Time: 下午4:06
 * Used for debug and log.
 */

var clc = require('cli-color');
var debug = clc.blue.underline;
var info = clc.green;
var warning = clc.yellow.bold.bgCyan;
var error = clc.red.bold.bgBlack;
var time = clc.underline;
module.exports={
    debug:function(msg){
        if(process.env.NODE_ENV=='development'){
            console.log(time("["+new Date()+"]")+"["+process.pid+"] "+debug(msg));
        }
    },
    info:function(msg){
            console.log(time("["+new Date()+"]")+"["+process.pid+"] "+info(msg));
    },
    warn:function(msg){
        console.log(time("["+new Date()+"]")+"["+process.pid+"] "+warning(msg));
    },
    error:function(msg){
        console.log(time("["+new Date()+"]")+"["+process.pid+"] "+error(msg));
    }
};