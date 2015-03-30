var sift = require('sift');
var extend = require('./utils').extend;

var uuid = (function(){
  var _iid = 0;
  return function(){
    var dt = new Date();
    var sid = '000000'+_iid;
    _iid++;
    return sid.substr(sid.length-6) + '-' + dt.getTime();
  };
})();

var reTrue = /^(true|t|yes|y|1)$/i;
var reFalse = /^(false|f|no|n|0)$/i;

var isTrue = function(value){
  return !!reTrue.exec(''+value);
};

var isFalse = function(value){
  return !!reFalse.exec(''+value);
};

var isNumeric = function(n){
  return !isNaN(parseFloat(n)) && isFinite(n);
};

var reformFilter = function(root){
  var keys = Object.keys(root), i, l=keys.length, key, value;
  for(i=0; i<l; i++){
    key = keys[i];
    if(key.match(/\_id$/)){
    }else{
      switch(typeof(root[key])){
        case('object'):
          reformFilter(root[key]);
          break;
        case('string'):
          // DateTime String: 2013-08-17T00:00:00.000Z
          if(root[key].match(/^\d{4}\-\d{2}\-\d{2}T\d{2}\:\d{2}\:\d{2}\.\d{3}Z$/i)){
            root[key] = new Date(root[key]);
          }else{
            value = root[key];
            if(isNumeric(value)){
              root[key] = +value;
            }else if(isTrue(value)){
              root[key] = true;
            }else if(isFalse(value)){
              root[key] = false;
            }
            switch(root[key].toLowerCase()){
              case("$today"):
                root[key] = new Date();
                root[key].setHours(0, 0, 0, 0);
                break;
              case("$yesterday"):
                root[key] = new Date();
                root[key].setDate(root[key].getDate() - 1);
                root[key].setHours(0, 0, 0, 0);
                break;
              case("$thisweek"):
                root[key] = getMonday(new Date());
                break;
              case("$thismonth"):
                root[key] = new Date();
                root[key].setDate(1);
                root[key].setHours(0, 0, 0, 0);
                break;
              case("$thisyear"):
                root[key] = new Date();
                root[key].setMonth(1);
                root[key].setDate(1);
                root[key].setHours(0, 0, 0, 0);
                break;
            }
          }
        default:
      }
    }
  }
  return root;
};

var reformValues = function(on){
  if(on === void 0){
    return on;
  }
  var res = {};
  var keys = Object.keys(on), l = keys.length, i, key, value;
  for(i=0; i<l; i++){
    key = keys[i];
    value = on[key];
    if(isNumeric(value)){
      res[key] = +value;
    }else if(isTrue(value)){
      res[key] = true;
    }else if(isFalse(value)){
      res[key] = false;
    }else if(typeof(value)==='object'){
      if(value !== null && value !== void 0){
        res[key] = reformValues(value);
      }
    }else{
      res[key] = value;
    }
  }
  return res;
};

var Collection = function(){
  this.data = [];
  this.indexes = {};
};

Collection.prototype.asArray = function(options, callback){
  var filter = (options||{}).filter||{};
  filter = reformFilter(filter);
  return process.nextTick(function(){
    var records = sift(filter, this.data);
    callback(null, records.map(function(r){
      return extend(true, {}, r);
    }));
  }.bind(this));
};

Collection.prototype.insert = function(rec, callback){
  var _id = rec._id = uuid();
  var idx = this.data.length;
  this.indexes[_id] = idx;
  this.data[idx] = rec;
  return process.nextTick(function(){
    return callback(null, rec);
  });
};

Collection.prototype.update = function(id, rec, callback){
  var idx = this.indexes[id];
  if(idx!==0 && !idx){
    return process.nextTick(function(){
      return callback(new Error('Could not locate document with ID '+id));
    });
  }
  rec._id = id;
  this.data[idx] = rec;
  return process.nextTick(function(){
    return callback(null, rec);
  });
};

Collection.prototype.count = function(callback){
  return process.nextTick(function(){
    return callback(null, this.data.length);
  }.bind(this));
};

var DB = function(){
  this.collections = {};
};

DB.prototype.collection = function(collectionName, callback){
  if(!this.collections[collectionName]){
    this.collections[collectionName] = new Collection();
  }
  if(callback){
    return process.nextTick(function(){
      callback(null, this.collections[collectionName]);
    }.bind(this));
  }
  return this.collections[collectionName];
};

module.exports = {
  DB: DB,
  Collection: Collection,
  reformValues: reformValues,
  reformFilter: reformFilter
};
