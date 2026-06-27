import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import type { TracerConfig } from "./types.js";

export function buildInstrumentations(config: Required<TracerConfig>): any[] {
  const autoInstrumentations = getNodeAutoInstrumentations({
    "@opentelemetry/instrumentation-fs": {
      enabled:
        config.instrumentations["@opentelemetry/instrumentation-fs"] ?? false,
    },
  });

  return Object.entries(config.instrumentations).reduce(
    (acc, [name, enabled]) => {
      if (typeof enabled === "boolean" && !enabled) {
        return acc.filter((inst) => {
          if ("instrumentationName" in inst) {
            return inst.instrumentationName !== name;
          }
          return true;
        });
      }
      return acc;
    },
    autoInstrumentations,
  );
}
