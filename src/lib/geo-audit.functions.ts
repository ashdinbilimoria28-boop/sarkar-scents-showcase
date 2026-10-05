import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { GeoAuditReport } from "./geo-audit.types";

const requestSchema = z.object({
  urls: z.array(z.string().trim().min(1).max(2048)).min(1).max(4),
});

export const runGeoAudit = createServerFn({ method: "POST" })
  .inputValidator((input) => requestSchema.parse(input))
  .handler(async ({ data }): Promise<GeoAuditReport[]> => {
    const { runSiteAudits } = await import("./geo-audit.server");
    return runSiteAudits(data.urls);
  });