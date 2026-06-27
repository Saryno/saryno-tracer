import { metrics } from "@opentelemetry/api";
import type { UpDownCounter, Gauge, Histogram } from "@opentelemetry/api";
import type { Tags } from "./types.js";

export class Metrics {
  private meter = metrics.getMeter("@saryno/tracer");
  private instruments = new Map<string, UpDownCounter | Gauge | Histogram>();
  private warned = false;

  private getOrCreateUpDownCounter(name: string): UpDownCounter {
    const key = `counter:${name}`;
    if (!this.instruments.has(key)) {
      this.instruments.set(key, this.meter.createUpDownCounter(name));
    }
    return this.instruments.get(key) as UpDownCounter;
  }

  private getOrCreateGauge(name: string): Gauge {
    const key = `gauge:${name}`;
    if (!this.instruments.has(key)) {
      this.instruments.set(key, this.meter.createGauge(name));
    }
    return this.instruments.get(key) as Gauge;
  }

  private getOrCreateHistogram(name: string): Histogram {
    const key = `histogram:${name}`;
    if (!this.instruments.has(key)) {
      this.instruments.set(key, this.meter.createHistogram(name));
    }
    return this.instruments.get(key) as Histogram;
  }

  increment(name: string, value = 1, tags?: Tags): void {
    this.getOrCreateUpDownCounter(name).add(value, tags);
  }

  decrement(name: string, value = 1, tags?: Tags): void {
    this.getOrCreateUpDownCounter(name).add(-value, tags);
  }

  gauge(name: string, value: number, tags?: Tags): void {
    this.getOrCreateGauge(name).record(value, tags);
  }

  histogram(name: string, value: number, tags?: Tags): void {
    this.getOrCreateHistogram(name).record(value, tags);
  }

  distribution(name: string, value: number, tags?: Tags): void {
    this.histogram(name, value, tags);
  }

  timing(name: string, ms: number, tags?: Tags): void {
    this.histogram(name, ms, { ...tags, unit: "ms" });
  }
}
