'use strict';

var counter = 0;

function Clock() {
  var now = +new Date();
  if (now <= counter) {
    now = counter + (++counter % 999) / 999;
  }
  counter = now;
  return now + (Clock.drift || 0);
}

Clock.drift = 0;

Clock.stateOf = function (node, key) {
  if (!node || !node._ || !node._['>']) return undefined;
  return node._['>'][key];
};

Clock.ify = function (node, key, state, value, soul) {
  node = node || {};
  node._ = node._ || {};
  if (soul) { node._['#'] = soul; }
  node._['>'] = node._['>'] || {};
  if (key !== undefined) {
    node._['>'][key] = state;
    if (value !== undefined) {
      node[key] = value;
    }
  }
  return node;
};

module.exports = Clock;
