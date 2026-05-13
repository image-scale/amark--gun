'use strict';

var expect = require('expect.js');
var Gun = require('../index');

describe('Nested Objects and Reference Following', function () {
  this.timeout(5000);

  describe('Nested object writes', function () {
    it('nested plain objects become separate nodes with soul references', function (done) {
      var gun = Gun();
      gun.get('alice').put({ name: 'Alice', car: { make: 'Toyota', year: 2020 } });

      setTimeout(function () {
        var g = gun._.graph;
        expect(g['alice']).to.be.ok();
        expect(g['alice'].name).to.be('Alice');
        var carRef = g['alice'].car;
        expect(carRef).to.be.ok();
        expect(typeof Gun.valid(carRef)).to.be('string');
        var carSoul = Gun.valid(carRef);
        expect(g[carSoul]).to.be.ok();
        expect(g[carSoul].make).to.be('Toyota');
        expect(g[carSoul].year).to.be(2020);
        done();
      }, 50);
    });

    it('multiple levels of nesting create separate nodes', function (done) {
      var gun = Gun();
      gun.get('deep').put({ a: { b: { c: 'value' } } });

      setTimeout(function () {
        var g = gun._.graph;
        expect(g['deep']).to.be.ok();
        var aRef = Gun.valid(g['deep'].a);
        expect(aRef).to.be.ok();
        expect(g[aRef]).to.be.ok();
        var bRef = Gun.valid(g[aRef].b);
        expect(bRef).to.be.ok();
        expect(g[bRef]).to.be.ok();
        expect(g[bRef].c).to.be('value');
        done();
      }, 50);
    });

    it('predictable soul paths for nested objects', function (done) {
      var gun = Gun();
      gun.get('users').put({ admin: { role: 'admin', perms: { read: true } } });

      setTimeout(function () {
        var g = gun._.graph;
        expect(g['users']).to.be.ok();
        expect(g['users/admin']).to.be.ok();
        expect(g['users/admin'].role).to.be('admin');
        expect(g['users/admin/perms']).to.be.ok();
        expect(g['users/admin/perms'].read).to.be(true);
        done();
      }, 50);
    });
  });

  describe('Reference following', function () {
    it('chain traversal follows soul references', function (done) {
      var gun = Gun();
      gun.get('bob').put({ name: 'Bob', pet: { species: 'cat', name: 'Whiskers' } });

      setTimeout(function () {
        gun.get('bob').get('pet').get('name').once(function (data, key) {
          expect(data).to.be('Whiskers');
          expect(key).to.be('name');
          done();
        });
      }, 50);
    });

    it('on follows soul references for property access', function (done) {
      var gun = Gun();
      gun.get('carol').put({ name: 'Carol', job: { title: 'Engineer', level: 5 } });

      setTimeout(function () {
        gun.get('carol').get('job').get('title').on(function (data, key) {
          expect(data).to.be('Engineer');
          if (!done.called) { done.called = true; done(); }
        });
      }, 50);
    });

    it('on on a linked node gets the full node data', function (done) {
      var gun = Gun();
      gun.get('dave').put({ name: 'Dave', address: { city: 'NYC', zip: '10001' } });

      setTimeout(function () {
        gun.get('dave').get('address').once(function (data, key) {
          expect(data).to.be.ok();
          expect(data.city).to.be('NYC');
          expect(data.zip).to.be('10001');
          done();
        });
      }, 50);
    });

    it('deep chain traversal through multiple links', function (done) {
      var gun = Gun();
      gun.get('org').put({
        name: 'Acme',
        hq: { location: { city: 'SF', state: 'CA' } }
      });

      setTimeout(function () {
        gun.get('org').get('hq').get('location').get('city').once(function (data) {
          expect(data).to.be('SF');
          done();
        });
      }, 50);
    });
  });

  describe('statedisk helper', function () {
    it('writes data synchronously for testing', function (done) {
      var gun = Gun();
      Gun.statedisk({ name: 'TestUser', age: 25 }, 'sd-test', function () {
        done();
      });
    });
  });

  describe('Circular and edge cases', function () {
    it('does not crash on shallow circular-like structure', function (done) {
      var gun = Gun();
      gun.get('nodeA').put({ name: 'A', friend: 'B' });
      gun.get('nodeB').put({ name: 'B', friend: 'A' });

      setTimeout(function () {
        expect(gun._.graph['nodeA'].name).to.be('A');
        expect(gun._.graph['nodeB'].name).to.be('B');
        done();
      }, 50);
    });

    it('put on a linked node path creates correct graph', function (done) {
      var gun = Gun();
      gun.get('parent2').get('child2').get('grandchild').put('hello');

      setTimeout(function () {
        var g = gun._.graph;
        expect(g['parent2']).to.be.ok();
        expect(g['parent2/child2']).to.be.ok();
        expect(g['parent2/child2'].grandchild).to.be('hello');
        done();
      }, 50);
    });

    it('updating a nested value notifies listeners on parent chain', function (done) {
      var gun = Gun();
      var count = 0;
      gun.get('watch-parent').put({ x: 1, nested: { y: 2 } });

      setTimeout(function () {
        gun.get('watch-parent').on(function (data) {
          count++;
          if (count === 1) {
            expect(data.x).to.be(1);
            gun.get('watch-parent').put({ x: 10 });
          }
          if (count >= 2) {
            expect(data.x).to.be(10);
            done();
          }
        });
      }, 50);
    });
  });
});
