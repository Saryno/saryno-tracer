# @saryno/tracer

OpenTelemetry-powered tracing library for Saryno services. Ships with batteries-included auto-instrumentation for Node.js, Express, NestJS, PostgreSQL, MySQL, Redis, GraphQL, and more.

## Install

The package is published to GitHub Packages. Point the `@saryno` scope at the GitHub registry in an
`.npmrc` (repo-local or `~/.npmrc`):

```
@saryno:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

`GITHUB_TOKEN` needs the `read:packages` scope. Then:

```bash
pnpm add @saryno/tracer
```

Requires Node 18+.

## Publishing

Run the **Publish** workflow from the Actions tab (`workflow_dispatch`). It publishes the version in
`package.json` by default; pass a `version` input to override (GitHub Packages rejects republishing an
existing version, so bump it for each test release).

## Basic Usage

```typescript
import tracer from '@saryno/tracer';

// Initialize once at startup
tracer.init();

// Create a custom span
await tracer.trace('checkout.process', async (span) => {
  span.setTag('order.id', orderId);
  return await processOrder();
});

// Emit a custom metric
tracer.metrics.increment('orders.created', 1, { plan: 'pro' });
```

## Configuration

Configuration merges init options, environment variables, and sensible defaults:

```typescript
tracer.init({
  service: 'my-service',           // OTEL_SERVICE_NAME, SARYNO_SERVICE
  version: '1.0.0',                // npm_package_version
  env: 'production',               // SARYNO_ENV, NODE_ENV
  endpoint: 'http://localhost:4318', // OTEL_EXPORTER_OTLP_ENDPOINT
  debug: false,                    // OTEL_DEBUG=true for console export
  diag: false,                     // OTEL_DIAG=true for diagnostics
  metricInterval: 10000,           // ms between metric exports
  instrumentations: {              // toggle per-instrumentation
    '@opentelemetry/instrumentation-fs': false, // disabled by default
    '@opentelemetry/instrumentation-redis': true,
  },
});
```

The `fs` instrumentation is disabled by default (too noisy). All others are on.

## Spans

### tracer.trace(name, fn)

Execute async or sync code wrapped in a span:

```typescript
await tracer.trace('db.query', async (span) => {
  span.setTag('sql.query', 'SELECT * FROM users');
  return db.query('SELECT * FROM users');
});
```

### tracer.trace(name, options, fn)

Pass span options:

```typescript
await tracer.trace('api.call', { tags: { 'http.method': 'POST' } }, async (span) => {
  return await fetch('/api/users');
});
```

### tracer.startSpan(name, options)

Manually manage span lifecycle (remember to call `span.end()`):

```typescript
const span = tracer.startSpan('manual.span');
await doWork();
span.end();
```

### tracer.wrap(name, fn, options)

Wrap a function to trace it automatically:

```typescript
const traceQuery = tracer.wrap('query', dbQuery);
await traceQuery('SELECT * FROM users');
```

## Metrics

### tracer.metrics.increment(name, value, tags)

Increment a counter:

```typescript
tracer.metrics.increment('requests.total', 1, { method: 'POST' });
```

### tracer.metrics.decrement(name, value, tags)

Decrement a counter (UpDownCounter under the hood):

```typescript
tracer.metrics.decrement('queue.pending');
```

### tracer.metrics.gauge(name, value, tags)

Record a gauge:

```typescript
tracer.metrics.gauge('memory.usage', process.memoryUsage().heapUsed);
```

### tracer.metrics.histogram(name, value, tags)

Record a histogram:

```typescript
tracer.metrics.histogram('response.time', elapsed, { endpoint: '/api/users' });
```

### tracer.metrics.distribution(name, value, tags)

Alias for histogram:

```typescript
tracer.metrics.distribution('latency', elapsed);
```

### tracer.metrics.timing(name, ms, tags)

Record a duration in milliseconds:

```typescript
const start = Date.now();
await doWork();
tracer.metrics.timing('work.duration', Date.now() - start);
```

## NestJS / Express

Initialize at the very top of your entry point, **before** creating the Nest app:

```typescript
// src/main.ts
import tracer from '@saryno/tracer';

tracer.init();

const app = await NestFactory.create(AppModule);
await app.listen(3000);
```

HTTP, Express, and NestJS are auto-instrumented; spans flow through all middleware and route handlers.

## Next.js

Create `instrumentation.ts` (nodejs runtime) in your app root:

```typescript
// instrumentation.ts
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { default: tracer } = await import('@saryno/tracer');
    tracer.init({ service: 'saryno-web' });
  }
}
```

Next.js will call `register()` at startup. Server spans (API routes, middleware) flow through the OTel SDK.

## Supported Instrumentations

Auto-enabled by default:

- `@opentelemetry/instrumentation-http` — Node HTTP/HTTPS
- `@opentelemetry/instrumentation-express` — Express middleware
- `@opentelemetry/instrumentation-nestjs-core` — NestJS
- `@opentelemetry/instrumentation-pg` — PostgreSQL
- `@opentelemetry/instrumentation-mysql` — MySQL
- `@opentelemetry/instrumentation-mysql2` — MySQL2
- `@opentelemetry/instrumentation-redis` — redis
- `@opentelemetry/instrumentation-ioredis` — ioredis
- `@opentelemetry/instrumentation-mongodb` — MongoDB
- `@opentelemetry/instrumentation-graphql` — GraphQL
- `@opentelemetry/instrumentation-undici` — fetch / undici

Disabled by default:

- `@opentelemetry/instrumentation-fs` — File system (too noisy)

Disable any instrumentation via init:

```typescript
tracer.init({
  instrumentations: {
    '@opentelemetry/instrumentation-mongodb': false,
  },
});
```

## Debug

Set `OTEL_DEBUG=true` to print all spans to console (for local development):

```bash
OTEL_DEBUG=true node app.js
```

Set `OTEL_DIAG=true` to enable OpenTelemetry diagnostics logging.

## Shutdown

Gracefully shut down the tracer (flushes pending spans and metrics):

```typescript
await tracer.shutdown();
```

Called automatically on SIGTERM.
