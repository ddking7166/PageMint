# Benchmarks

This report covers the PC app Node.js and Bun runtimes. The Vite asset results were rerun after JS/CSS bundling, static in-memory caching, and HLS dynamic chunking were introduced.

## Environment

| Item | Value |
| --- | --- |
| Machine | Apple M4 |
| Memory | 24 GB |
| OS | macOS 26.5.1 |
| Node.js | v24.16.0 |
| Bun | 1.3.14 |
| Benchmark tool | autocannon v8.0.0 |
| App build | `pnpm --filter @pagemint/app-pc build` |
| Connections | 50 |
| Duration | 10 seconds per endpoint |
| Pipelining | 1 |

## Vite Asset Build

Build command:

```bash
pnpm --filter @pagemint/app-pc build
```

Vite output:

| Asset | Raw size | Gzip size |
| --- | ---: | ---: |
| `src/static/tailwind.css` | 44.25 kB | 8.82 kB |
| `src/static/build/assets/fanke-client-9qc1yr5Y.js` | 102.36 kB | 36.25 kB |
| `src/static/build/assets/hls-BdIOVraI.js` | 521.39 kB | 162.67 kB |

The CSS file contains Tailwind output and the existing PC stylesheet. The default JS entry contains the Fanke client modules plus `crypto-js`. `hls.js` is emitted as a dynamic chunk and is loaded only when HLS playback is needed.

## Current Static Asset Results

These measurements use the current static asset routes, including the bounded in-memory file cache added for Vite and public static files.

Commands used for each runtime:

```bash
PORT=3031 node apps/pc/dist/server.js
PORT=3032 pnpm --filter @pagemint/app-pc exec bun run dist/server.bun.js
```

Each runtime was warmed before throughput tests:

```bash
curl http://localhost:<port>/static/tailwind.css
curl http://localhost:<port>/static/build/assets/fanke-client-9qc1yr5Y.js
curl http://localhost:<port>/static/build/assets/hls-BdIOVraI.js
```

Then each endpoint was tested:

```bash
npx --yes autocannon -c 50 -d 10 --json http://localhost:<port>/static/tailwind.css
npx --yes autocannon -c 50 -d 10 --json http://localhost:<port>/static/build/assets/fanke-client-9qc1yr5Y.js
npx --yes autocannon -c 50 -d 10 --json http://localhost:<port>/static/build/assets/hls-BdIOVraI.js
```

Vite CSS static file:

| Runtime | Req/s avg | Latency avg | p50 | p90 | p99 | Errors |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Node.js | 34,645.10 | 1.15 ms | 1 ms | 2 ms | 3 ms | 0 |
| Bun | 70,067.20 | 0.10 ms | 0 ms | 0 ms | 1 ms | 0 |

Bun was 102.2% higher in average requests per second for the Vite CSS file.

Vite default JS entry:

| Runtime | Req/s avg | Latency avg | p50 | p90 | p99 | Errors |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Node.js | 23,699.20 | 1.49 ms | 1 ms | 3 ms | 4 ms | 0 |
| Bun | 37,212.00 | 1.05 ms | 1 ms | 1 ms | 2 ms | 0 |

Bun was 57.0% higher in average requests per second for the Vite default JS entry.

Vite HLS dynamic chunk:

| Runtime | Req/s avg | Latency avg | p50 | p90 | p99 | Errors |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Node.js | 7,956.73 | 5.80 ms | 5 ms | 7 ms | 12 ms | 0 |
| Bun | 8,101.20 | 5.68 ms | 5 ms | 6 ms | 12 ms | 0 |

Bun was 1.8% higher in average requests per second for the Vite HLS dynamic chunk.

## Previous Runtime Results

These earlier results were captured before the static in-memory cache and HLS dynamic chunk changes. They are kept only as a server-runtime reference. Rerun the static asset benchmark before using these numbers for current capacity planning.

Cold homepage first request:

| Runtime | Time |
| --- | ---: |
| Node.js | 403.519 ms |
| Bun | 416.233 ms |

Cache-hit homepage HTML:

| Runtime | Req/s avg | Latency avg | p50 | p90 | p99 | Errors |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Node.js | 2,363.91 | 20.63 ms | 20 ms | 21 ms | 41 ms | 0 |
| Bun | 9,612.80 | 4.76 ms | 5 ms | 5 ms | 10 ms | 0 |

Bun was 306.6% higher in average requests per second for cache-hit homepage HTML.

PNG static image:

| Runtime | Req/s avg | Latency avg | p50 | p90 | p99 | Errors |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Node.js | 2,243.60 | 21.98 ms | 21 ms | 23 ms | 43 ms | 0 |
| Bun | 2,191.60 | 22.59 ms | 22 ms | 24 ms | 44 ms | 0 |

Node.js was 2.3% higher in average requests per second for the PNG image in that earlier run.

## Interpretation

Vite now produces one minified CSS file, one default client entry, and a dynamic HLS chunk. That removes the many unbundled `/static/client/fanke/*.js` browser requests and the separate `crypto-js.js` / `hls.min.js` requests.

The default client entry is much smaller after moving `hls.js` behind a dynamic import. Further first-load optimization should focus on moving movie/live-only interaction code behind route-level entries.
