/**
 * Created with JetBrains WebStorm.
 * User: Carmack.Shi <baoxu.shi@gmail.com>
 * Date: 12-11-2
 * Time: 下午4:26
 * To change this template use File | Settings | File Templates.
 */

module.exports = function(environment){
    switch(environment){
        case 'deployment':
            return {}
        case 'development':
            return {
                WebSocketPort   :   9876
            }
        default:
    }
}