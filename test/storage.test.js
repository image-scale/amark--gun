'use strict';

var expect = require('expect.js');
var fs = require('fs');
var path = require('path');
var Gun = require('../index');

var testDir = path.join(__dirname, '..', '.test-data');

function testFile(name) {
  return path.join(testDir, name + '.json');
}

function cleanup(filePath) {
  try { fs.unlinkSync(filePath); } catch (e) {}
}

describe('Local Storage Persistence', function () {
  this.timeout(5000);

  before(function () {
    try { fs.mkdirSync(testDir, { recursive: true }); } catch (e) {}
  });

  after(function () {
    try { fs.rmSync(testDir, { recursive: true, force: true }); } catch (e) {}
  });

  it('creates a storage adapter via file option', function () {
    var fp = testFile('create-test');
    cleanup(fp);
    var gun = Gun({ file: fp });
    expect(gun._.store).to.be.ok();
    expect(typeof gun._.store.put).to.be('function');
    expect(typeof gun._.store.get).to.be('function');
  });

  it('persists data written via put to disk', function (done) {
    var fp = testFile('persist-put');
    cleanup(fp);
    var gun = Gun({ file: fp });

    gun.get('user').put({ name: 'Alice', age: 30 });

    setTimeout(function () {
      gun._.store.flush();
      var raw = fs.readFileSync(fp, 'utf8');
      var data = JSON.parse(raw);
      expect(data.user).to.be.ok();
      expect(data.user.name).to.be('Alice');
      expect(data.user.age).to.be(30);
      done();
    }, 400);
  });

  it('reloads persisted data in a new Gun instance', function (done) {
    var fp = testFile('reload-test');
    cleanup(fp);
    var gun1 = Gun({ file: fp });

    gun1.get('config').put({ theme: 'dark', lang: 'en' });

    setTimeout(function () {
      gun1._.store.flush();

      var gun2 = Gun({ file: fp });
      expect(gun2._.graph.config).to.be.ok();
      expect(gun2._.graph.config.theme).to.be('dark');
      expect(gun2._.graph.config.lang).to.be('en');
      done();
    }, 400);
  });

  it('reloaded data is accessible via on', function (done) {
    var fp = testFile('reload-on');
    cleanup(fp);
    var gun1 = Gun({ file: fp });

    gun1.get('animal').put({ species: 'cat' });

    setTimeout(function () {
      gun1._.store.flush();

      var gun2 = Gun({ file: fp });
      gun2.get('animal').on(function (data) {
        expect(data.species).to.be('cat');
        done();
      });
    }, 400);
  });

  it('batches rapid writes and flushes once', function (done) {
    var fp = testFile('batch-test');
    cleanup(fp);
    var gun = Gun({ file: fp, batch: 200 });

    gun.get('counter').put({ a: 1 });
    gun.get('counter').put({ b: 2 });
    gun.get('counter').put({ c: 3 });

    setTimeout(function () {
      gun._.store.flush();
      var raw = fs.readFileSync(fp, 'utf8');
      var data = JSON.parse(raw);
      expect(data.counter).to.be.ok();
      expect(data.counter.a).to.be(1);
      expect(data.counter.b).to.be(2);
      expect(data.counter.c).to.be(3);
      done();
    }, 500);
  });

  it('preserves graph metadata (souls and states)', function (done) {
    var fp = testFile('metadata-test');
    cleanup(fp);
    var gun = Gun({ file: fp });

    gun.get('meta-node').put({ val: 42 });

    setTimeout(function () {
      gun._.store.flush();
      var raw = fs.readFileSync(fp, 'utf8');
      var data = JSON.parse(raw);
      var node = data['meta-node'];
      expect(node).to.be.ok();
      expect(node._['#']).to.be('meta-node');
      expect(node._['>'].val).to.be.a('number');
      expect(node.val).to.be(42);
      done();
    }, 400);
  });

  it('handles get requests from storage when data not in memory', function (done) {
    var fp = testFile('get-from-storage');
    cleanup(fp);

    var seedData = {
      'stored-item': {
        _: { '#': 'stored-item', '>': { info: Date.now() } },
        info: 'from-disk'
      }
    };
    fs.writeFileSync(fp, JSON.stringify(seedData), 'utf8');

    var gun = Gun({ file: fp });

    gun.get('stored-item').on(function (data) {
      expect(data.info).to.be('from-disk');
      done();
    });
  });

  it('works when no storage file exists yet', function (done) {
    var fp = testFile('fresh-start-' + Date.now());
    cleanup(fp);
    var gun = Gun({ file: fp });

    gun.get('fresh').put({ x: 1 });

    setTimeout(function () {
      gun._.store.flush();
      expect(fs.existsSync(fp)).to.be(true);
      var data = JSON.parse(fs.readFileSync(fp, 'utf8'));
      expect(data.fresh.x).to.be(1);
      done();
    }, 400);
  });

  it('storage file uses valid JSON format', function (done) {
    var fp = testFile('json-format');
    cleanup(fp);
    var gun = Gun({ file: fp });

    gun.get('format').put({ key: 'value' });

    setTimeout(function () {
      gun._.store.flush();
      var raw = fs.readFileSync(fp, 'utf8');
      var parsed;
      try {
        parsed = JSON.parse(raw);
      } catch (e) {
        expect().fail('Storage file is not valid JSON');
      }
      expect(parsed).to.be.an('object');
      done();
    }, 400);
  });

  it('does not create storage when file option is not provided', function () {
    var gun = Gun();
    expect(gun._.store).to.be(undefined);
  });

  it('existing tests continue to pass without file option', function (done) {
    var gun = Gun();
    gun.get('no-storage').put({ val: 1 });
    gun.get('no-storage').on(function (data) {
      expect(data.val).to.be(1);
      done();
    });
  });
});
