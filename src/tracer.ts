import {
  trace,
  diag,
  DiagConsoleLogger,
  DiagLogLevel,
  context,
  SpanStatusCode,
} from "@opentelemetry/api";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { ConsoleSpanExporter } from "@opentelemetry/sdk-trace-node";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";
import { resolveConfig } from "./config.js";
import { buildInstrumentations } from "./instrumentations.js";
import { Metrics } from "./metrics.js";
import type { TracerConfig, SpanOptions, SarynoSpan } from "./types.js";

export class Tracer {
  private sdk?: NodeSDK;
  private started = false;
  public metrics = new Metrics();

  init(options?: TracerConfig): this {
    if (this.started) {
      return this;
    }

    const config = resolveConfig(options);

    if (config.diag) {
      diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
    }

    const headers = config.apiKey ? { "X-API-Key": config.apiKey } : undefined;

    const traceExporter = config.debug
      ? new ConsoleSpanExporter()
      : new OTLPTraceExporter({ url: config.tracesUrl, headers });

    this.sdk = new NodeSDK({
      resource: resourceFromAttributes({
        [SemanticResourceAttributes.SERVICE_NAME]: config.service,
        [SemanticResourceAttributes.SERVICE_VERSION]: config.version,
        "deployment.environment": config.env,
      }),
      traceExporter,
      metricReader: new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter({
          url: config.metricsUrl,
          headers,
        }),
        exportIntervalMillis: config.metricInterval,
      }),
      instrumentations: buildInstrumentations(config),
    });

    this.sdk.start();
    this.started = true;

    console.log(
      `OpenTelemetry SDK started [traces=${config.tracesUrl}, apiKey=${config.apiKey ? "set" : "none"}, debug=${config.debug}]`,
    );

    process.on("SIGTERM", () => {
      this.shutdown()
        .then(() => console.log("OpenTelemetry SDK shut down successfully"))
        .catch((error) =>
          console.error("Error shutting down OpenTelemetry SDK", error),
        );
    });

    return this;
  }

  async trace<T>(
    name: string,
    fnOrOptions: ((span: SarynoSpan) => T | Promise<T>) | SpanOptions,
    fn?: (span: SarynoSpan) => T | Promise<T>,
  ): Promise<T> {
    const [options, callback] =
      typeof fnOrOptions === "function"
        ? [{}, fnOrOptions as (span: SarynoSpan) => T | Promise<T>]
        : [fnOrOptions, fn as (span: SarynoSpan) => T | Promise<T>];

    const tracer = trace.getTracer("@saryno/tracer");
    const opts = options as Record<string, unknown>;

    return new Promise((resolve, reject) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const span = tracer.startSpan(name, opts as any);
      const sarynoSpan = this.augmentSpan(span);

      if (opts.tags) {
        Object.entries(opts.tags).forEach(([key, value]) => {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          sarynoSpan.setAttribute(key, value);
        });
      }

      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      context.with(trace.setSpan(context.active(), sarynoSpan), async () => {
        try {
          const result = callback(sarynoSpan);
          if (result instanceof Promise) {
            const resolved = await result;
            sarynoSpan.end();
            resolve(resolved);
          } else {
            sarynoSpan.end();
            resolve(result);
          }
        } catch (error) {
          sarynoSpan.recordException(error as Error);
          sarynoSpan.setStatus({ code: SpanStatusCode.ERROR });
          sarynoSpan.end();
          reject(error);
        }
      });
    });
  }

  wrap<T extends (...args: any[]) => any>(
    name: string,
    fn: T,
    options?: SpanOptions,
  ): (...args: Parameters<T>) => Promise<ReturnType<T>> {
    return (...args: Parameters<T>) =>
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      this.trace(name, options ?? {}, () => fn(...args));
  }

  startSpan(name: string, options?: SpanOptions): SarynoSpan {
    const tracer = trace.getTracer("@saryno/tracer");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const span = tracer.startSpan(name, options as any);

    if (options?.tags) {
      Object.entries(options.tags).forEach(([key, value]) => {
        span.setAttribute(key, value);
      });
    }

    return this.augmentSpan(span);
  }

  scope() {
    return {
      active: () => trace.getActiveSpan(),
    };
  }

  private augmentSpan(span: any): SarynoSpan {
    span.setTag = (key: string, value: string | number | boolean): any => {
      span.setAttribute(key, value);
      return span;
    };
    return span;
  }

  async shutdown(): Promise<void> {
    if (this.sdk) {
      await this.sdk.shutdown();
    }
  }
}
