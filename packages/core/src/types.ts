import { z } from "zod";
export const projectInput = z.object({
  name: z.string().trim().min(1).max(100),
  url: z
    .string()
    .url()
    .refine(
      (v) => ["http:", "https:"].includes(new URL(v).protocol),
      "Use HTTP ou HTTPS",
    ),
  searchConsoleSite: z.string().min(1),
  analyticsProperty: z.string().regex(/^\d+$/),
});
export type Project = z.infer<typeof projectInput> & {
  id: string;
  createdAt: string;
};
export type Finding = {
  code: string;
  severity: "high" | "medium" | "low";
  message: string;
  evidence: string;
};
export type Audit = {
  id: string;
  projectId: string;
  url: string;
  at: string;
  status: number;
  finalUrl?: string;
  title: string;
  description: string;
  h1: number;
  canonical: string;
  findings: Finding[];
};
export type Metric = {
  id: string;
  projectId: string;
  at: string;
  startDate: string;
  endDate: string;
  gsc: { clicks: number; impressions: number; ctr: number; position: number };
  ga: { sessions: number; activeUsers: number; keyEvents: number };
  pages: unknown[];
};
export type Diagnosis = {
  id: string;
  projectId: string;
  at: string;
  model: string;
  summary: string;
  evidenceIds: string[];
};
export type Task = {
  id: string;
  projectId: string;
  diagnosisId: string;
  title: string;
  proposal: string;
  evidenceIds: string[];
  status: "proposed" | "approved" | "implemented";
  createdAt: string;
  implementedAt?: string;
  baselineAuditId?: string;
};
export type Validation = {
  id: string;
  projectId: string;
  taskId: string;
  at: string;
  beforeId: string;
  afterId: string;
  resolved: string[];
  remaining: string[];
  introduced: string[];
  passed: boolean;
};
