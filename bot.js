var config = require('./lib/config');

var xmpp = require('simple-xmpp');

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
  console.log(from, ' chats ' + message);
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
    startupTimeout = setTimeout(ready, 100);
  }
  if(started){
    rules.forEach(function(rule){
      var match = rule.expression.exec(message);
      if(match){
        rule.handler({
          xmpp: xmpp,
          conference: conference,
          from: from,
          message: message,
          match: match
        });
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
