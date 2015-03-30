var helpHandler = function(commands){
  return function helpHandler(options){
    var xmpp = options.xmpp;
    var conference = options.conference;
    var reply = options.reply;

    var helpText = commands().forEach(function(cmd){
      if(cmd.helpText){
        return cmd.helpText.split('\n').forEach(function(line){
          return reply(line);
        });
      }
      reply(cmd.name+' - '+cmd.expression);
      if(cmd.description){
        reply(cmd.description);
      }
    });
  };
};

module.exports = function(options){
  var commands = options.rules;
  return {
    name: 'Help Command',
    expression: /^help$/i,
    handler: helpHandler(commands)
  };
};
