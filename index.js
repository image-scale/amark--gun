'use strict';

var helpers = require('./helpers');
var Emitter = require('./emitter');
var Clock = require('./clock');
var Dedup = require('./dedup');
var Validator = require('./validator');
var HAM = require('./ham');
var Mesh = require('./mesh');
var Storage = require('./storage');

function Gun(opts) {
  if (!(this instanceof Gun)) { return new Gun(opts); }
  var at = {};
  at.$ = this;
  at.root = at;
  at.graph = {};
  at.next = {};
  at.id = 1;
  at.on = Emitter();
  at.ask = createAsker();
  at.dup = Dedup();
  at.opt = {};
  this._ = at;

  setupRoot(at);

  if (opts) { this.configure(opts); }
}

function setupRoot(at) {
  at.on('in', function (msg) {
    rootIn(at, msg);
  });
}

function rootIn(root, msg) {
  if (!msg) return;
  if (!msg['#']) { msg['#'] = helpers.randomId(); }

  if (root.dup.check(msg['#'])) { return; }
  root.dup.track(msg['#']);

  if (msg['@']) {
    root.ask(msg['@'], msg);
  }

  if (msg.put) {
    applyPut(root, msg);
  }

  if (msg.get) {
    handleGet(root, msg);
  }
}

function applyPut(root, msg) {
  var incoming = msg.put;
  if (!incoming) return;

  var now = Clock();
  var changed = false;
  var souls = Object.keys(incoming);
  for (var s = 0; s < souls.length; s++) {
    var soul = souls[s];
    var node = incoming[soul];
    if (!node || !node._) continue;

    var nodeSoul = node._['#'];
    var states = node._['>'];
    if (!nodeSoul || !states) continue;

    if (!root.graph[nodeSoul]) {
      root.graph[nodeSoul] = { _: { '#': nodeSoul, '>': {} } };
    }

    var current = root.graph[nodeSoul];
    var keys = Object.keys(node);
    var nodeChanged = false;
    for (var j = 0; j < keys.length; j++) {
      var key = keys[j];
      if (key === '_') continue;

      var inState = states[key];
      if (inState === undefined) continue;

      var curState = (current._['>'][key]) || 0;
      var curVal = current[key];
      var inVal = node[key];

      var resolution = HAM(now, inState, curState, inVal, curVal);

      if (resolution.defer) {
        (function(val, k, s, st, m) {
          var delay = st - Clock();
          if (delay > 2147483647) delay = 2147483647;
          if (delay < 1) delay = 1;
          setTimeout(function() {
            var graph = {};
            var deferNode = { _: { '#': s, '>': {} } };
            deferNode._['>'][k] = st;
            deferNode[k] = val;
            graph[s] = deferNode;
            var deferMsg = { put: graph, '#': helpers.randomId() };
            root.on.emit('in', deferMsg);
          }, delay);
        })(inVal, key, nodeSoul, inState, msg);
        continue;
      }

      if (resolution.historical || resolution.current) {
        continue;
      }

      if (resolution.incoming) {
        current[key] = inVal;
        current._['>'][key] = inState;
        nodeChanged = true;
      }
    }

    if (nodeChanged) {
      changed = true;
      notifyChains(root, nodeSoul, current, msg);
    }
  }

  if (!msg['@']) {
    var ack = { '@': msg['#'], ok: 1, '#': helpers.randomId() };
    root.on.emit('in', ack);
  }
}

