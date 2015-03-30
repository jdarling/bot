var config = require('./lib/config');
var utils = require('./lib/utils');
var xmpp = require('simple-xmpp');

var processRequest = function(options){
  var caught = 0;
  rules.forEach(function(rule){
    var match = rule.expression.exec(options.message);
    if(match){
      var opts = utils.extend({
        match: match,
        handled: caught
      }, options, true);
      rule.handler(opts);
      caught++;
    }
  });
};

xmpp.on('online', function(data) {
  console.log('Connected with JID: ' + data.jid.user);
  (config.rooms||[]).forEach(function(room){
    console.log('Joining: ', room);
  xmpp.join(room);
  });

  setInterval(function() {
    xmpp.send(' ');
  }, 30000);
});

xmpp.on('chat', function(from, message) {
  processRequest({
    xmpp: xmpp,
    from: from,
    message: message,
    reply: function(message){
      return xmpp.send(from, message);
    }
  });
});

var started, startupTimeout;

var rules = [];

require('./lib/commands')({
  xmpp: xmpp,
  config: config
}, function(err, commands){
  if(err){
    console.error(err);
    return;
  }
  console.log('rules loaded:');
  console.log(commands.map(function(rule){
    return '  '+rule.name+' '+rule.expression;
  }).join('\n'));
  rules = commands;
});

xmpp.on('groupchat', function(conference, from, message, stamp) {
  var ready = function(){
    started = now;
    console.log('Listening');
    xmpp.send(conference, config.greeting||'Online', true);
  };
  var now = (new Date()).getTime();
  if(!started){
    if(startupTimeout){
      clearTimeout(startupTimeout);
    }
    startupTimeout = setTimeout(ready, 1000);
  }
  if(started){
    processRequest({
      xmpp: xmpp,
      conference: conference,
      from: from,
      message: message,
      reply: function(message){
        return xmpp.send(conference, message, true);
      }
    });
  }
});

xmpp.on('error', function(err) {
  console.error(err);
});

xmpp.on('subscribe', function(from) {
  console.log('subscription request: ', from);
});

xmpp.connect(config.connection);
