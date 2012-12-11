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
            var date = new Date();
            console.log(time("["+date+"]")+"["+process.pid+"] "+debug(msg));
            msg = null;
        }
        date = null;
    },
    info:function(msg){
        var date = new Date();
            console.log(time("["+date+"]")+"["+process.pid+"] "+info(msg));
        msg = null;
        date = null;
    },
    warn:function(msg){
        var date = new Date();
        console.log(time("["+date+"]")+"["+process.pid+"] "+warning(msg));
        msg = null;
        date = null;
    },
    error:function(msg){
        var date = new Date();
        console.log(time("["+date+"]")+"["+process.pid+"] "+error(msg));
        msg = null;
        date = null;
    }
};