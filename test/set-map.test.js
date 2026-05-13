'use strict';

var expect = require('expect.js');
var Gun = require('../index');

describe('Set Collections and Map Iteration', function () {
  this.timeout(5000);

  describe('Set', function () {
    it('set with plain object generates unique soul and links', function (done) {
      var gun = Gun();
      var list = gun.get('todos');
      list.set({ text: 'Buy milk', done: false });
      list.set({ text: 'Walk dog', done: true });

      setTimeout(function () {
        var g = gun._.graph;
        var todosNode = g['todos'];
        expect(todosNode).to.be.ok();
        var keys = Object.keys(todosNode).filter(function (k) { return k !== '_'; });
        expect(keys.length).to.be(2);

        var firstKey = keys[0];
        var ref = Gun.valid(todosNode[firstKey]);
        expect(typeof ref).to.be('string');
        expect(g[ref]).to.be.ok();
        done();
      }, 100);
    });

    it('set returns the item chain for further chaining', function (done) {
      var gun = Gun();
      var item = gun.get('items').set({ name: 'test' });
      expect(Gun.is(item)).to.be(true);
      done();
    });

    it('each set call creates a different entry', function (done) {
      var gun = Gun();
      var list = gun.get('unique-items');
      list.set({ v: 1 });
      list.set({ v: 2 });
      list.set({ v: 3 });

      setTimeout(function () {
        var node = gun._.graph['unique-items'];
        expect(node).to.be.ok();
        var keys = Object.keys(node).filter(function (k) { return k !== '_'; });
        expect(keys.length).to.be(3);
        done();
      }, 100);
    });

    it('set with Gun node links existing node', function (done) {
      var gun = Gun();
      var user = gun.get('user-123').put({ name: 'Alice', age: 30 });

      setTimeout(function () {
        gun.get('user-list').set(gun.get('user-123'));

        setTimeout(function () {
          var g = gun._.graph;
          var list = g['user-list'];
          expect(list).to.be.ok();
          var found = false;
          Object.keys(list).forEach(function (k) {
            if (k === '_') return;
            var ref = Gun.valid(list[k]);
            if (ref === 'user-123') found = true;
          });
          expect(found).to.be(true);
          done();
        }, 100);
      }, 50);
    });
  });

  describe('Map', function () {
    it('map().on() iterates over all properties', function (done) {
      var gun = Gun();
      gun.get('people').put({ alice: { name: 'Alice' }, bob: { name: 'Bob' } });

      setTimeout(function () {
        var seen = {};
        gun.get('people').map().on(function (v, k) {
          seen[k] = v;
          if (Object.keys(seen).length >= 2) {
            clearTimeout(done.to);
            done.to = setTimeout(function () {
              expect(seen.alice).to.be.ok();
              expect(seen.bob).to.be.ok();
              done();
            }, 50);
          }
        });
      }, 50);
    });

    it('map fires for each existing key', function (done) {
      var gun = Gun();
      gun.get('colors').put({ red: '#ff0000', blue: '#0000ff', green: '#00ff00' });

      setTimeout(function () {
        var count = 0;
        var seen = {};
        gun.get('colors').map().on(function (v, k) {
          seen[k] = v;
          count++;
          if (count >= 3) {
            clearTimeout(done.to);
            done.to = setTimeout(function () {
              expect(seen.red).to.be('#ff0000');
              expect(seen.blue).to.be('#0000ff');
              expect(seen.green).to.be('#00ff00');
              done();
            }, 50);
          }
        });
      }, 50);
    });

    it('map with transform function', function (done) {
      var gun = Gun();
      gun.get('nums').put({ a: 1, b: 2, c: 3 });

      setTimeout(function () {
        var results = {};
        gun.get('nums').map(function (v, k) {
          return v * 2;
        }).on(function (v, k) {
          results[k] = v;
          if (Object.keys(results).length >= 3) {
            clearTimeout(done.to);
            done.to = setTimeout(function () {
              expect(results.a).to.be(2);
              expect(results.b).to.be(4);
              expect(results.c).to.be(6);
              done();
            }, 50);
          }
        });
      }, 50);
    });

    it('map on set collection iterates items', function (done) {
      var gun = Gun();
      var list = gun.get('set-map-test');
      list.set({ fruit: 'apple' });
      list.set({ fruit: 'banana' });

      setTimeout(function () {
        var items = [];
        list.map().on(function (v, k) {
          if (v && typeof v === 'object' && v.fruit) {
            items.push(v.fruit);
          }
          if (items.length >= 2) {
            clearTimeout(done.to);
            done.to = setTimeout(function () {
              expect(items).to.contain('apple');
              expect(items).to.contain('banana');
              done();
            }, 50);
          }
        });
      }, 100);
    });

    it('map returns cached each chain on subsequent calls', function () {
      var gun = Gun();
      var ref = gun.get('cached-map');
      var m1 = ref.map();
      var m2 = ref.map();
      expect(m1).to.be(m2);
    });
  });
});