function notifyChains(root, soul, node, msg) {
  if (root.next && root.next[soul]) {
    var chain = root.next[soul];
    var notifyMsg = { put: node, get: soul, '#': msg['#'] + '|n' };
    chainInput(notifyMsg, chain._);

    if (chain._.echo) {
      var echoIds = Object.keys(chain._.echo);
      for (var i = 0; i < echoIds.length; i++) {
        var echoCat = chain._.echo[echoIds[i]];
        if (echoCat) {
          echoCat.put = node;
          fireListeners(echoCat, node, echoCat.get || echoCat.has);
          if (echoCat.next) {
            var keys = Object.keys(echoCat.next);
            for (var j = 0; j < keys.length; j++) {
              var childKey = keys[j];
              var childCat = echoCat.next[childKey]._;
              if (node[childKey] !== undefined) {
                var childVal = node[childKey];
                var link = Validator(childVal);
                if (typeof link === 'string') {
                  followLink(childCat, link);
                } else {
                  childCat.put = childVal;
                  fireListeners(childCat, childVal, childKey);
                }
              }
            }
          }
        }
      }
    }
  }
}

function handleGet(root, msg) {
  var lex = msg.get;
  if (!lex) return;
  var soul = lex['#'];
  if (!soul) return;

  var node = root.graph[soul];
  var reply = { '@': msg['#'], '#': helpers.randomId() };
  if (node) {
    reply.put = node;
  }
  if (root.next && root.next[soul]) {
    chainInput(reply, root.next[soul]._);
  }
}

function chainInput(msg, cat) {
  if (cat.soul) {
    var node = msg.put;
    if (node) {
      cat.put = node;
      fireListeners(cat, node, cat.soul);

      if (cat.next) {
        var keys = Object.keys(cat.next);
        for (var i = 0; i < keys.length; i++) {
          var key = keys[i];
          var child = cat.next[key]._;
          if (node[key] !== undefined) {
            var childVal = node[key];
            var link = Validator(childVal);
            if (typeof link === 'string') {
              followLink(child, link);
            } else {
              child.put = childVal;
              fireListeners(child, childVal, key);
            }
          }
        }
      }
    }
  }
}

function followLink(cat, soul) {
  var root = cat.root;
  cat.link = soul;
  var linked = root.graph[soul];
  if (linked) {
    cat.put = linked;
    fireListeners(cat, linked, cat.get || cat.has);
    if (cat.next) {
      var keys = Object.keys(cat.next);
      for (var i = 0; i < keys.length; i++) {
        var childKey = keys[i];
        var childCat = cat.next[childKey]._;
        if (linked[childKey] !== undefined) {
          var childVal = linked[childKey];
          var childLink = Validator(childVal);
          if (typeof childLink === 'string') {
            followLink(childCat, childLink);
          } else {
            childCat.put = childVal;
            fireListeners(childCat, childVal, childKey);
          }
        }
      }
    }
  }

  root.next = root.next || {};
  if (!root.next[soul]) {
    var linkedChain = Object.create(Gun.prototype);
    var linkedAt = {
      $: linkedChain,
      root: root,
      id: ++root.id,
      on: Emitter(),
      next: {},
      any: {},
      echo: {},
      soul: soul,
      get: soul
    };
    linkedChain._ = linkedAt;
    root.next[soul] = linkedChain;
  }
  root.next[soul]._.echo = root.next[soul]._.echo || {};
  root.next[soul]._.echo[cat.id] = cat;
}

function fireListeners(cat, data, key) {
  if (!cat.any) return;
  var ids = Object.keys(cat.any);
  for (var i = 0; i < ids.length; i++) {
    var listener = cat.any[ids[i]];
    if (listener && listener.fn) {
      try {
        listener.fn.call(cat.$, data, key);
      } catch (e) {}
      if (listener.once) {
        delete cat.any[ids[i]];
      }
    }
  }
}

function registerListener(cat, cb, opts) {
  opts = opts || {};
  var id = helpers.randomId();
  cat.any = cat.any || {};
  cat.any[id] = {
    fn: cb,
    once: opts.once || false,
    id: id
  };

  if (cat.put !== undefined) {
    var key = cat.has || cat.soul || cat.get;
    try {
      cb.call(cat.$, cat.put, key);
    } catch (e) {}
    if (opts.once) {
      delete cat.any[id];
    }
  } else {
    requestData(cat);
  }

  return cat.$;
}

