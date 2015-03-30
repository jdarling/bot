var echoHandler = function(options){
  var xmpp = options.xmpp;
  var conference = options.conference;
  var from = options.from;
  var message = options.message;
  var reply = options.reply;

  var msg = message.replace(/^echo/i, '').trim();
  return reply(from+' said "'+msg+'"');
};

module.exports = [
  {
    name: 'Echo Command',
    expression: /^echo(.*)/,
    handler: echoHandler
  }
];
