var config = require('../../lib/config').search;

var http = require('http');
var fs = require('fs');

var search = function(options){
  var xmpp = options.xmpp;
  var conference = options.conference;
  var from = options.from;
  var message = options.message;
  var reply = options.reply;

  var query = encodeURIComponent(message.replace(/^search/i, '').trim());
  var options = {
    host: 'api.sindice.com',
    port: 80,
    //path: '/customsearch/v1?cx='+encodeURIComponent(key)+'&key='+encodeURIComponent(apiKey)+'&q='+encodeURIComponent(query),
    path: '/v2/search?q='+query+'&qt=term&page=1&format=json',
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2272.101 Safari/537.36'
    }
  };

  var req = http.request(options, function(res) {
    var response = '';
    res.setEncoding('utf-8');
    res.on('data', function (chunk) {
      response += chunk;
    });
    res.on('end', function(){
      try{
        var resp = JSON.parse(response);

        reply(resp.entries[0].title[0]+' '+resp.entries[0].link);
      }catch(e){
      }
    });
  });

  req.on('error', function(e){
    reply(e.toString());
  });

  req.end();
};

module.exports = {
  name: 'Search',
  expression: /^search/,
  handler: search
};