function requestData(cat) {
  var root = cat.root;

  if (cat.soul) {
    var node = root.graph[cat.soul];
    if (node) {
      cat.put = node;
      fireListeners(cat, node, cat.soul);
    }
    return;
  }

  if (cat.has && cat.back) {
    resolvePropertyChain(cat);
  }
}

function resolvePropertyChain(cat) {
  var root = cat.root;
  var parentCat = cat.back;
  if (!parentCat) return;

  var parentSoul = parentCat.soul || parentCat.link;
  if (!parentSoul && parentCat.has) {
    resolvePropertyChain(parentCat);
    parentSoul = parentCat.link;
  }

  if (parentSoul) {
    var parentNode = root.graph[parentSoul];
    if (parentNode && parentNode[cat.has] !== undefined) {
      var val = parentNode[cat.has];
      var link = Validator(val);
      if (typeof link === 'string') {
        followLink(cat, link);
      } else {
        cat.put = val;
        fireListeners(cat, val, cat.has);
      }
    }
  }
}

Gun.is = function (v) {
  return !!(v && v instanceof Gun);
};

Gun.valid = Validator;

Gun.on = Emitter;

Gun.HAM = HAM;

Gun.Mesh = Mesh;

Gun.Storage = Storage;

Gun.prototype.configure = function (opts) {
  if (typeof opts === 'string') {
    opts = { peers: [opts] };
  }
  if (Array.isArray(opts)) {
    opts = { peers: opts };
  }
  var o = this._.opt;
  if (opts && opts.peers) {
    o.peers = o.peers || {};
    var peerList = Array.isArray(opts.peers) ? opts.peers : [opts.peers];
    for (var i = 0; i < peerList.length; i++) {
      if (typeof peerList[i] === 'string') {
        o.peers[peerList[i]] = { url: peerList[i] };
      }
    }
  }
  if (opts) helpers.mixin(o, opts, ['peers']);
  if (opts && opts.file && !this._.store) {
    Storage(this._, { file: opts.file, batch: opts.batch });
  }
  this._.on.emit('opt', this._);
  return this;
};

Gun.prototype.get = function (key, cb, opts) {
  var cat = this._;
  var root = cat.root;
  if (typeof key === 'function') {
    return registerListener(cat, key, cb || opts);
  }
  if (typeof key !== 'string') { return this; }

  var chain;
  if (cat.next && cat.next[key]) {
    chain = cat.next[key];
  } else {
    chain = Object.create(Gun.prototype);
    var childAt = {
      $: chain,
      root: root,
      id: ++root.id,
      back: cat,
      on: Emitter(),
      next: {},
      ask: {},
      echo: {},
      any: {},
      get: key
    };
    if (cat === root) {
      childAt.soul = key;
    } else {
      childAt.has = key;
    }
    chain._ = childAt;
    cat.next = cat.next || {};
    cat.next[key] = chain;

    if (childAt.soul) {
      root.next = root.next || {};
      root.next[key] = chain;
    }
  }

  if (typeof cb === 'function') {
    return chain.get(cb, opts);
  }
  return chain;
};

