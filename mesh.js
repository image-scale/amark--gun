'use strict';

var helpers = require('./helpers');

function Mesh(root) {
  var opt = root.opt || {};
  opt.gap = opt.gap || 50;
  opt.pack = opt.pack || 1000 * 100;

  var mesh = {};
  mesh.near = 0;
  mesh.peers = {};

  mesh.hear = function (raw, peer) {
    if (!raw) return;
    if (typeof raw === 'string') {
      try {
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          for (var i = 0; i < parsed.length; i++) {
            mesh.hear(parsed[i], peer);
          }
          return;
        }
        raw = parsed;
      } catch (e) {
        return;
      }
    }
    if (!raw || typeof raw !== 'object') return;
    var msg = raw;

    if (msg.dam) {
      if (msg.dam === '?') {
        if (msg.pid) {
          peer.pid = msg.pid;
        }
        return;
      }
      return;
    }

    if (peer && peer.id) {
      msg._ = msg._ || {};
      msg._.via = peer;
    }

    root.on.emit('in', msg);
  };

  mesh.say = function (msg, peer) {
    if (!msg) return;

    if (peer) {
      sendToPeer(msg, peer);
      return;
    }

    var peerIds = Object.keys(mesh.peers);
    for (var i = 0; i < peerIds.length; i++) {
      var p = mesh.peers[peerIds[i]];
      if (msg._ && msg._.via && msg._.via.id === p.id) continue;
      sendToPeer(msg, p);
    }
  };

  function sendToPeer(msg, peer) {
    if (!peer || !peer.send) return;

    var cleaned = {};
    var keys = Object.keys(msg);
    for (var i = 0; i < keys.length; i++) {
      if (keys[i] === '_') continue;
      cleaned[keys[i]] = msg[keys[i]];
    }

    peer.batch = peer.batch || [];
    peer.batch.push(cleaned);

    if (!peer.batchTimer) {
      peer.batchTimer = setTimeout(function () {
        flushPeer(peer);
      }, opt.gap);
    }
  }

  function flushPeer(peer) {
    peer.batchTimer = null;
    if (!peer.batch || !peer.batch.length) return;

    var batch = peer.batch;
    peer.batch = null;

    var payload;
    if (batch.length === 1) {
      payload = JSON.stringify(batch[0]);
    } else {
      payload = JSON.stringify(batch);
    }

    try {
      peer.send(payload);
    } catch (e) {}
  }

  mesh.hi = function (peer) {
    if (!peer) return;
    if (!peer.id) {
      peer.id = helpers.randomId();
    }
    mesh.peers[peer.id] = peer;
    mesh.near++;

    try {
      var handshake = JSON.stringify({ dam: '?', pid: root.opt.pid || helpers.randomId() });
      if (peer.send) peer.send(handshake);
    } catch (e) {}

    root.on.emit('hi', peer);

    if (peer.batch && peer.batch.length) {
      flushPeer(peer);
    }
  };

  mesh.bye = function (peer) {
    if (!peer || !peer.id) return;
    if (mesh.peers[peer.id]) {
      delete mesh.peers[peer.id];
      mesh.near--;
    }
    root.on.emit('bye', peer);
  };

  root.opt.pid = root.opt.pid || helpers.randomId();

  root.on('out', function (msg) {
    mesh.say(msg);
  });

  root.mesh = mesh;

  return mesh;
}

module.exports = Mesh;
