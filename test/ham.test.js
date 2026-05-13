'use strict';

var expect = require('expect.js');
var Gun = require('../index');
var HAM = require('../ham');
var Clock = require('../clock');

describe('HAM Conflict Resolution', function () {

  describe('Direct HAM function', function () {
    it('accepts incoming when state is newer', function () {
      var result = HAM(100, 50, 10, 'new', 'old');
      expect(result.converge).to.be(true);
      expect(result.incoming).to.be(true);
    });

    it('discards incoming when state is older than current', function () {
      var result = HAM(100, 10, 50, 'new', 'old');
      expect(result.historical).to.be(true);
    });

    it('defers when incoming state is in the future', function () {
      var result = HAM(100, 200, 10, 'future', 'current');
      expect(result.defer).to.be(true);
    });

    it('keeps current when states equal and values equal', function () {
      var result = HAM(100, 50, 50, 'same', 'same');
      expect(result.converge).to.be(true);
      expect(result.current).to.be(true);
    });

    it('keeps current when states equal and incoming value is smaller', function () {
      var result = HAM(100, 50, 50, 'a', 'bb');
      expect(result.converge).to.be(true);
      expect(result.current).to.be(true);
    });

    it('accepts incoming when states equal but incoming value is larger', function () {
      var result = HAM(100, 50, 50, 'bbb', 'a');
      expect(result.converge).to.be(true);
      expect(result.incoming).to.be(true);
    });

    it('accepts incoming on first write (no current state)', function () {
      var result = HAM(100, 50, 0, 'hello', undefined);
      expect(result.converge).to.be(true);
      expect(result.incoming).to.be(true);
    });
  });

  describe('Graph merging via put', function () {
    it('newer state overwrites older value', function (done) {
      var gun = Gun();
      var now = Clock();

      var graph1 = {};
      graph1['merge-test'] = {
        _: { '#': 'merge-test', '>': { x: now } },
        x: 'first'
      };
      gun._.on.emit('in', { put: graph1, '#': 'msg1' });

      setTimeout(function () {
        var later = Clock();
        var graph2 = {};
        graph2['merge-test'] = {
          _: { '#': 'merge-test', '>': { x: later } },
          x: 'second'
        };
        gun._.on.emit('in', { put: graph2, '#': 'msg2' });

        setTimeout(function () {
          expect(gun._.graph['merge-test'].x).to.be('second');
          done();
        }, 50);
      }, 10);
    });

    it('older state does not overwrite newer value', function (done) {
      var gun = Gun();
      var now = Clock();

      var graph1 = {};
      graph1['old-test'] = {
        _: { '#': 'old-test', '>': { x: now } },
        x: 'current'
      };
      gun._.on.emit('in', { put: graph1, '#': 'msg-a' });

      setTimeout(function () {
        var past = now - 1000;
        var graph2 = {};
        graph2['old-test'] = {
          _: { '#': 'old-test', '>': { x: past } },
          x: 'outdated'
        };
        gun._.on.emit('in', { put: graph2, '#': 'msg-b' });

        setTimeout(function () {
          expect(gun._.graph['old-test'].x).to.be('current');
          done();
        }, 50);
      }, 10);
    });

    it('disjoint keys merge independently', function (done) {
      var gun = Gun();
      var t1 = Clock();

      var g1 = {};
      g1['disjoint'] = {
        _: { '#': 'disjoint', '>': { a: t1 } },
        a: 1
      };
      gun._.on.emit('in', { put: g1, '#': 'dj1' });

      setTimeout(function () {
        var t2 = Clock();
        var g2 = {};
        g2['disjoint'] = {
          _: { '#': 'disjoint', '>': { b: t2 } },
          b: 'two'
        };
        gun._.on.emit('in', { put: g2, '#': 'dj2' });

        setTimeout(function () {
          var node = gun._.graph['disjoint'];
          expect(node.a).to.be(1);
          expect(node.b).to.be('two');
          done();
        }, 50);
      }, 10);
    });

    it('mutation updates existing key with newer state', function (done) {
      var gun = Gun();
      var t1 = Clock();

      var g1 = {};
      g1['mutate'] = {
        _: { '#': 'mutate', '>': { val: t1 } },
        val: 'original'
      };
      gun._.on.emit('in', { put: g1, '#': 'mu1' });

      setTimeout(function () {
        var t2 = Clock();
        var g2 = {};
        g2['mutate'] = {
          _: { '#': 'mutate', '>': { val: t2 } },
          val: 'updated'
        };
        gun._.on.emit('in', { put: g2, '#': 'mu2' });

        setTimeout(function () {
          expect(gun._.graph['mutate'].val).to.be('updated');
          done();
        }, 50);
      }, 10);
    });

    it('multi-node merge works correctly', function (done) {
      var gun = Gun();
      var t = Clock();

      var g = {};
      g['node-a'] = {
        _: { '#': 'node-a', '>': { x: t } },
        x: 10
      };
      g['node-b'] = {
        _: { '#': 'node-b', '>': { y: t } },
        y: 20
      };
      gun._.on.emit('in', { put: g, '#': 'multi1' });

      setTimeout(function () {
        expect(gun._.graph['node-a'].x).to.be(10);
        expect(gun._.graph['node-b'].y).to.be(20);
        done();
      }, 50);
    });

    it('same state tie-broken by value size', function (done) {
      var gun = Gun();
      var t = Clock();

      var g1 = {};
      g1['tie'] = {
        _: { '#': 'tie', '>': { v: t } },
        v: 'longer-string'
      };
      gun._.on.emit('in', { put: g1, '#': 'tie1' });

      setTimeout(function () {
        var g2 = {};
        g2['tie'] = {
          _: { '#': 'tie', '>': { v: t } },
          v: 'short'
        };
        gun._.on.emit('in', { put: g2, '#': 'tie2' });

        setTimeout(function () {
          expect(gun._.graph['tie'].v).to.be('longer-string');
          done();
        }, 50);
      }, 10);
    });

    it('state timestamps used automatically by put', function (done) {
      var gun = Gun();
      gun.get('auto-state').put({ name: 'test' });

      setTimeout(function () {
        var node = gun._.graph['auto-state'];
        expect(node).to.be.ok();
        expect(node._['>'].name).to.be.a('number');
        expect(node._['>'].name).to.be.greaterThan(0);
        done();
      }, 50);
    });

    it('future-dated states are deferred', function (done) {
      this.timeout(5000);
      var gun = Gun();
      var futureTime = Clock() + 500;

      var g = {};
      g['future-node'] = {
        _: { '#': 'future-node', '>': { x: futureTime } },
        x: 'future-value'
      };
      gun._.on.emit('in', { put: g, '#': 'fut1' });

      setTimeout(function () {
        var val = gun._.graph['future-node'];
        expect(!val || !val.x).to.be.ok();
      }, 50);

      setTimeout(function () {
        var val = gun._.graph['future-node'];
        expect(val).to.be.ok();
        expect(val.x).to.be('future-value');
        done();
      }, 1500);
    });

    it('concurrent puts resolve deterministically', function (done) {
      var gun = Gun();
      var t = Clock();

      gun.get('concurrent').put({ name: 'Alice' });
      gun.get('concurrent').put({ name: 'Bob' });

      setTimeout(function () {
        var node = gun._.graph['concurrent'];
        expect(node).to.be.ok();
        expect(node.name).to.be.ok();
        expect(typeof node.name).to.be('string');
        done();
      }, 100);
    });
  });
});
