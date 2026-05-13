# Acceptance Criteria

## Task 1: Core graph database with chainable get/put/on/once API
### Acceptance Criteria
- [x] All 20 criteria met (see Round 1)

## Task 2: HAM conflict resolution and graph merging
### Acceptance Criteria
- [x] All 10 criteria met (see Round 2)

## Task 3: Nested object writes and automatic reference following
### Acceptance Criteria
- [x] All 9 criteria met (see Round 3)

## Task 4: Set collections and map iteration

### Acceptance Criteria
- [ ] `.set(plainObj)` adds an item to an unordered collection by generating a UUID soul, storing the object at that soul, and linking it from the parent node
- [ ] `.set(gunNode)` links an existing node into the collection by its soul
- [ ] Each `.set()` call produces a unique entry in the parent node
- [ ] `.set()` returns the item chain for further chaining
- [ ] `.map()` without a callback creates an "each" chain that iterates over all properties of a node
- [ ] `.map().on(cb)` fires callback for each property of a node with `(value, key)`
- [ ] `.map()` emits the full node data for properties that are soul references
- [ ] `.map().on()` fires for existing properties and also for newly added ones
- [ ] `.map(transformFn)` applies a transform function to each value before passing downstream
- [ ] Existing tests continue to pass (no regressions)
