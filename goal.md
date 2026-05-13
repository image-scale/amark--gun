# Goal

## Project
gun — a javascript project.

## Description
A realtime, decentralized, offline-first, graph data synchronization engine. GUN provides a chainable API for reading and writing data to an in-memory graph database with conflict resolution via the HAM (Hypothetical Amnesia Machine) algorithm. It supports real-time subscriptions, graph traversal with automatic reference following, set collections, peer-to-peer networking via WebSockets, and local persistence.

## Scope
- ~15 production source files to implement
- ~5 test files to write
- Core capabilities:
  1. Graph data store with soul-based node identity and state vector clocks
  2. HAM conflict resolution algorithm (CRDT-style merge)
  3. Chainable API: get, put, on, once, set, map, off, back, opt
  4. Event-driven message routing (in/out channels on every chain)
  5. Deduplication of messages
  6. Request/response semantics (ask system)
  7. Value validation (only primitives and soul references allowed)
  8. Automatic reference following (link/unlink)
  9. Mesh networking layer for peer-to-peer sync
  10. WebSocket transport adapter
  11. Local storage persistence adapter
  12. Utility functions (random strings, hashing, object helpers, async scheduling)
