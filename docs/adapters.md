# Adapters

PageMint ships Memory, File, and Redis-like cache adapters. The core package depends only on the `CacheStore` interface.

Custom adapters can store `CacheEntry` in any backing service as long as `get`, `set`, and `delete` preserve the same behavior.

See [API Reference](./api.md) for every adapter API, option, method, and parameter.
