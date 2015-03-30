var helpHandler = function(commands){
  return function helpHandler(options){
    var xmpp = options.xmpp;
    var conference = options.conference;
    var helpText = commands().forEach(function(cmd){
      if(cmd.helpText){
        return cmd.helpText.split('\n').forEach(function(line){
          xmpp.send(conference, line, true)
        });
      }
      xmpp.send(conference, cmd.name+' - '+cmd.expression, true);
      if(cmd.description){
        xmpp.send(conference, cmd.description, true);
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
