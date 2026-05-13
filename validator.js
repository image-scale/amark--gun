'use strict';

function Validator(val) {
  if (val === null) return true;
  if (val === undefined) return false;
  var type = typeof val;
  if (type === 'string') return true;
  if (type === 'boolean') return true;
  if (type === 'number') {
    if (val !== val) return false; // NaN
    if (val === Infinity || val === -Infinity) return false;
    return true;
  }
  if (type === 'object') {
    var keys = Object.keys(val);
    if (keys.length === 1 && keys[0] === '#' && typeof val['#'] === 'string') {
      return val['#'];
    }
    return false;
  }
  return false;
}

module.exports = Validator;
