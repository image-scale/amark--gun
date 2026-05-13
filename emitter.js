'use strict';

function Emitter() {
  var tags = {};

  function on(tag, fn, ctx) {
    if (typeof fn === 'function') {
      var listeners = tags[tag] = tags[tag] || [];
      var node = { fn: fn, ctx: ctx || null };
      node.off = function () {
        var idx = listeners.indexOf(node);
        if (idx !== -1) listeners.splice(idx, 1);
      };
      listeners.push(node);
      var result = { off: node.off, on: on };
      return result;
    }
    emit(tag, fn);
    return { on: on };
  }

  function emit(tag, data) {
    var listeners = tags[tag];
    if (!listeners) return;
    var snapshot = listeners.slice();
    for (var i = 0; i < snapshot.length; i++) {
      if (snapshot[i] && snapshot[i].fn) {
        snapshot[i].fn(data);
      }
    }
  }

  function clear() {
    tags = {};
  }

  on.emit = emit;
  on.clear = clear;
  on.tags = tags;

  return on;
}

module.exports = Emitter;
