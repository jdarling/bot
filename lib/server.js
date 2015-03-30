var logger = require('../lib/logger');
var fs = require('fs');
var Hapi = require('hapi');
var util = require('util');
var utils = require('./utils');
var path = require('path');
var config = require('./config');
var apiConfig = utils.defaults(config.api, {route: '/api/v1/'});
var pluginsPath = path.resolve(config.pluginsPath||(__dirname+'/../plugins/'));
var async = require('async');
var pjson = require('../package.json');
var webconfig = utils.defaults(config.web, {port: 8080, host: '0.0.0.0'});

var PORT = webconfig.port;
var HOST = webconfig.host;

var server = new Hapi.Server();

server.connection({host: HOST, port: PORT});

server.on('internalError', function(e){
  logger.error(e);
});

var started = function(){
  logger.info(pjson.name+' website started on http://'+HOST+':'+PORT);
};
server.start(started);module.exports = server;