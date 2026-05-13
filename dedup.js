'use strict';

function Dedup(opts) {
  opts = opts || {};
  var maxEntries = opts.max || 999;
  var maxAge = opts.age || 9000;
  var store = {};
  var timer = null;

  function check(id) {
    return store[id] ? true : false;
  }

  function track(id) {
    store[id] = { ts: +new Date() };
    schedulePurge();
    return store[id];
  }

  function purge() {
    var now = +new Date();
    var keys = Object.keys(store);
    for (var i = 0; i < keys.length; i++) {
      if (now - store[keys[i]].ts > maxAge) {
        delete store[keys[i]];
      }
    }
    if (Object.keys(store).length > 0) {
      schedulePurge();
    } else {
      timer = null;
    }
  }

  function schedulePurge() {
    if (!timer) {
      timer = setTimeout(function () {
        timer = null;
        purge();
      }, maxAge);
    }
  }

  return {
    check: check,
    track: track,
    purge: purge,
    store: store
  };
}

module.exports = Dedup;
