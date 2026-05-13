'use strict';

function HAM(machineState, incomingState, currentState, incomingValue, currentValue) {
  if (incomingState > machineState) {
    return { defer: true };
  }
  if (incomingState < currentState) {
    return { historical: true };
  }
  if (incomingState === currentState) {
    var incomingLen = stringLen(incomingValue);
    var currentLen = stringLen(currentValue);
    if (incomingValue === currentValue || incomingLen <= currentLen) {
      return { converge: true, current: true };
    }
  }
  return { converge: true, incoming: true };
}

function stringLen(val) {
  if (val === undefined) return 0;
  try {
    return JSON.stringify(val).length;
  } catch (e) {
    return 0;
  }
}

module.exports = HAM;
