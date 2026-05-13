'use strict';

var CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXZabcdefghijklmnopqrstuvwxyz';

function randomId(len, charset) {
  var s = '';
  len = len || 24;
  charset = charset || CHARS;
  while (len-- > 0) {
    s += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return s;
}

function textMatch(text, pattern) {
  var u;
  if (typeof text !== 'string') return false;
  if (typeof pattern === 'string') { pattern = { '=': pattern }; }
  pattern = pattern || {};
  var tmp = (pattern['='] || pattern['*'] || pattern['>'] || pattern['<']);
  if (text === tmp) return true;
  if (u !== pattern['=']) return false;
  tmp = (pattern['*'] || pattern['>']);
  if (text.slice(0, (tmp || '').length) === tmp) return true;
  if (u !== pattern['*']) return false;
  if (u !== pattern['>'] && u !== pattern['<']) {
    return (text >= pattern['>'] && text <= pattern['<']) ? true : false;
  }
  if (u !== pattern['>'] && text >= pattern['>']) return true;
  if (u !== pattern['<'] && text <= pattern['<']) return true;
  return false;
}

function textHash(s, seed) {
  if (typeof s !== 'string') return;
  seed = seed || 0;
  if (!s.length) return seed;
  for (var i = 0, len = s.length, n; i < len; ++i) {
    n = s.charCodeAt(i);
    seed = ((seed << 5) - seed) + n;
    seed |= 0;
  }
  return seed;
}

var has = Object.prototype.hasOwnProperty;

function isPlain(o) {
  if (!o) return false;
  if (!(o instanceof Object)) return false;
  if (o.constructor === Object) return true;
  var tag = Object.prototype.toString.call(o).match(/^\[object (\w+)\]$/);
  return tag ? tag[1] === 'Object' : false;
}

function isEmpty(o, exclude) {
  for (var k in o) {
    if (has.call(o, k)) {
      if (exclude && exclude.indexOf(k) !== -1) continue;
      return false;
    }
  }
  return true;
}

function mixin(target, source, skip) {
  if (!source) return target;
  var keys = Object.keys(source);
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i];
    if (skip && skip.indexOf(k) !== -1) continue;
    target[k] = source[k];
  }
  return target;
}

exports.randomId = randomId;
exports.textMatch = textMatch;
exports.textHash = textHash;
exports.isPlain = isPlain;
exports.isEmpty = isEmpty;
exports.mixin = mixin;

if (typeof String.random === 'undefined') {
  String.random = randomId;
}
if (typeof String.match === 'undefined' || String.match === Function.prototype.call) {
  String.match = textMatch;
}
if (typeof String.hash === 'undefined') {
  String.hash = textHash;
}
if (typeof Object.plain === 'undefined') {
  Object.plain = isPlain;
}
if (typeof Object.empty === 'undefined') {
  Object.empty = isEmpty;
}
