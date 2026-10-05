export type AuditStatus = "pass" | "warning" | "fail" | "unknown";
export type AuditSeverity = "critical" | "high" | "medium" | "low" | "pass" | "unknown";

export interface AuditCheck {
  id: string;
  categoryId: string;
  label: string;
  status: AuditStatus;
  severity: AuditSeverity;
  evidence: string;
  fix?: string;
  pageUrl?: string;
}

export interface CategoryScore {
  id: string;
  label: string;
  weight: number;
  score: number | null;
  measured: number;
  passed: number;
  warnings: number;
  failed: number;
  checks: AuditCheck[];
}

export interface AuditedPage {
  url: string;
  statusCode: number | null;
  responseMs: number | null;
  title: string;
  description: string;
  headings: string[];
  wordCount: number;
  internalLinks: number;
  externalLinks: string[];
  imageCount: number;
  missingAlt: number;
  schemaTypes: string[];
  schemaErrors: number;
  canonical: string | null;
  robotsDirective: string | null;
  checks: AuditCheck[];
  scores: Record<string, number | null>;
  geoScore: number | null;
}

export interface CrawlerAccess {
  name: string;
  agent: string;
  allowed: boolean | null;
  evidence: string;
}

export interface CitationSource {
  domain: string;
  count: number;
  urls: string[];
}

export interface CompetitorSummary {
  inputUrl: string;
  name: string;
  url: string;
  geoScore: number | null;
  coverage: number;
  technicalScore: number | null;
  contentScore: number | null;
  schemaScore: number | null;
  entityScore: number | null;
  citationReadiness: number | null;
  authorityScore: number | null;
  error?: string;
}

export interface GeoAuditReport {
  requestedUrl: string;
  siteUrl: string;
  hostname: string;
  auditedAt: string;
  title: string;
  description: string;
  overallScore: number | null;
  potentialScore: number | null;
  grade: string;
  coverage: number;
  measuredChecks: number;
  unverifiedChecks: number;
  categoryScores: CategoryScore[];
  checks: AuditCheck[];
  issues: AuditCheck[];
  actionPlan: AuditCheck[];
  pages: AuditedPage[];
  crawlPagesLimit: number;
  discoveredPages: number;
  robots: { url: string; statusCode: number | null; accessible: boolean | null; rules: string[]; sitemaps: string[] };
  sitemap: { url: string | null; statusCode: number | null; pageCount: number };
  crawlers: CrawlerAccess[];
  citations: { sources: CitationSource[]; externalLinks: number; authoritativeRatingsAvailable: false };
  entitySignals: { brand: string; productOrService: string; contact: string | null; socialProfiles: string[]; aboutPage: string | null };
  schema: { detectedTypes: string[]; validBlocks: number; invalidBlocks: number; suggestedJsonLd: Record<string, string | string[]> | null };
  aiReadiness: { platform: string; technicalReady: boolean | null; evidence: string }[];
  observedAiVisibility: { available: false; message: string };
  eeat: { dimension: string; score: number | null; evidence: string[] }[];
  timings: { pagesFetched: number; totalDurationMs: number; averageResponseMs: number | null; truncatedResponses: number };
  competitors: CompetitorSummary[];
  partialWarnings: string[];
}