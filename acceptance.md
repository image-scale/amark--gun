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
- [x] All 10 criteria met (see Round 4)

## Task 5: Mesh networking and peer-to-peer sync

### Acceptance Criteria
- [x] The mesh module can be created with a reference to a root gun instance
- [x] `mesh.hear(rawJSON, peer)` processes incoming JSON messages and routes them to the gun instance
- [x] `mesh.say(msg, peer)` serializes messages to JSON and sends them to a specific peer or broadcasts to all connected peers
- [x] `mesh.hi(peer)` registers a new peer, assigns an ID, and triggers a 'hi' event
- [x] `mesh.bye(peer)` removes a peer and triggers a 'bye' event
- [x] Messages are batched by default and flushed after a configurable gap period
- [x] The mesh correctly deduplicates messages to avoid sending the same data back to the sender
- [x] A peer identity exchange (handshake) occurs when peers connect
- [x] The mesh tracks how many peers are connected via `mesh.near`
- [x] Outgoing messages are forwarded to all peers via the mesh when the gun instance emits on the 'out' channel
- [x] Existing tests continue to pass (no regressions)
