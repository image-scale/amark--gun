# Acceptance Criteria

## Task 1: Core graph database with chainable get/put/on/once API
### Acceptance Criteria
- [x] All 20 criteria met (see Round 1)

## Task 2: HAM conflict resolution and graph merging

### Acceptance Criteria
- [ ] When two writes to the same key have different state timestamps, the one with the higher state wins
- [ ] When two writes have the same state timestamp, the one with the larger value (by JSON string comparison) wins
- [ ] When an incoming state is older than the current state for a key, it is discarded (no change to graph)
- [ ] When an incoming state is newer than the current state, the value is accepted and the graph updates
- [ ] Disjoint keys (different keys on the same node) merge independently without overwriting each other
- [ ] A mutation (changing an existing key's value with a newer state) correctly updates the stored value
- [ ] Multi-node graph merges (multiple nodes in a single put) work correctly
- [ ] HAM can be called directly with current state, incoming state, current value, incoming value and returns {converge, current, incoming, defer, err} indicating the resolution
- [ ] Clock state timestamps are used automatically when calling .put()
- [ ] Future-dated states with timestamps beyond current time are deferred and applied later
