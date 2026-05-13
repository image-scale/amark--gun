'use strict';

var expect = require('expect.js');
var Gun = require('../index');
var Mesh = require('../mesh');

describe('Mesh Networking', function () {
  this.timeout(5000);

  it('creates a mesh attached to a gun root', function () {
    var gun = Gun();
    var mesh = Mesh(gun._);
    expect(mesh).to.be.ok();
    expect(mesh.near).to.be(0);
    expect(typeof mesh.hear).to.be('function');
    expect(typeof mesh.say).to.be('function');
    expect(typeof mesh.hi).to.be('function');
    expect(typeof mesh.bye).to.be('function');
  });

  it('hi registers a peer and increments near count', function () {
    var gun = Gun();
    var mesh = Mesh(gun._);
    var sent = [];
    var peer = { send: function (data) { sent.push(data); } };
    mesh.hi(peer);
    expect(mesh.near).to.be(1);
    expect(peer.id).to.be.ok();
    expect(mesh.peers[peer.id]).to.be(peer);
    expect(sent.length).to.be.greaterThan(0);
    var handshake = JSON.parse(sent[0]);
    expect(handshake.dam).to.be('?');
    expect(handshake.pid).to.be.ok();
  });

  it('bye removes a peer and decrements near count', function () {
    var gun = Gun();
    var mesh = Mesh(gun._);
    var peer = { send: function () {} };
    mesh.hi(peer);
    expect(mesh.near).to.be(1);
    mesh.bye(peer);
    expect(mesh.near).to.be(0);
    expect(mesh.peers[peer.id]).to.be(undefined);
  });

  it('hear processes incoming JSON string messages', function (done) {
    var gun = Gun();
    var mesh = Mesh(gun._);

    gun.get('from-peer').on(function (data) {
      expect(data.hello).to.be('world');
      done();
    });

    var msg = {
      put: {
        'from-peer': {
          _: { '#': 'from-peer', '>': { hello: Date.now() } },
          hello: 'world'
        }
      },
      '#': 'incoming-msg-1'
    };

    var peer = { id: 'peer1', send: function () {} };
    mesh.hear(JSON.stringify(msg), peer);
  });

  it('hear processes batched array messages', function (done) {
    var gun = Gun();
    var mesh = Mesh(gun._);
    var count = 0;

    gun.get('batch-a').on(function (data) {
      count++;
      checkDone();
    });
    gun.get('batch-b').on(function (data) {
      count++;
      checkDone();
    });

    function checkDone() {
      if (count >= 2) done();
    }

    var now = Date.now();
    var msgs = [
      {
        put: { 'batch-a': { _: { '#': 'batch-a', '>': { x: now } }, x: 1 } },
        '#': 'batch-msg-a'
      },
      {
        put: { 'batch-b': { _: { '#': 'batch-b', '>': { y: now } }, y: 2 } },
        '#': 'batch-msg-b'
      }
    ];

    var peer = { id: 'peer2', send: function () {} };
    mesh.hear(JSON.stringify(msgs), peer);
  });

  it('say sends messages to peers with batching', function (done) {
    var gun = Gun();
    var mesh = Mesh(gun._);
    var received = [];
    var peer = {
      send: function (data) {
        received.push(data);
      }
    };
    mesh.hi(peer);

    var msg = { put: { test: { _: { '#': 'test', '>': {} } } }, '#': 'outmsg1' };
    mesh.say(msg, peer);

    setTimeout(function () {
      expect(received.length).to.be.greaterThan(0);
      var parsed = JSON.parse(received[received.length - 1]);
      expect(parsed['#']).to.be('outmsg1');
      done();
    }, 100);
  });

  it('say broadcasts to all connected peers', function (done) {
    var gun = Gun();
    var mesh = Mesh(gun._);
    var msgs1 = [], msgs2 = [];

    var peer1 = { send: function (d) { msgs1.push(d); } };
    var peer2 = { send: function (d) { msgs2.push(d); } };
    mesh.hi(peer1);
    mesh.hi(peer2);

    mesh.say({ '#': 'broadcast-1', put: {} });

    setTimeout(function () {
      expect(msgs1.length).to.be.greaterThan(0);
      expect(msgs2.length).to.be.greaterThan(0);
      done();
    }, 100);
  });

  it('say does not echo message back to sender', function (done) {
    var gun = Gun();
    var mesh = Mesh(gun._);
    var peerSent = [];
    var otherSent = [];

    var sender = { send: function (d) { peerSent.push(d); } };
    var other = { send: function (d) { otherSent.push(d); } };
    mesh.hi(sender);
    mesh.hi(other);

    peerSent.length = 0;
    otherSent.length = 0;

    var msg = { '#': 'echo-test', put: {}, _: { via: sender } };
    mesh.say(msg);

    setTimeout(function () {
      expect(otherSent.length).to.be.greaterThan(0);
      expect(peerSent.length).to.be(0);
      done();
    }, 100);
  });

  it('hear ignores DAM handshake messages', function () {
    var gun = Gun();
    var mesh = Mesh(gun._);
    var peer = { send: function () {} };
    mesh.hear(JSON.stringify({ dam: '?', pid: 'remote-pid' }), peer);
    expect(peer.pid).to.be('remote-pid');
  });

  it('hear ignores invalid JSON', function () {
    var gun = Gun();
    var mesh = Mesh(gun._);
    var peer = { send: function () {} };
    mesh.hear('not-valid-json{', peer);
  });

  it('outgoing messages are forwarded to peers', function (done) {
    var gun = Gun();
    var mesh = Mesh(gun._);
    var received = [];
    var peer = { send: function (d) { received.push(d); } };
    mesh.hi(peer);

    gun.get('auto-forward').put({ msg: 'hello' });

    setTimeout(function () {
      expect(received.length).to.be.greaterThan(0);
      done();
    }, 200);
  });

  it('mesh tracks peer count accurately', function () {
    var gun = Gun();
    var mesh = Mesh(gun._);
    var p1 = { send: function () {} };
    var p2 = { send: function () {} };
    var p3 = { send: function () {} };

    mesh.hi(p1);
    mesh.hi(p2);
    mesh.hi(p3);
    expect(mesh.near).to.be(3);

    mesh.bye(p2);
    expect(mesh.near).to.be(2);

    mesh.bye(p1);
    mesh.bye(p3);
    expect(mesh.near).to.be(0);
  });

  it('hi fires hi event on gun root', function (done) {
    var gun = Gun();
    var mesh = Mesh(gun._);

    gun._.on('hi', function (peer) {
      expect(peer).to.be.ok();
      expect(peer.id).to.be.ok();
      done();
    });

    var peer = { send: function () {} };
    mesh.hi(peer);
  });

  it('bye fires bye event on gun root', function (done) {
    var gun = Gun();
    var mesh = Mesh(gun._);

    gun._.on('bye', function (peer) {
      expect(peer).to.be.ok();
      done();
    });

    var peer = { send: function () {} };
    mesh.hi(peer);
    mesh.bye(peer);
  });
});
