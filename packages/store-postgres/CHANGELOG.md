# @revizahoshii/hoshino-store-postgres

## 1.2.0

### Minor Changes

- 471ca18: Persist the contact's username handle. `WaStoredContactRecord` gained an
  optional `username` field, and every backend now reads and writes it: SQL
  providers add a `username` column through a new migration (`0020` on sqlite,
  `0021` on postgres and mysql), redis adds a hash field, and mongo adds a
  document field. The handle feeds the username-addressed blocklist and
  privacy-list identifiers.

## 1.1.0

### Minor Changes

- Add the `chatMetadata` cache backend, the domain the core now uses to resolve
  the per-chat disappearing settings on the send path. The store is registered in
  the backend factory and goes through the same lifecycle as its sibling cache
  domains: the MySQL and PostgreSQL cleanup pollers prune it (those backends have
  no server-side TTL), the Mongo lookup filters on `expires_at` instead of
  trusting the asynchronous sweep, the PostgreSQL expiry index is created with the
  table prefix so two stores cannot share one index, `deleteChatMetadata` and
  `cleanupExpired` return the affected row count their contract promises, and
  `chat_metadata_cache` is reachable through the SQLite `tableNames` override map.

    The domain only exists from core 1.7.0, so the `@revizahoshii/hoshino` peer range moves to
    `^1.7.0`.

### Patch Changes

- Persist `ephemeralSettingTimestamp` on the thread record, so an outgoing
  ephemeral message can carry the timestamp the peer expects instead of leaving
  the recipient warned that the message will not disappear. SQLite gets migration
  `0017_mailbox_threads_ephemeral_setting_timestamp`; the other backends widen the
  thread row in place.

## 1.0.2

### Patch Changes

- perf(store): write only the index/value delta in setCollectionStates

    Diff against the persisted state and write only the delta (upsert
    changed/new entries, delete removed ones, leave unchanged rows untouched)
    instead of rewriting the entire index_value set on every change.

## 1.0.1

### Patch Changes

- Stop `getOrGenPreKeys` from spinning when generated pre-key ids collide with already-stored ids.

## 1.0.0

### Major Changes

- Align with the `@revizahoshii/hoshino` 1.0.0 stable release. Now requires `@revizahoshii/hoshino@^1.0.0`.

## 0.3.0

### Minor Changes

- Split `WaSignalStore` into focused providers: `signal`, `preKey`, `session`, `identity`,
  and `messageSecret` stores (breaking for custom backends).
- Fix boolean type handling (true/false instead of 0/1) and prepared statement whitespace
  conflicts via query helper methods; harden backend with TTL validation, bounds checks,
  and chunked deletes.

## 0.2.0

### Minor Changes

- feat: add monorepo structure with optional store packages for SQLite, MySQL, PostgreSQL, Redis, and MongoDB
