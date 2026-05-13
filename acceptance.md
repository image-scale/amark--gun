# Acceptance Criteria

## Task 1: Core graph database with chainable get/put/on/once API

### Acceptance Criteria
- [ ] Creating a database instance with `DB()` or `new DB()` returns a working instance
- [ ] `DB.is(instance)` returns true for DB instances, false for everything else
- [ ] `DB.valid(val)` returns true for valid values (null, string, boolean, finite number), returns the soul string for soul references `{'#': 'soul'}`, returns false for invalid values (undefined, arrays, objects, functions, NaN, Infinity)
- [ ] `db.get('key')` returns a chainable reference to a node in the graph
- [ ] `db.get('key').get('prop')` chains to navigate deeper into the graph
- [ ] `db.get('key').put({name: 'Alice', age: 30})` writes data to the graph
- [ ] `db.get('key').put(data, cb)` calls callback with ack when write completes
- [ ] `db.get('key').on(cb)` subscribes to changes, callback fires on every update with `(data, key)`
- [ ] `db.get('key').once(cb)` reads data once and calls callback with `(data, key)` 
- [ ] `db.get('key').off()` unsubscribes and cleans up listeners
- [ ] Data written with `.put()` is readable via `.on()` and `.once()`
- [ ] `.on()` fires again when data is updated
- [ ] Graph stores data as nodes with soul identity `{'_': {'#': soul, '>': {key: state}}}`
- [ ] State vector clocks are monotonically increasing timestamps
- [ ] The internal event emitter supports subscribe, unsubscribe, and event propagation
- [ ] String.random() generates random alphanumeric strings of configurable length
- [ ] Object.plain() correctly identifies plain objects vs arrays, dates, functions, etc
- [ ] Object.empty() checks if an object has no own properties, with optional exclusion list
- [ ] Deduplication prevents processing the same message twice
- [ ] `db.get('a').get('b').put('value')` generates predictable soul paths like 'a/b'
