/**
 * Created with JetBrains WebStorm.
 * User: bxshi
 * Date: 12-11-12
 * Time: PM5:04
 * To change this template use File | Settings | File Templates.
 */
var should = require("should");
var testConf = require("./configuration.js").testConfig;

describe('- Websocket connection test', function(){
    it('* Should establish connection correctly(with right protocol)', function(done){
        var res;
        var wsClient = create_ws_client(testConf.wsUrl+':'+testConf.wsPort,'brain_burst');
        wsClient.on('connect', function(connection){
            res = true;
            res.should.be.true;
            done();
        });
        wsClient.on('connectFailed', function(error){
            res = false;
            res.should.be.true;
            done();
        });
    });
    it('* Should establish connection correctly(with right protocol in a protocol list)', function(done){
        var res;
        var wsClient = create_ws_client(testConf.wsUrl+':'+testConf.wsPort,['brain_burst','foobar']);
        wsClient.on('connect', function(connection){
            res = true;
            res.should.be.true;
            done();
        });
        wsClient.on('connectFailed', function(error){
            res = false;
            res.should.be.true;
            done();
        });
    });
    it('* Should disconnected by server.(without protocol)(also, that may crash server if there is not a protocol validation)', function(done){
        var res;
        var wsClient = create_ws_client(testConf.wsUrl+':'+testConf.wsPort);
        wsClient.on('connect', function(connection){
            res = true;
            res.should.be.false;
            done();
        });
        wsClient.on('connectFailed', function(error){
            res = false;
            res.should.be.false;
            done();
        });
    });
    it('* Should disconnected by server.(with a empty protocol list)',function(done){
        var res;
        var wsClient = create_ws_client(testConf.wsUrl+':'+testConf.wsPort,[]);
        wsClient.on('connect', function(connection){
            res = true;
            res.should.be.false;
            done();
        });
        wsClient.on('connectFailed', function(error){
            res = false;
            res.should.be.false;
            done();
        });
    });
    it("* non-json string", function(){
        var res;
        var wsClient = create_ws_client(testConf.wsUrl+':'+testConf.wsPort, 'brain_burst');
        wsClient.on('connect', function(connection){
            connection.sendUTF('I\'m not a json string');
            connection.on('disconnect', function(message){
                res = false;
                res.should.not.true;
                done();
            });
        });
    });

});

//test functions

function create_ws_client(url,protocol) {
    var WebSocketClient = require("../node_modules/websocket/lib/WebSocketClient.js");
    var args = {
        secure:false
    };
    var wsClient = new WebSocketClient();
    wsClient.connect(url, protocol);
    return wsClient;
}