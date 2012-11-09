/**
 * Created with JetBrains WebStorm.
 * User: Carmack.Shi <baoxu.shi@gmail.com>
 * Date: 12-11-8
 * Time: 下午4:06
 * To change this template use File | Settings | File Templates.
 */

var clc = require('cli-color');
var info = clc.green;
var warning = clc.yellow.bold.bgCyan;
var error = clc.red.bold.bgBlack;
var time = clc.underline;
module.exports={
    info:function(msg){
        console.log(time("["+new Date()+"]")+" "+info(msg));
    },
    warn:function(msg){
        console.log(time("["+new Date()+"]")+" "+warning(msg));
    },
    error:function(msg){
        console.log(time("["+new Date()+"]")+" "+error(msg));
    }
};