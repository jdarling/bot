var async = require('async');
var sift = require('sift');
var extend = require('./utils').extend;

var DEFAULT_MINUTE_BLOCK_SIZE = 15;

var makeStatFilter = function(stat, enforceExists){
  var res = {};
  var keys = Object.keys(stat);
  keys.forEach(function(key){
    var value = stat[key];
    var type = typeof(value);
    if(key === '$filter'){
      if(enforceExists){
        Object.keys(value).forEach(function(key){
          return res[key]=value[key];
        });
      }
      return;
    }
    if(type==='string'){
      return res[key]=value;
    }
    if(type==='object'){
      if(value.field){
        key = value.field;
      }
      if(value.matches){
        return res[key]=value.matches;
      }
      if(enforceExists){
        return res[key]={$exists: true};
      }
    }
  });
  return res;
};

var defaultAggregationHandlers = {
  min: function(c, v){
    if(!c){
      return v;
    }
    if(c > v){
      return v;
    }
    return c;
  },
  max: function(c, v){
    if(!c){
      return v;
    }
    if(c < v){
      return v;
    }
    return c;
  },
  sum: function(c, v){
    if(!c){
      return parseFloat(v)||0;
    }
    return c += parseFloat(v)||0;
  },
  count: function(c){
    if(!c){
      return 1;
    }
    return c+1;
  }
};

var getAggreateFunctions = function(aggregates){
  return aggregates.map(function(agg){
    var type = typeof(agg);
    if(type==='string'){
      if(defaultAggregationHandlers[agg]){
        return {key: agg, f: defaultAggregationHandlers[agg]};
      }
      throw new Error('Unknown aggreagtion type: '+agg);
    }
    if(type==='object'){
      if(typeof(agg.name)==='string'&&typeof(agg.calc)==='function'){
        return {
            key: agg.name,
            f: agg.calc
          };
      }
    }
    return {};
  });
};

var getValue = function(path, src){
  var o = src;
  var parts = path.split('.');
  while(o && parts.length>0){
    o = o[parts.shift()];
  }
  return o;
};

var getStatSteps = function(stat, key, steps){
  var val = stat[key];
  var type = typeof(val);

  if(type==='string'){
    return steps.push(function(src){
      src[key] = val;
    });
  }

  if(type==='object'){
    if(val.as){
      return steps.push(function(src){
        src[key] = val.as;
      });
    }

    if(val.aggregate){
      var aggregates = getAggreateFunctions(val.aggregate instanceof Array?val.aggregate:[val.aggregate]);
      return steps.push(function(src, data){
        var v = getValue(val.field||key, data);
        if(typeof(src[key])!=='object'){
          src[key] = {};
        }
        aggregates.forEach(function(agg){
          if(typeof(agg.f)==='function'){
            try{
              src[key][agg.key] = agg.f(src[key][agg.key], v, data);
            }catch(e){
              console.log('ERROR: ', e);
              console.log('STACK: ', e.stack);
              console.log('STAT: ', agg.key);
              console.log('F:', agg.f.toString());
              console.log('DATA: ', data);
              throw (e);
            }
          }
        });
      });
    }

    if(val.field){
      return steps.push(function(src, data){
        src[key] = getValue(val.field, data);
      });
    }
  }
};

var makeStatEnricher = function(stat){
  var keys = Object.keys(stat);
  var steps = [];
  keys.forEach(function(key){
    getStatSteps(stat, key, steps);
  });

  return function(src, data){
    var res = extend(true, {}, src);
    steps.forEach(function(step){
      step(res, data);
    });
    return res;
  };
};

var getMinuteBlock = function(fromTime, minutes){
  var timeBlock = new Date(fromTime);
  minutes = minutes&&minutes>0?minutes:DEFAULT_MINUTE_BLOCK_SIZE;
  timeBlock.setSeconds(0);
  timeBlock.setMilliseconds(0);
  timeBlock.setMinutes((~~(timeBlock.getMinutes()/minutes))*minutes);
  return timeBlock;
};

var getDateBlock = function(fromTime){
  var date = new Date(fromTime);
  date.setHours(0);
  date.setMinutes(0);
  return date;
};

var checkAddItem = function(agg, data, nextItem){
  var logError = function(){
    if(agg.options.logger){
      return agg.options.logger.error.apply(agg.options.logger, arguments);
    }
    var args = Array.prototype.slice.call(arguments);
    args.unshift('ERROR:');
    return console.log.apply(console, args);
  }.bind(this);

  var matches = [];
  var aData = data instanceof Array?data:[data];
  agg.stats.forEach(function(stat){
    if(sift(stat.recFilter, aData).length>0){
      matches.push(stat);
    }
  });
  if(matches.length===0){
    return process.nextTick(nextItem);
  }
  // Create the entry time member
  var timeBlock = getMinuteBlock(data.time, data.aggregateByMinutes||DEFAULT_MINUTE_BLOCK_SIZE);
  // Create the date entry member
  var date = getDateBlock(timeBlock);

  return async.each(matches, function(match, next){
    var filter = extend(true, {key: match.key, date: date, time: timeBlock}, match.filter);
    agg.store.asArray({filter: filter}, function(err, records){
      records = records[records.root]||records;
      var rec = (records.length>0)?records[0]:{key: match.key, name: match.name, date: date, time: timeBlock, processed: []};
      var id = rec._id;

      if(data._id){
        var srcId = data._id.toString();

        if(rec.processed.indexOf(srcId)>-1){
          return next();
        }
        rec.processed.push(srcId);
      }
      rec = match.enrich(rec, data);

      if(id){
        return agg.store.update(id, rec, function(err){
          if(err){
            logError(err);
          }

          return next();
        });
      }
      return agg.store.insert(rec, function(err){
        if(err){
          logError(err);
        }

        return next();
      });
    });
  }, nextItem);
};

var getStatName = function(key, stat){
  if(!stat.name){
    return key.replace(/[^a-z0-9]+/gi, ' ').toLowerCase()
        .replace(/\s(.)/g, function($1) { return $1.toUpperCase(); })
        .replace(/\s/g, '')
        .replace(/^(.)/, function($1) { return $1.toLowerCase(); });
  }
  return stat.name;
};

var Aggregator = function(options){
  var collectStats = options.stats;
  var stats = this.stats = [];

  this.options = options;
  this.store = options.store;

  Object.keys(collectStats).forEach(function(key){
    stats.push({
      name: getStatName(key, collectStats[key]),
      key: key,
      rule: collectStats[key],
      recFilter: makeStatFilter(collectStats[key], true),
      filter: makeStatFilter(collectStats[key]),
      enrich: makeStatEnricher(collectStats[key])
    });
  });
  var q = this.q = async.queue(function(data, next){
    checkAddItem(this, data, next);
  }.bind(this), 1);
};

Aggregator.prototype.push = function(record){
  this.q.push(record);
};

Aggregator.prototype.processing = function(){
  return this.q.length();
};

Aggregator.prototype.drain = function(handler){
  this.q.drain = handler;
};

module.exports = {
  Aggregator: Aggregator
};
