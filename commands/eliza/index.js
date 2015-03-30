var Eliza = require('./eliza');
var eliza = new Eliza(true);
var config = require('../../lib/config');

var handler = function(options){
  if(options.handled){
    return;
  }
  var xmpp = options.xmpp;
  var conference = options.conference;
  var from = options.from;
  var message = options.message;
  var reply = options.reply;

  if(message.match(/^bot\s/i)){
    return reply(eliza.transform(message.replace(/^bot\s/i, '').trim()));
  }
  if(from !== config.nick){
    return reply(eliza.transform(message));
  }
};

module.exports = [
  {
    name: 'Eliza Bot',
    expression: /.*/,
    handler: handler,
    priority: -2
  }
];
