# @saryno/tracer

OpenTelemetry-powered tracing for Node.js services. Batteries-included auto-instrumentation for Express, NestJS, PostgreSQL, Redis, and more.

## Install

```bash
npm install @saryno/tracer
# or
pnpm add @saryno/tracer
```

Requires Node 18+.

## Usage

```typescript
import tracer from '@saryno/tracer';

// Initialize once at startup, before anything else
tracer.init({ service: 'my-service' });

// Custom span
await tracer.trace('checkout.process', async (span) => {
  span.setTag('order.id', orderId);
  return await processOrder();
});

// Metrics
tracer.metrics.increment('orders.created', 1, { plan: 'pro' });
```

## Configuration

```typescript
tracer.init({
  service: 'my-service',             // or OTEL_SERVICE_NAME
  version: '1.0.0',
  env: 'production',                 // or NODE_ENV
  endpoint: 'http://localhost:4318', // or OTEL_EXPORTER_OTLP_ENDPOINT
  debug: false,                      // OTEL_DEBUG=true for console output
  metricInterval: 10000,             // ms between metric exports
  instrumentations: {
    '@opentelemetry/instrumentation-mongodb': false, // disable any instrumentation
  },
});
```

## NestJS / Express

Call `tracer.init()` **before** creating your app:

```typescript
// src/main.ts
import tracer from '@saryno/tracer';
tracer.init({ service: 'my-api' });

const app = await NestFactory.create(AppModule);
await app.listen(3000);
```

## Next.js

```typescript
// instrumentation.ts
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { default: tracer } = await import('@saryno/tracer');
    tracer.init({ service: 'my-app' });
  }
}
```

## Spans

```typescript
// Wrap async code in a span
await tracer.trace('db.query', async (span) => {
  span.setTag('sql.table', 'users');
  return db.query('SELECT * FROM users');
});

// Manual span lifecycle
const span = tracer.startSpan('manual.span');
await doWork();
span.end();

// Wrap a function
const traceQuery = tracer.wrap('query', dbQuery);
await traceQuery('SELECT * FROM users');
```

## Metrics

```typescript
tracer.metrics.increment('requests.total', 1, { method: 'POST' });
tracer.metrics.decrement('queue.pending');
tracer.metrics.gauge('memory.usage', process.memoryUsage().heapUsed);
tracer.metrics.histogram('response.time', elapsed, { endpoint: '/api/users' });
tracer.metrics.timing('work.duration', Date.now() - start);
```

## Auto-instrumented libraries

Enabled by default: HTTP, Express, NestJS, PostgreSQL, MySQL, MySQL2, Redis, ioredis, MongoDB, GraphQL, fetch/undici.

Disabled by default: `fs` (too noisy).

## Debug

```bash
OTEL_DEBUG=true node app.js   # print spans to console
OTEL_DIAG=true node app.js    # OTel diagnostics logging
```

## Shutdown

```typescript
await tracer.shutdown(); // flushes pending spans & metrics
```

Called automatically on SIGTERM.