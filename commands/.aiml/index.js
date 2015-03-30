var AIMLInterpreter = require('./lib');
//var aiml = require('./lib');
var config = require('../../lib/config');
var glob = require('glob');
var engine;

var aimlInterpreter = new AIMLInterpreter((config||{}).aiml);

glob(__dirname+'/lists/**/*.aiml', function (er, files) {
  if(files){
    //console.log('Loading: ', files);
    aimlInterpreter.loadAIMLFilesIntoArray(files);
    /*
    aiml.parseFiles(files, function(err, topics){
      if(err){
        return console.error(err);
      }
      console.log('AIML Online');
      engine = new aiml.AiEngine('Default', topics, (config||{}).aiml);
    });
    */
  }
});

var processMessage = function(from, message, reply){
  /*
  if(engine){
    console.log('looking up', message);
    engine.reply({}, message, function(err, msg){
      if(err){
        return console.error(err);
      }
      reply(msg);
    });
  }
  //*/
  //*
  console.log('looking up', message);
  aimlInterpreter.findAnswerInLoadedAIMLFiles(message, function(answer, arr){
    reply(answer);// + ' | ' + arr);
  });
  //*/
};

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
    return processMessage(from, message.replace(/^bot\s/i, '').trim(), reply);
  }
  if(from !== config.nick){
    return processMessage(from, message, reply);
  }

};

module.exports = [
  {
    name: 'AIML Bot',
    expression: /.*/,
    handler: handler,
    priority: -1
  }
];
