# Acceptance Criteria

## Task 1: Core graph database with chainable get/put/on/once API
### Acceptance Criteria
- [x] All 20 criteria met (see Round 1)

## Task 2: HAM conflict resolution and graph merging
### Acceptance Criteria
- [x] All 10 criteria met (see Round 2)

## Task 3: Nested object writes and automatic reference following

### Acceptance Criteria
- [ ] When putting a nested object like `{car: {make: 'Toyota'}}`, inner objects are stored as separate graph nodes linked by soul references `{'#': 'soul'}`
- [ ] `gun.get('alice').put({name: 'Alice', car: {make: 'Toyota', year: 2020}})` creates nodes for alice and alice/car, where alice.car is a soul reference
- [ ] Chain traversal like `gun.get('alice').get('car').get('make').once(cb)` follows the soul reference transparently and returns 'Toyota'
- [ ] When a reference target is updated (e.g., alice's car is changed), subscribers to the old chain see the new data
- [ ] `gun.get('alice').get('car').on(cb)` fires with the car node data, following the reference
- [ ] Multiple levels of nesting work: `{a: {b: {c: 'deep'}}}` creates separate nodes for each level
- [ ] The `statedisk` helper writes data to a gun instance synchronously for testing
- [ ] Circular references between nodes don't cause infinite loops
- [ ] Existing tests continue to pass (no regressions)
