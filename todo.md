# Todo

## Plan
Build the graph database engine bottom-up by feature. Start with the core graph store and chainable API with put/get/on, then add conflict resolution (HAM), then sets and map iteration, then networking. Each task delivers a testable user-facing feature.

## Tasks
- [x] Task 1: Core graph database with chainable get/put/on/once API — users can create a database instance, navigate the graph with .get(key), write data with .put(data), subscribe to changes with .on(cb), read data once with .once(cb), and unsubscribe with .off(). Includes utility functions, value validation, state vector clocks, event emitter, deduplication, and request/response system as internal infrastructure.
- [x] Task 2: HAM conflict resolution and graph merging — when multiple writes happen to the same key, the HAM algorithm resolves conflicts using state timestamps. Newer states win, ties are broken by value comparison. Future-dated writes are deferred. The graph correctly merges data from multiple sources.
- [x] Task 3: Nested object writes and automatic reference following — when users put nested objects, inner objects are automatically stored as separate graph nodes linked by soul references. Chain traversal transparently follows these references so gun.get('alice').get('car').get('name') resolves through links.
- [>] Task 4: Set collections and map iteration — users can add items to unordered collections with .set(item), and iterate/subscribe to all properties of a node with .map(cb). Map supports filtering and transforms.
- [ ] Task 5: Mesh networking and peer-to-peer sync — the database can connect to peers via WebSocket, synchronize data bidirectionally, handle peer connect/disconnect, batch messages, and deduplicate across the network. Includes the DAM protocol for peer identity exchange.
- [ ] Task 6: Local storage persistence — data persists to localStorage (or a file-based store in Node.js) so it survives page reloads. The adapter handles reading, writing, and batching writes for performance.
