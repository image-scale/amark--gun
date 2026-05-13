'use strict';

var expect = require('expect.js');
var Gun = require('../index');

describe('Gun Core', function () {

  describe('Utilities', function () {
    require('../helpers');

    it('String.random generates correct length', function () {
      expect(String.random().length).to.be(24);
      expect(String.random(11).length).to.be(11);
      expect(String.random(4).length).to.be(4);
    });

    it('String.random uses custom charset', function () {
      var r = String.random(2, 'ab');
      expect(r === 'aa' || r === 'ab' || r === 'ba' || r === 'bb').to.be(true);
    });

    it('String.match exact', function () {
      expect(String.match('user/mark', 'user/mark')).to.be.ok();
      expect(String.match('user/mark/nadal', { '=': 'user/mark' })).to.not.be.ok();
    });

    it('String.match prefix', function () {
      expect(String.match('user/mark/nadal', { '*': 'user/' })).to.be.ok();
      expect(String.match('email/mark@gunDB.io', { '*': 'user/' })).to.not.be.ok();
    });

    it('String.match range', function () {
      expect(String.match('user/mark/nadal', { '>': 'user/j', '<': 'user/o' })).to.be.ok();
      expect(String.match('user/timber/nadal', { '>': 'user/c', '<': 'user/j' })).to.not.be.ok();
      expect(String.match('user/timber/nadal', { '>': 'user/m', '<': 'user/u' })).to.be.ok();
    });

    it('String.match boundary inclusive', function () {
      expect(String.match('m', { '>': 'm' })).to.be.ok();
      expect(String.match('m', { '<': 'm' })).to.be.ok();
      expect(String.match('mary', { '<': 'm' })).to.not.be.ok();
      expect(String.match('mary', { '>': 'm' })).to.be.ok();
    });

    it('String.hash returns number', function () {
      var h = String.hash('hello');
      expect(typeof h).to.be('number');
      expect(String.hash('hello')).to.be(String.hash('hello'));
      expect(String.hash('hello')).to.not.be(String.hash('world'));
    });

    it('Object.plain detects plain objects', function () {
      expect(Object.plain({})).to.be(true);
      expect(Object.plain({ a: 1 })).to.be(true);
      expect(Object.plain(undefined)).to.be(false);
      expect(Object.plain(null)).to.be(false);
      expect(Object.plain(NaN)).to.be(false);
      expect(Object.plain(0)).to.be(false);
      expect(Object.plain(1)).to.be(false);
      expect(Object.plain('')).to.be(false);
      expect(Object.plain('a')).to.be(false);
      expect(Object.plain([])).to.be(false);
      expect(Object.plain([1])).to.be(false);
      expect(Object.plain(false)).to.be(false);
      expect(Object.plain(true)).to.be(false);
      expect(Object.plain(function () {})).to.be(false);
      expect(Object.plain(new Date())).to.be(false);
      expect(Object.plain(/regex/)).to.be(false);
    });

    it('Object.plain with custom constructor', function () {
      function Custom() { this.x = 1; }
      expect(Object.plain(new Custom())).to.be(true);
    });

    it('Object.empty checks emptiness', function () {
      expect(Object.empty()).to.be(true);
      expect(Object.empty({})).to.be(true);
      expect(Object.empty({ a: false })).to.be(false);
      expect(Object.empty({ a: false }, ['a'])).to.be(true);
      expect(Object.empty({ a: false, b: 1 }, ['a'])).to.be(false);
      expect(Object.empty({ a: false, b: 1 }, ['a', 'b'])).to.be(true);
      expect(Object.empty({ a: false, b: 1, c: 3 }, ['a', 'b'])).to.be(false);
    });
  });

  describe('Validator', function () {
    it('accepts valid values', function () {
      expect(Gun.valid(false)).to.be(true);
      expect(Gun.valid(true)).to.be(true);
      expect(Gun.valid(0)).to.be(true);
      expect(Gun.valid(1)).to.be(true);
      expect(Gun.valid('')).to.be(true);
      expect(Gun.valid('a')).to.be(true);
      expect(Gun.valid(null)).to.be(true);
    });

    it('rejects invalid values', function () {
      expect(Gun.valid(Infinity)).to.be(false);
      expect(Gun.valid(-Infinity)).to.be(false);
      expect(Gun.valid(NaN)).to.be(false);
      expect(Gun.valid([])).to.be(false);
      expect(Gun.valid([1])).to.be(false);
      expect(Gun.valid({})).to.be(false);
      expect(Gun.valid({ a: 1 })).to.be(false);
      expect(Gun.valid(function () {})).to.be(false);
    });

    it('detects soul references', function () {
      expect(Gun.valid({ '#': 'somesoulidhere' })).to.be('somesoulidhere');
      expect(Gun.valid({ '#': 'somethingelsehere' })).to.be('somethingelsehere');
      expect(Gun.valid({ '#': 'somesoulidhere', and: 'nope' })).to.be(false);
      expect(Gun.valid({ or: 'nope', '#': 'somesoulidhere' })).to.be(false);
    });
  });

  describe('Gun Instance', function () {
    it('creates instance with or without new', function () {
      var g1 = new Gun();
      var g2 = Gun();
      expect(Gun.is(g1)).to.be(true);
      expect(Gun.is(g2)).to.be(true);
    });

    it('Gun.is returns false for non-instances', function () {
      expect(Gun.is(true)).to.be(false);
      expect(Gun.is(false)).to.be(false);
      expect(Gun.is(0)).to.be(false);
      expect(Gun.is(1)).to.be(false);
      expect(Gun.is('')).to.be(false);
      expect(Gun.is('a')).to.be(false);
      expect(Gun.is(Infinity)).to.be(false);
      expect(Gun.is(-Infinity)).to.be(false);
      expect(Gun.is(NaN)).to.be(false);
      expect(Gun.is([])).to.be(false);
      expect(Gun.is([1])).to.be(false);
      expect(Gun.is({})).to.be(false);
      expect(Gun.is({ a: 1 })).to.be(false);
      expect(Gun.is(function () {})).to.be(false);
    });

    it('gun.get returns a chainable object', function () {
      var gun = Gun();
      var ref = gun.get('test');
      expect(Gun.is(ref)).to.be(true);
      var nested = ref.get('prop');
      expect(Gun.is(nested)).to.be(true);
    });

    it('gun.get caches child chains', function () {
      var gun = Gun();
      var a = gun.get('users');
      var b = gun.get('users');
      expect(a).to.be(b);
    });
  });

  describe('Put and Read', function () {
    it('put and on', function (done) {
      var gun = Gun();
      gun.get('alice').put({ name: 'Alice', age: 30 });
      setTimeout(function () {
        gun.get('alice').on(function (data, key) {
          expect(data.name).to.be('Alice');
          expect(data.age).to.be(30);
          expect(key).to.be('alice');
          done();
        });
      }, 50);
    });

    it('put and once', function (done) {
      var gun = Gun();
      gun.get('bob').put({ name: 'Bob', age: 25 });
      setTimeout(function () {
        gun.get('bob').once(function (data, key) {
          expect(data.name).to.be('Bob');
          expect(data.age).to.be(25);
          expect(key).to.be('bob');
          done();
        });
      }, 50);
    });

    it('on fires on updates', function (done) {
      var gun = Gun();
      var count = 0;
      gun.get('counter').put({ value: 1 });
      setTimeout(function () {
        gun.get('counter').on(function (data) {
          count++;
          if (count === 1) {
            expect(data.value).to.be(1);
            gun.get('counter').put({ value: 2 });
          }
          if (count >= 2) {
            expect(data.value).to.be(2);
            done();
          }
        });
      }, 50);
    });

    it('put with callback acknowledges', function (done) {
      var gun = Gun();
      gun.get('ack-test').put({ x: 1 }, function (ack) {
        expect(ack.ok).to.be.ok();
        done();
      });
    });

    it('put primitive value via chain', function (done) {
      var gun = Gun();
      gun.get('parent').get('child').put('hello');
      setTimeout(function () {
        var node = gun._.graph['parent'];
        expect(node).to.be.ok();
        expect(node.child).to.be('hello');
        done();
      }, 50);
    });

    it('once only fires once', function (done) {
      var gun = Gun();
      var count = 0;
      gun.get('once-test').put({ a: 1 });
      setTimeout(function () {
        gun.get('once-test').once(function (data) {
          count++;
          expect(data.a).to.be(1);
        });
        gun.get('once-test').put({ a: 2 });
        setTimeout(function () {
          expect(count).to.be(1);
          done();
        }, 100);
      }, 50);
    });
  });

  describe('Graph Structure', function () {
    it('nodes have soul and state metadata', function (done) {
      var gun = Gun();
      gun.get('meta-test').put({ hello: 'world' });
      setTimeout(function () {
        var node = gun._.graph['meta-test'];
        expect(node).to.be.ok();
        expect(node._['#']).to.be('meta-test');
        expect(typeof node._['>'].hello).to.be('number');
        expect(node._['>'].hello > 0).to.be(true);
        expect(node.hello).to.be('world');
        done();
      }, 50);
    });

    it('state timestamps are monotonically increasing', function () {
      var Clock = require('../clock');
      var t1 = Clock();
      var t2 = Clock();
      var t3 = Clock();
      expect(t2 > t1).to.be(true);
      expect(t3 > t2).to.be(true);
    });

    it('predictable soul paths for chained gets', function (done) {
      var gun = Gun();
      gun.get('z').get('y').get('x').put({ v: 1 }, function () {
        var g = gun._.graph;
        expect(g['z']).to.be.ok();
        expect(g['z/y']).to.be.ok();
        expect(g['z/y/x']).to.be.ok();
        done();
      });
    });
  });

  describe('Deduplication', function () {
    it('prevents duplicate message processing', function () {
      var Dedup = require('../dedup');
      var dup = Dedup();
      expect(dup.check('msg1')).to.be(false);
      dup.track('msg1');
      expect(dup.check('msg1')).to.be(true);
    });

    it('entries expire after age', function (done) {
      var Dedup = require('../dedup');
      var dup = Dedup({ age: 50 });
      dup.track('short-lived');
      expect(dup.check('short-lived')).to.be(true);
      setTimeout(function () {
        dup.purge();
        expect(dup.check('short-lived')).to.be(false);
        done();
      }, 100);
    });
  });

  describe('Off / Unsubscribe', function () {
    it('off stops receiving updates', function (done) {
      var gun = Gun();
      var count = 0;
      gun.get('off-test').put({ v: 1 });
      setTimeout(function () {
        var ref = gun.get('off-test');
        ref.on(function (data) {
          count++;
        });
        setTimeout(function () {
          ref.off();
          gun.get('off-test').put({ v: 2 });
          setTimeout(function () {
            expect(count).to.be(1);
            done();
          }, 100);
        }, 50);
      }, 50);
    });
  });

  describe('Back', function () {
    it('back returns parent', function () {
      var gun = Gun();
      var child = gun.get('a').get('b');
      var parent = child.back();
      expect(parent._.soul).to.be('a');
    });

    it('back(-1) returns root', function () {
      var gun = Gun();
      var deep = gun.get('a').get('b').get('c');
      var root = deep.back(-1);
      expect(root).to.be(gun);
    });

    it('back(Infinity) returns root', function () {
      var gun = Gun();
      var deep = gun.get('x').get('y');
      var root = deep.back(Infinity);
      expect(root).to.be(gun);
    });
  });
});