Gun.prototype.put = function (data, cb, opts) {
  var cat = this._;
  var root = cat.root;
  opts = opts || {};

  var soul = resolveSoulPath(cat);
  if (!soul) {
    soul = helpers.randomId();
  }

  var now = Clock();
  var graph = {};

  if (helpers.isPlain(data)) {
    var node = { _: { '#': soul, '>': {} } };
    var keys = Object.keys(data);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (k === '_') continue;
      var v = data[k];
      var validated = Validator(v);
      if (validated === false) {
        if (helpers.isPlain(v)) {
          var childSoul = soul + '/' + k;
          node._['>'][k] = now;
          node[k] = { '#': childSoul };
          buildNestedGraph(graph, childSoul, v, now);
        }
        continue;
      }
      node._['>'][k] = now;
      node[k] = v;
    }
    graph[soul] = node;
  } else {
    var validated = Validator(data);
    if (validated !== false) {
      if (cat.has) {
        var parentSoul = resolveSoulPath(cat.back);
        if (parentSoul) {
          var parentNode = { _: { '#': parentSoul, '>': {} } };
          parentNode._['>'][cat.has] = now;
          parentNode[cat.has] = data;
          graph[parentSoul] = parentNode;
          ensureAncestorNodes(graph, cat.back, now);
        }
      } else {
        var node = { _: { '#': soul, '>': {} } };
        graph[soul] = node;
      }
    } else if (typeof cb === 'function') {
      cb({ err: 'Invalid value' });
      return this;
    }
  }

  if (cat.has && helpers.isPlain(data)) {
    ensureAncestorNodes(graph, cat, now);
  }

  var msgId = helpers.randomId();
  var msg = { put: graph, '#': msgId };
  if (typeof cb === 'function') {
    root.ask(function () { cb({ ok: 1 }); }, msgId);
  }

  if (opts.turn) {
    opts.turn(function () {
      root.on.emit('in', msg);
    });
  } else {
    setTimeout(function () {
      root.on.emit('in', msg);
    }, 0);
  }

  return this;
};

function ensureAncestorNodes(graph, cat, now) {
  var at = cat;
  while (at.back && at.has) {
    var parentSoul = resolveSoulPath(at.back);
    var childSoul = resolveSoulPath(at);
    if (parentSoul && childSoul && !graph[parentSoul]) {
      var node = { _: { '#': parentSoul, '>': {} } };
      node._['>'][at.has] = now;
      node[at.has] = { '#': childSoul };
      graph[parentSoul] = node;
    }
    at = at.back;
  }
}

function resolveSoulPath(cat) {
  if (!cat) return null;
  if (cat.soul) return cat.soul;
  if (!cat.back) return null;
  var parentPath = resolveSoulPath(cat.back);
  if (parentPath && cat.has) {
    return parentPath + '/' + cat.has;
  }
  if (cat.has) return cat.has;
  return null;
}

function buildNestedGraph(graph, soul, data, now) {
  var node = { _: { '#': soul, '>': {} } };
  var keys = Object.keys(data);
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i];
    if (k === '_') continue;
    var v = data[k];
    var validated = Validator(v);
    if (validated === false) {
      if (helpers.isPlain(v)) {
        var childSoul = soul + '/' + k;
        node._['>'][k] = now;
        node[k] = { '#': childSoul };
        buildNestedGraph(graph, childSoul, v, now);
      }
      continue;
    }
    node._['>'][k] = now;
    node[k] = v;
  }
  graph[soul] = node;
}

Gun.prototype.on = function (cb, opts) {
  if (typeof cb === 'string') {
    return this._.on(cb, opts);
  }
  opts = opts || {};
  opts.stream = true;
  return this.get(cb, opts);
};

Gun.prototype.once = function (cb, opts) {
  opts = opts || {};
  opts.once = true;
  return this.get(cb, opts);
};

Gun.prototype.off = function () {
  var cat = this._;
  if (cat.next) {
    var keys = Object.keys(cat.next);
    for (var i = 0; i < keys.length; i++) {
      if (cat.next[keys[i]] && cat.next[keys[i]].off) {
        cat.next[keys[i]].off();
      }
    }
  }
  cat.any = {};
  cat.ask = {};
  if (cat.on && cat.on.clear) cat.on.clear();
  return this;
};

