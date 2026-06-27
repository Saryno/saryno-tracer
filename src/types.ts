import type { Span, Context } from "@opentelemetry/api";

export type Tags = Record<string, string | number | boolean>;

export interface SpanOptions {
  tags?: Tags;
  childOf?: Span | Context;
}

export interface TracerConfig {
  service?: string;
  version?: string;
  env?: string;
  endpoint?: string;
  tracesUrl?: string;
  metricsUrl?: string;
  debug?: boolean;
  diag?: boolean;
  metricInterval?: number;
  instrumentations?: Record<string, boolean>;
}

export interface SarynoSpan extends Span {
  setTag(key: string, value: string | number | boolean): this;
}
