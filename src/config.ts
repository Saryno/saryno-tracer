import type { TracerConfig } from "./types.js";

export function resolveConfig(options?: TracerConfig): Required<TracerConfig> {
  const service =
    options?.service ||
    process.env.OTEL_SERVICE_NAME ||
    process.env.SARYNO_SERVICE ||
    "saryno-service";
  const version =
    options?.version || process.env.npm_package_version || "0.0.1";
  const env =
    options?.env ||
    process.env.SARYNO_ENV ||
    process.env.NODE_ENV ||
    "development";
  const endpoint =
    options?.endpoint ||
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT ||
    "http://localhost:4318";
  const tracesUrl =
    options?.tracesUrl ||
    process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ||
    `${endpoint}/v1/traces`;
  const metricsUrl =
    options?.metricsUrl ||
    process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT ||
    `${endpoint}/v1/metrics`;
  const debug = (options?.debug ?? false) || process.env.OTEL_DEBUG === "true";
  const diag =
    (options?.diag ?? false) || debug || process.env.OTEL_DIAG === "true";
  const metricInterval = options?.metricInterval ?? 10000;
  const instrumentations = options?.instrumentations ?? {};

  return {
    service,
    version,
    env,
    endpoint,
    tracesUrl,
    metricsUrl,
    debug,
    diag,
    metricInterval,
    instrumentations,
  };
}