Gun.prototype.back = function (n) {
  if (n === undefined || n === 1) {
    var b = this._.back;
    return b ? b.$ : this;
  }
  if (n === -1 || n === Infinity) {
    return this._.root.$;
  }
  if (typeof n === 'number' && n > 1) {
    var chain = this;
    while (n-- > 0 && chain._.back) {
      chain = chain._.back.$;
    }
    return chain;
  }
  if (typeof n === 'string') {
    var parts = n.split('.');
    var at = this._;
    while (at) {
      var val = at;
      var found = true;
      for (var i = 0; i < parts.length; i++) {
        val = val[parts[i]];
        if (val === undefined) { found = false; break; }
      }
      if (found) return val;
      at = at.back;
    }
    return undefined;
  }
  return this;
};

Gun.prototype.set = function (item, cb) {
  var gun = this;
  var root = gun.back(-1);
  var soul;

  if (Gun.is(item)) {
    var itemSoul = item._.soul || (item._.put && item._.put._ && item._.put._['#']);
    if (itemSoul) {
      var link = {};
      link[itemSoul] = { '#': itemSoul };
      gun.put(link, cb);
      return item;
    }
  }

  if (helpers.isPlain(item)) {
    soul = helpers.randomId(7);
    var ref = root.get(soul).put(item);
    var link = {};
    link[soul] = { '#': soul };
    gun.put(link, cb);
    return ref;
  }

  soul = helpers.randomId(7);
  gun.get(soul).put(item, cb);
  return gun.get(soul);
};

Gun.prototype.map = function (cb) {
  var gun = this;
  var cat = gun._;

  if (typeof cb === 'function') {
    var chain = Object.create(Gun.prototype);
    chain._ = {
      $: chain,
      root: cat.root,
      id: ++cat.root.id,
      back: cat,
      on: Emitter(),
      next: {},
      any: {},
      echo: {},
      get: '_map_transform'
    };

    gun.map().on(function (data, key) {
      var result = cb(data, key);
      if (result === undefined) return;
      fireListeners(chain._, result, key);
    });

    return chain;
  }

  if (cat.each) return cat.each;

  var mapChain = Object.create(Gun.prototype);
  mapChain._ = {
    $: mapChain,
    root: cat.root,
    id: ++cat.root.id,
    back: cat,
    on: Emitter(),
    next: {},
    any: {},
    echo: {},
    isMap: true,
    get: '_map'
  };

  cat.each = mapChain;

  var processSoul = function (soul) {
    var node = cat.root.graph[soul];
    if (!node) return;
    var keys = Object.keys(node);
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      if (key === '_') continue;
      var val = node[key];
      var link = Validator(val);
      if (typeof link === 'string') {
        var linkedNode = cat.root.graph[link];
        if (linkedNode) {
          fireListeners(mapChain._, linkedNode, key);
        } else {
          fireListeners(mapChain._, val, key);
        }
      } else {
        fireListeners(mapChain._, val, key);
      }
    }
  };

  var orig = cat.any;
  var mapId = helpers.randomId();
  cat.any = cat.any || {};
  cat.any[mapId] = {
    fn: function (data, key) {
      if (cat.soul && typeof data === 'object' && data !== null && data._) {
        processSoul(cat.soul);
      }
    },
    id: mapId
  };

  var soul = cat.soul;
  if (soul && cat.root.graph[soul]) {
    setTimeout(function () {
      processSoul(soul);
    }, 0);
  }

  return mapChain;
};

function createAsker() {
  var pending = {};
  var asker = function (cb, id) {
    if (typeof cb === 'function') {
      id = id || helpers.randomId();
      pending[id] = { fn: cb, t: setTimeout(function () { delete pending[id]; }, 9000) };
      return id;
    }
    if (typeof cb === 'string') {
      if (pending[cb]) {
        var entry = pending[cb];
        clearTimeout(entry.t);
        delete pending[cb];
        if (entry.fn) entry.fn(id);
        return true;
      }
    }
    return false;
  };
  return asker;
}

Gun.statedisk = function (data, soul, cb) {
  var gun = Gun();
  gun.get(soul).put(data, cb, { turn: function (fn) { fn(); } });
  return gun;
};

module.exports = Gun;
