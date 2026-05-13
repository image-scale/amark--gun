'use strict';

var fs = require('fs');
var path = require('path');
var HAM = require('./ham');
var Clock = require('./clock');
var helpers = require('./helpers');

function Storage(root, opts) {
  opts = opts || {};
  var filePath = opts.file || path.join(process.cwd(), 'gun-data.json');
  var flushDelay = opts.batch || 250;
  var store = {};
  var graph = {};
  var dirty = false;
  var flushTimer = null;

  try {
    var raw = fs.readFileSync(filePath, 'utf8');
    graph = JSON.parse(raw);
  } catch (e) {}

  if (graph && typeof graph === 'object') {
    var souls = Object.keys(graph);
    for (var i = 0; i < souls.length; i++) {
      var soul = souls[i];
      var node = graph[soul];
      if (node && node._ && node._['#']) {
        root.graph[soul] = node;
      }
    }
  }

  function scheduleBatch() {
    if (flushTimer) return;
    flushTimer = setTimeout(flush, flushDelay);
  }

  function flush() {
    flushTimer = null;
    if (!dirty) return;
    dirty = false;
    var data = JSON.stringify(graph);
    try {
      var dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(filePath, data, 'utf8');
    } catch (e) {}
  }

  store.put = function (incoming) {
    if (!incoming) return;
    var souls = Object.keys(incoming);
    for (var s = 0; s < souls.length; s++) {
      var soul = souls[s];
      var node = incoming[soul];
      if (!node || !node._) continue;

      var states = node._['>'];
      if (!states) continue;

      if (!graph[soul]) {
        graph[soul] = { _: { '#': soul, '>': {} } };
      }

      var stored = graph[soul];
      var keys = Object.keys(node);
      for (var j = 0; j < keys.length; j++) {
        var key = keys[j];
        if (key === '_') continue;
        var inState = states[key];
        if (inState === undefined) continue;
        stored._['>'][key] = inState;
        stored[key] = node[key];
      }
    }
    dirty = true;
    scheduleBatch();
  };

  store.get = function (soul) {
    return graph[soul] || null;
  };

  root.on('put', function (msg) {
    if (msg && msg.put) {
      store.put(msg.put);
    }
  });

  root.on('get', function (msg) {
    if (!msg || !msg.get) return;
    var lex = msg.get;
    var soul = lex['#'];
    if (!soul) return;

    var node = store.get(soul);
    if (node) {
      var reply = { '@': msg['#'], '#': helpers.randomId(), put: {} };
      reply.put[soul] = node;
      root.on.emit('in', reply);
    }
  });

  var origIn = null;
  root.on('in', function (msg) {
    if (msg && msg.put) {
      root.on.emit('put', msg);
    }
  });

  store.flush = flush;
  store.graph = graph;
  root.store = store;

  return store;
}

module.exports = Storage;
