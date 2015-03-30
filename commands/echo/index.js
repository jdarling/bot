var echoHandler = function(options){
  var xmpp = options.xmpp;
  var conference = options.conference;
  var from = options.from;
  var message = options.message;

  var msg = message.replace(/^echo/i, '').trim();
  xmpp.send(conference, from+' said "'+msg+'"', true);
};

module.exports = [
  {
    name: 'Echo Command',
    expression: /^echo(.*)/,
    handler: echoHandler
  }
];
