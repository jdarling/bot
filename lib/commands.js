var fs = require('fs');
var async = require('async');

var loadModule = function(module, rules, options){
  if(Array.isArray(module)){
    return rules.concat(module);
  }
  var type = typeof(module);
  if(type === 'object'){
    return rules.concat([module]);
  }
  if(type === 'function'){
    var res = module(options);
    var arr = Array.isArray(res)?res:[res];
    return rules.concat(arr);
  }
  return rules;
};

module.exports = function(options, callback){
  var rules = [];
  var rulesOptions = {
    rules: function(){
      return rules;
    },
    xmpp: options.xmpp,
    config: options.config
  };

  fs.readdir('./commands/', function(err, files){
    if(err){
      return callback(err);
    }
    var l = files.length, i;
    async.each(files, function(file, next){
      if(file[0] !== '.'){
        var f = require('../commands/'+file);
        rules = loadModule(f, rules, rulesOptions);
      }
      next();
    }, function(){
      callback(null, rules);
    });
  });
};
