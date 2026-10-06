import type {
  AuditCheck,
  AuditSeverity,
  AuditStatus,
  AuditedPage,
  CategoryScore,
  CitationSource,
  CompetitorSummary,
  CrawlerAccess,
  GeoAuditReport,
} from "./geo-audit.types";

const PAGE_LIMIT = 6;
const BODY_LIMIT = 850_000;
const FETCH_TIMEOUT_MS = 8_000;
const categories = [
  { id: "crawler", label: "AI crawler access", weight: 0.12 },
  { id: "technical", label: "Technical SEO", weight: 0.16 },
  { id: "content", label: "Content & citability", weight: 0.15 },
  { id: "schema", label: "Structured data", weight: 0.12 },
  { id: "entity", label: "Entity clarity", weight: 0.1 },
  { id: "trust", label: "E-E-A-T & trust", weight: 0.1 },
  { id: "readiness", label: "AI search readiness", weight: 0.1 },
  { id: "authority", label: "Authority signals", weight: 0.05 },
  { id: "internal", label: "Internal linking", weight: 0.05 },
  { id: "performance", label: "Page experience", weight: 0.05 },
] as const;

const crawlerDefinitions = [
  { name: "GPTBot", agent: "GPTBot", readiness: "ChatGPT" },
  { name: "OAI-SearchBot", agent: "OAI-SearchBot", readiness: "ChatGPT search" },
  { name: "ClaudeBot", agent: "ClaudeBot", readiness: "Claude" },
  { name: "PerplexityBot", agent: "PerplexityBot", readiness: "Perplexity" },
  { name: "Googlebot", agent: "Googlebot", readiness: "Google AI Overviews" },
  { name: "Google-Extended", agent: "Google-Extended", readiness: "Gemini" },
  { name: "Bingbot", agent: "bingbot", readiness: "Bing search" },
] as const;

type RobotsRule = { allow: boolean; path: string };
type FetchResult = {
  requestedUrl: string;
  url: string;
  status: number | null;
  text: string;
  headers: Headers;
  durationMs: number | null;
  error: string | null;
  truncated: boolean;
};
type PageData = {
  url: string;
  requestedUrl: string;
  statusCode: number | null;
  responseMs: number | null;
  headers: Headers;
  html: string;
  title: string;
  description: string;
  headings: { tag: string; text: string }[];
  visibleText: string;
  wordCount: number;
  images: { alt: string | null }[];
  internalUrls: string[];
  externalUrls: string[];
  schemaTypes: string[];
  schemaErrors: number;
  canonical: string | null;
  robotsDirective: string | null;
  language: string | null;
  linkTexts: string[];
  responseError: string | null;
  truncated: boolean;
  checks: AuditCheck[];
};

function safePublicUrl(raw: string, allowRootIp = false): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Enter a complete website URL, such as https://example.com.");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Only public HTTP and HTTPS website addresses can be audited.");
  }
  if (url.username || url.password || (url.port && url.port !== "80" && url.port !== "443")) {
    throw new Error("This address uses a restricted login or network port.");
  }
  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  const blockedSuffixes = [
    ".localhost",
    ".local",
    ".internal",
    ".lan",
    ".home",
    ".test",
    ".invalid",
    ".example",
    ".nip.io",
    ".sslip.io",
  ];
  const isIp = hostname.includes(":") || /^\d+(?:\.\d+){3}$/.test(hostname);
  if (
    hostname === "localhost" ||
    hostname.endsWith(".") ||
    hostname.split(".").length < 2 ||
    blockedSuffixes.some((suffix) => hostname.endsWith(suffix)) ||
    (!allowRootIp && isIp)
  ) {
    throw new Error("This address does not look like a public website domain.");
  }
  if (isIp && /^\d+(?:\.\d+){3}$/.test(hostname)) {
    const parts = hostname.split(".").map(Number);
    const a = parts[0] ?? -1;
    const b = parts[1] ?? -1;
    if (
      parts.some((part) => part < 0 || part > 255) ||
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168)
    ) {
      throw new Error("Private network addresses cannot be audited.");
    }
  }
  url.hash = "";
  return url;
}

function safeRedirect(url: URL, originalHost: string): boolean {
  try {
    safePublicUrl(url.toString(), true);
  } catch {
    return false;
  }
  return url.hostname === originalHost || url.hostname === `www.${originalHost}` || originalHost === `www.${url.hostname}`;
}

async function readBoundedBody(response: Response): Promise<{ text: string; truncated: boolean }> {
  if (!response.body) return { text: "", truncated: false };
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  let truncated = false;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = value ?? new Uint8Array();
      const remaining = BODY_LIMIT - total;
      if (chunk.byteLength > remaining) {
        chunks.push(chunk.slice(0, Math.max(0, remaining)));
        total += Math.max(0, remaining);
        truncated = true;
        await reader.cancel();
        break;
      }
      chunks.push(chunk);
      total += chunk.byteLength;
    }
  } catch {
    // A truncated response is still useful audit evidence.
    truncated = true;
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { text: new TextDecoder().decode(bytes), truncated };
}

async function fetchPublic(raw: string, originalHost: string, accept: string): Promise<FetchResult> {
  let current: URL;
  try {
    current = safePublicUrl(raw, true);
  } catch (error) {
    return emptyFetch(raw, error instanceof Error ? error.message : "The address could not be checked.");
  }
  if (!safeRedirect(current, originalHost)) return emptyFetch(raw, "The requested URL is outside the audited domain.");
  const started = Date.now();
  for (let redirects = 0; redirects <= 4; redirects++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(current, {
        redirect: "manual",
        signal: controller.signal,
        headers: {
          Accept: accept,
          "User-Agent": "Sarkar-GeoAudit/1.0 (+public website diagnostics)",
        },
      });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");
        await response.body?.cancel();
        if (!location) return { ...emptyFetch(raw, "The website returned a redirect without a destination."), status: response.status };
        if (redirects === 4) return { ...emptyFetch(raw, "The website redirected too many times."), status: response.status };
        const next = new URL(location, current);
        if (!safeRedirect(next, originalHost)) {
          return { ...emptyFetch(raw, "The website redirects to a different domain; that redirect was not followed."), status: response.status };
        }
        current = next;
        continue;
      }
      const body = await readBoundedBody(response);
      return {
        requestedUrl: raw,
        url: current.toString(),
        status: response.status,
        text: body.text,
        headers: response.headers,
        durationMs: Date.now() - started,
        error: response.ok ? null : `The website returned HTTP ${response.status}.`,
        truncated: body.truncated,
      };
    } catch (error) {
      const timedOut = controller.signal.aborted;
      return {
        ...emptyFetch(raw, timedOut ? "The website did not respond within eight seconds." : "The website could not be reached."),
        durationMs: Date.now() - started,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }
  return emptyFetch(raw, "The website could not be reached.");
}

function emptyFetch(url: string, error: string): FetchResult {
  return { requestedUrl: url, url, status: null, text: "", headers: new Headers(), durationMs: null, error, truncated: false };
}

function decodeEntities(value: string): string {
  const common: Record<string, string> = {
    amp: "&",
    quot: '"',
    apos: "'",
    lt: "<",
    gt: ">",
    nbsp: " ",
    ndash: "–",
    mdash: "—",
    rsquo: "’",
    lsquo: "‘",
    rdquo: "”",
    ldquo: "“",
    copy: "©",
    reg: "®",
  };
  return value.replace(/&(#(?:x[0-9a-f]+|\d+)|[a-z]+);/gi, (match, entity: string) => {
    if (entity.startsWith("#x") || entity.startsWith("#X")) {
      const code = Number.parseInt(entity.slice(2), 16);
      return Number.isFinite(code) ? String.fromCodePoint(Math.min(code, 0x10ffff)) : match;
    }
    if (entity.startsWith("#")) {
      const code = Number.parseInt(entity.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(Math.min(code, 0x10ffff)) : match;
    }
    return common[entity.toLowerCase()] ?? match;
  });
}

function tagAttributes(tag: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  const regex = /([^\s=<>/]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(tag))) attributes[(match[1] ?? "").toLowerCase()] = decodeEntities(match[2] ?? match[3] ?? match[4] ?? "");
  return attributes;
}

function extractTagContent(html: string, tagName: string): { attrs: Record<string, string>; content: string }[] {
  const matches: { attrs: Record<string, string>; content: string }[] = [];
  const regex = new RegExp(`<${tagName}\\b([^>]*)>([\\s\\S]*?)<\\/${tagName}\\s*>`, "gi");
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html))) {
    matches.push({ attrs: tagAttributes(`<${tagName} ${match[1] ?? ""}>`), content: match[2] ?? "" });
  }
  return matches;
}

function extractMeta(html: string, wanted: string): string | null {
  const regex = /<meta\b[^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html))) {
    const attrs = tagAttributes(match[0]);
    const keys = [attrs["name"], attrs["property"], attrs["itemprop"]].filter(Boolean).map((key) => key?.toLowerCase());
    if (keys.includes(wanted.toLowerCase()) && attrs["content"]) return attrs["content"].trim();
  }
  return null;
}

function extractRobotsDirective(html: string, xRobots: string | null): string | null {
  const meta = [extractMeta(html, "robots"), extractMeta(html, "googlebot")].filter(Boolean).join(", ");
  const header = xRobots?.trim() ?? "";
  return [meta, header].filter(Boolean).join("; ") || null;
}

function plainText(html: string): string {
  return decodeEntities(
    html
      .replace(/<(script|style|noscript|svg|template|head)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ")
      .replace(/<!--([\s\S]*?)-->/g, " ")
      .replace(/<\/(?:p|div|section|article|h[1-6]|li|br|tr)\s*>/gi, ". ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

function scoreGrade(score: number | null): string {
  if (score === null) return "Insufficient data";
  if (score >= 90) return "Excellent";
  if (score >= 80) return "Very Good";
  if (score >= 70) return "Good";
  if (score >= 60) return "Needs Improvement";
  if (score >= 40) return "Weak";
  return "Critical";
}

function makeCheck(
  id: string,
  categoryId: string,
  label: string,
  status: AuditStatus,
  evidence: string,
  fix?: string,
  pageUrl?: string,
): AuditCheck {
  const severity: AuditSeverity =
    status === "pass"
      ? "pass"
      : status === "unknown"
        ? "unknown"
        : status === "warning"
          ? "medium"
          : categoryId === "crawler" || categoryId === "technical"
            ? "high"
            : "medium";
  return { id, categoryId, label, status, severity, evidence, ...(fix ? { fix } : {}), ...(pageUrl ? { pageUrl } : {}) };
}

function aggregateScore(checks: AuditCheck[]): { score: number | null; measured: number; passed: number; warnings: number; failed: number } {
  const measured = checks.filter((check) => check.status !== "unknown");
  if (measured.length === 0) return { score: null, measured: 0, passed: 0, warnings: 0, failed: 0 };
  const earned = measured.reduce((sum, check) => sum + (check.status === "pass" ? 1 : check.status === "warning" ? 0.5 : 0), 0);
  return {
    score: Math.round((earned / measured.length) * 100),
    measured: measured.length,
    passed: measured.filter((check) => check.status === "pass").length,
    warnings: measured.filter((check) => check.status === "warning").length,
    failed: measured.filter((check) => check.status === "fail").length,
  };
}

function assembleCategories(checks: AuditCheck[]): CategoryScore[] {
  return categories.map((category) => {
    const categoryChecks = checks.filter((check) => check.categoryId === category.id);
    return { ...category, ...aggregateScore(categoryChecks), checks: categoryChecks };
  });
}

function scoreOverall(scores: CategoryScore[], promoteFixable: boolean): number | null {
  const available = scores.filter((category) => category.score !== null);
  if (available.length === 0) return null;
  const totalWeight = available.reduce((sum, item) => sum + item.weight, 0);
  const earned = available.reduce((sum, item) => {
    const score = promoteFixable
      ? aggregateScore(item.checks.map((check) =>
          check.status !== "pass" && check.fix ? { ...check, status: "pass" as const } : check,
        )).score
      : item.score;
    return sum + (score ?? 0) * item.weight;
  }, 0);
  return Math.round(earned / totalWeight);
}

function readRobotsRules(text: string): { groups: { agents: string[]; rules: RobotsRule[] }[]; sitemaps: string[] } {
  const groups: { agents: string[]; rules: RobotsRule[] }[] = [];
  const sitemaps: string[] = [];
  let agents: string[] = [];
  let rules: RobotsRule[] = [];
  const finish = () => {
    if (agents.length) groups.push({ agents, rules });
    agents = [];
    rules = [];
  };
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.split("#")[0]?.trim() ?? "";
    if (!line) {
      if (rules.length) finish();
      continue;
    }
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();
    if (key === "user-agent") {
      if (rules.length) finish();
      agents.push(value.toLowerCase());
    } else if (key === "allow" || key === "disallow") {
      if (agents.length && value) rules.push({ allow: key === "allow", path: value });
    } else if (key === "sitemap" && value) {
      sitemaps.push(value);
    }
  }
  finish();
  return { groups, sitemaps: [...new Set(sitemaps)] };
}

function crawlerAllowed(groups: { agents: string[]; rules: RobotsRule[] }[], agent: string, pathname: string): boolean {
  const normalizedAgent = agent.toLowerCase();
  const exactGroups = groups.filter((group) => group.agents.some((name) => name !== "*" && normalizedAgent.includes(name)));
  const selectedGroups = exactGroups.length ? exactGroups : groups.filter((group) => group.agents.includes("*"));
  const rules = selectedGroups.flatMap((group) => group.rules);
  const matching = rules
    .filter((rule) => {
      const escaped = rule.path.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\$$/, "$?");
      return new RegExp(`^${escaped}`, "i").test(pathname);
    })
    .sort((a, b) => b.path.length - a.path.length);
  const best = matching[0];
  return best ? best.allow : true;
}

function readPage(fetchResult: FetchResult, homeOrigin: string): PageData {
  const html = fetchResult.text;
  const title = decodeEntities(extractTagContent(html, "title")[0]?.content.replace(/<[^>]+>/g, " ").trim() ?? "");
  const description = extractMeta(html, "description") ?? "";
  const headings = [1, 2, 3].flatMap((level) =>
    extractTagContent(html, `h${level}`).map((heading) => ({ tag: `h${level}`, text: plainText(heading.content) })),
  );
  const visibleText = plainText(html);
  const wordCount = visibleText ? visibleText.split(/\s+/).filter(Boolean).length : 0;
  const links = extractTagContent(html, "a").flatMap((anchor) => {
    const href = anchor.attrs["href"];
    if (!href || href.startsWith("#") || /^(?:mailto:|tel:|javascript:|data:)/i.test(href)) return [];
    try {
      const url = new URL(href, fetchResult.url);
      if (url.protocol !== "http:" && url.protocol !== "https:") return [];
      url.hash = "";
      return [{ url: url.toString(), hostname: url.hostname, text: plainText(anchor.content) }];
    } catch {
      return [];
    }
  });
  const sameOrigin = links.filter((link) => new URL(link.url).origin === homeOrigin);
  const schemaTypes = new Set<string>();
  let schemaErrors = 0;
  for (const block of extractTagContent(html, "script")) {
    if (!/application\/ld\+json/i.test(block.attrs["type"] ?? "")) continue;
    try {
      const parsed = JSON.parse(block.content) as unknown;
      collectSchemaTypes(parsed, schemaTypes);
    } catch {
      schemaErrors++;
    }
  }
  const robotsHeader = fetchResult.headers.get("x-robots-tag");
  const canonicalTag = /<link\b[^>]*>/gi;
  let canonical: string | null = null;
  let match: RegExpExecArray | null;
  while ((match = canonicalTag.exec(html))) {
    const attrs = tagAttributes(match[0]);
    if (attrs["rel"]?.split(/\s+/).includes("canonical") && attrs["href"]) {
      try {
        canonical = new URL(attrs["href"], fetchResult.url).toString();
      } catch {
        canonical = attrs["href"];
      }
      break;
    }
  }
  const robotsDirective = extractRobotsDirective(html, robotsHeader);
  const images = /<img\b[^>]*>/gi;
  const imageList: { alt: string | null }[] = [];
  while ((match = images.exec(html))) {
    const attrs = tagAttributes(match[0]);
    imageList.push({ alt: Object.hasOwn(attrs, "alt") ? attrs["alt"] ?? "" : null });
  }
  return {
    url: fetchResult.url,
    requestedUrl: fetchResult.requestedUrl,
    statusCode: fetchResult.status,
    responseMs: fetchResult.durationMs,
    headers: fetchResult.headers,
    html,
    title,
    description,
    headings,
    visibleText,
    wordCount,
    images: imageList,
    internalUrls: [...new Set(sameOrigin.map((link) => link.url))],
    externalUrls: [...new Set(links.filter((link) => link.hostname !== new URL(fetchResult.url).hostname).map((link) => link.url))],
    schemaTypes: [...schemaTypes].sort(),
    schemaErrors,
    canonical,
    robotsDirective,
    language: tagAttributes(html.match(/<html\b[^>]*>/i)?.[0] ?? "")["lang"] ?? null,
    linkTexts: links.map((link) => link.text).filter(Boolean),
    responseError: fetchResult.error,
    truncated: fetchResult.truncated,
    checks: [],
  };
}

function collectSchemaTypes(value: unknown, result: Set<string>): void {
  if (Array.isArray(value)) {
    for (const item of value) collectSchemaTypes(item, result);
    return;
  }
  if (value === null || typeof value !== "object") return;
  const record = value as Record<string, unknown>;
  const type = record["@type"];
  if (typeof type === "string") result.add(type.split("/").pop() ?? type);
  if (Array.isArray(type)) type.forEach((item) => typeof item === "string" && result.add(item.split("/").pop() ?? item));
  if (record["@graph"]) collectSchemaTypes(record["@graph"], result);
}

function evaluatePage(page: PageData, index: number, origin: string): AuditCheck[] {
  const pageKey = `${index + 1}`;
  const checks: AuditCheck[] = [];
  const add = (id: string, category: string, label: string, status: AuditStatus, evidence: string, fix?: string) => {
    checks.push(makeCheck(`${pageKey}-${id}`, category, label, status, evidence, fix, page.url));
  };
  const fetched = page.statusCode !== null;
  const titleLength = page.title.length;
  add("page-fetch", "technical", "Page responds successfully", page.statusCode !== null && page.statusCode >= 200 && page.statusCode < 400 ? "pass" : page.statusCode === null ? "unknown" : "fail", page.statusCode ? `HTTP ${page.statusCode} · ${page.responseMs ?? "—"} ms from the audit server.` : page.responseError ?? "No response received.", "Restore the page or review server access rules.");
  add("https", "technical", "Secure HTTPS connection", page.url.startsWith("https:") ? "pass" : fetched ? "fail" : "unknown", page.url.startsWith("https:") ? "The final page address uses HTTPS." : fetched ? `Final address: ${page.url}` : "Unable to verify the final address.", "Serve the site over HTTPS and redirect HTTP visitors to its secure version.");
  add("title", "technical", "Descriptive page title", titleLength >= 10 && titleLength <= 60 ? "pass" : titleLength > 0 ? "warning" : fetched ? "fail" : "unknown", titleLength ? `“${page.title}” · ${titleLength} characters.` : fetched ? "No HTML title element was found." : "The page could not be read.", "Write a unique, specific title of about 10–60 characters.");
  add("description", "technical", "Meta description", page.description.length >= 70 && page.description.length <= 160 ? "pass" : page.description.length ? "warning" : fetched ? "fail" : "unknown", page.description ? `${page.description.length} characters: “${page.description.slice(0, 240)}”` : fetched ? "No meta description was found." : "The page could not be read.", "Add a clear, page-specific meta description of roughly 70–160 characters.");
  const h1 = page.headings.filter((heading) => heading.tag === "h1");
  add("h1", "technical", "A clear main heading", h1.length === 1 && Boolean(h1[0]?.text) ? "pass" : fetched && h1.length === 0 ? "fail" : fetched ? "warning" : "unknown", h1.length ? `${h1.length} H1 heading(s): ${h1.map((item) => item.text).filter(Boolean).join(" · ") || "empty heading"}` : fetched ? "No H1 heading was found." : "The page could not be read.", "Use one descriptive H1 that clearly identifies this page.");
  const h2Count = page.headings.filter((heading) => heading.tag === "h2").length;
  add("heading-hierarchy", "technical", "Useful section headings", h2Count > 0 ? "pass" : fetched ? "warning" : "unknown", `${h2Count} H2 and ${page.headings.filter((heading) => heading.tag === "h3").length} H3 headings found.`, "Organize the page with descriptive H2 and H3 headings.");
  add("canonical", "technical", "Canonical page URL", page.canonical ? new URL(page.canonical).origin === origin ? "pass" : "warning" : fetched ? "warning" : "unknown", page.canonical ?? (fetched ? "No canonical link was found." : "The page could not be read."), "Add one canonical URL that points to the preferred version of this page.");
  const robots = (page.robotsDirective ?? "").toLowerCase();
  add("indexable", "technical", "Indexing directives", /(?:noindex|none)/.test(robots) ? "fail" : page.robotsDirective || fetched ? "pass" : "unknown", page.robotsDirective ? `Directives: ${page.robotsDirective}` : fetched ? "No noindex directive was found in the page meta or X-Robots-Tag response header." : "Unable to verify indexing directives.", "Remove noindex only if this page should appear in search results.");
  const viewport = /<meta\b[^>]*name\s*=\s*["']viewport["']/i.test(page.html);
  add("viewport", "technical", "Mobile viewport", viewport ? "pass" : fetched ? "fail" : "unknown", viewport ? "A viewport meta tag is present." : fetched ? "No mobile viewport meta tag was found." : "The page could not be read.", "Add a responsive viewport meta tag in the page head.");
  add("language", "technical", "Document language", page.language ? "pass" : fetched ? "warning" : "unknown", page.language ? `HTML language: ${page.language}.` : fetched ? "The root HTML element has no lang attribute." : "The page could not be read.", "Set the root HTML element's lang attribute to the page's primary language.");
  const ogTitle = extractMeta(page.html, "og:title");
  const ogDescription = extractMeta(page.html, "og:description");
  add("open-graph", "technical", "Social sharing metadata", ogTitle && ogDescription ? "pass" : fetched && ogTitle ? "warning" : fetched ? "fail" : "unknown", `Open Graph title: ${ogTitle ? "found" : "missing"}; description: ${ogDescription ? "found" : "missing"}.`, "Add page-specific Open Graph title and description tags.");
  const twitterCard = extractMeta(page.html, "twitter:card");
  add("twitter-card", "technical", "X / Twitter card metadata", twitterCard ? "pass" : fetched ? "warning" : "unknown", twitterCard ? `Card type: ${twitterCard}.` : fetched ? "No twitter:card metadata was found." : "The page could not be read.", "Add a relevant twitter:card type and page metadata.");
  const absentAlt = page.images.filter((image) => image.alt === null || !image.alt.trim()).length;
  add("image-alt", "technical", "Image alternative text", page.images.length === 0 || absentAlt === 0 ? (fetched ? "pass" : "unknown") : fetched && absentAlt > 0 ? "warning" : "unknown", `${page.images.length} images checked; ${absentAlt} have missing or empty alt text.`, "Write concise, useful alt text for meaningful images; keep decorative images' alt text empty.");
  const bodyWords = page.visibleText.split(/\s+/).filter(Boolean);
  const answerFirst = bodyWords.length >= 25 && page.visibleText.slice(0, 450).length >= 120 && /\b(is|are|offers|provides|means|designed|helps|includes|creates|serves)\b/i.test(page.visibleText.slice(0, 600));
  add("answer-first", "content", "Direct, answer-first introduction", answerFirst ? "pass" : fetched ? "warning" : "unknown", fetched ? `${bodyWords.length} visible words; the first 600 characters ${answerFirst ? "include a clear descriptive statement" : "do not show a clear answer-first statement in the simple text scan"}.` : "The page could not be read.", "Open with a short, factual description of what the page, brand, product, or service offers.");
  const questionHeadings = page.headings.filter((heading) => heading.text.endsWith("?")).length;
  add("question-headings", "content", "Question-led headings", questionHeadings > 0 ? "pass" : fetched ? "warning" : "unknown", `${questionHeadings} headings end with a question mark.`, "Use question headings where they match real customer questions; this is an optional content cue, not a requirement.");
  const factual = /\b\d+(?:[.,]\d+)?\s*(?:%|years?|days?|hours?|ml|kg|cm|₹|\$|€|£)\b/i.test(page.visibleText);
  add("facts", "content", "Specific, checkable facts", factual ? "pass" : fetched && bodyWords.length > 40 ? "warning" : fetched ? "warning" : "unknown", factual ? "A numeric value or measurement appears in the visible page text." : fetched ? "The text scan did not find a specific number, date, measurement, or price." : "The page could not be read.", "Include only verifiable product or service details and identify their context.");
  const citePassage = extractTagContent(page.html, "p").map((paragraph) => plainText(paragraph.content)).some((text) => text.length >= 100 && text.length <= 650);
  add("citable-passages", "content", "Self-contained explanatory passages", citePassage ? "pass" : fetched ? "warning" : "unknown", citePassage ? "Found a paragraph between 100 and 650 characters suitable for reviewing as a standalone passage." : fetched ? "No explanatory paragraph in the sampled page fell within the 100–650 character range." : "The page could not be read.", "Write concise paragraphs that make sense when read outside their surrounding section.");
  const questionFaq = page.headings.some((heading) => heading.text.endsWith("?")) || /\b(frequently asked questions|\bfaq\b)/i.test(page.visibleText);
  add("faq", "content", "FAQ or question-and-answer content", questionFaq ? "pass" : fetched ? "warning" : "unknown", questionFaq ? "FAQ wording or question-style headings were found." : fetched ? "No FAQ wording or question headings were found." : "The page could not be read.", "Answer common customer questions on pages where a real FAQ would help.");
  add("content-depth", "content", "Useful visible content depth", bodyWords.length >= 300 ? "pass" : bodyWords.length >= 100 ? "warning" : fetched ? "fail" : "unknown", fetched ? `${bodyWords.length} visible words in the HTML text scan; this is not a quality judgment.` : "The page could not be read.", "Add useful, original detail where the page's purpose warrants it; avoid padding pages to reach a target word count.");
  const schemaReady = page.statusCode !== null;
  add("schema-json", "schema", "Readable JSON-LD structured data", page.schemaErrors === 0 && page.schemaTypes.length > 0 ? "pass" : page.schemaErrors > 0 ? "fail" : schemaReady ? "warning" : "unknown", page.schemaTypes.length ? `Detected: ${page.schemaTypes.join(", ")}${page.schemaErrors ? `; ${page.schemaErrors} malformed JSON-LD block(s).` : "."}` : schemaReady ? `${page.schemaErrors ? `${page.schemaErrors} malformed JSON-LD block(s).` : "No JSON-LD blocks were found."}` : "The page could not be read.", "Validate JSON-LD syntax and add only schema types that accurately describe visible page content.");
  const orgTypes = page.schemaTypes.some((type) => ["Organization", "Brand", "Corporation"].includes(type));
  add("schema-org", "schema", "Organization or brand schema", orgTypes ? "pass" : schemaReady ? "warning" : "unknown", orgTypes ? "Organization or Brand structured data appears on this page." : schemaReady ? "Organization/Brand schema was not detected on this page." : "The page could not be read.", "Add Organization or Brand schema using verified brand details if it accurately represents the business.");
  const descriptionText = `${page.title} ${page.description} ${page.visibleText.slice(0, 1200)}`;
  const brandTerms = /\b(company|brand|we|our|fragrance|perfume|product|service|store|shop|business)\b/i.test(descriptionText);
  add("entity-offering", "entity", "Brand and offering clarity", page.title && page.description && brandTerms ? "pass" : page.title || page.description ? "warning" : fetched ? "fail" : "unknown", `Title ${page.title ? "present" : "missing"}; meta description ${page.description ? "present" : "missing"}; business-context signals ${brandTerms ? "found" : "not found"}.`, "State the verified business name, what it offers, who it serves, and where it operates where applicable.");
  const aboutLink = page.internalUrls.some((url) => /\/(?:about|our-story|company)(?:\/|$)/i.test(new URL(url).pathname)) || /\babout us\b|\bour story\b/i.test(page.visibleText);
  const contact = page.internalUrls.some((url) => /\/(?:contact|contact-us)(?:\/|$)/i.test(new URL(url).pathname)) || /mailto:/i.test(page.html) || /\bcontact us\b/i.test(page.visibleText);
  add("about", "trust", "About / organization information", aboutLink ? "pass" : fetched ? "warning" : "unknown", aboutLink ? "About/Our Story wording or an internal About page link was found." : fetched ? "No About/Our Story wording or standard About link was detected in the sampled page." : "The page could not be read.", "Add a clear About page with genuine company and product background.");
  add("contact", "trust", "Contact information", contact ? "pass" : fetched ? "warning" : "unknown", contact ? "A contact link, contact wording, or mail link was found." : fetched ? "No contact link or email link was detected on this page." : "The page could not be read.", "Provide a working contact page or address customers can use.");
  const policy = page.internalUrls.some((url) => /\/(?:privacy|terms|returns|shipping|policy)(?:\/|$)/i.test(new URL(url).pathname));
  add("policies", "trust", "Customer policy links", policy ? "pass" : fetched ? "warning" : "unknown", policy ? "A privacy, terms, returns, shipping, or policy page link was detected." : fetched ? "No standard customer-policy URL was detected on this page." : "The page could not be read.", "Link to the genuine privacy, terms, and relevant customer policies.");
  const authors = Boolean(extractMeta(page.html, "author")) || /\bby\s+[A-Z][a-z]+\s+[A-Z][a-z]+/.test(page.visibleText);
  add("author", "trust", "Authorship signals", authors ? "pass" : fetched ? "warning" : "unknown", authors ? "An author meta tag or a basic byline pattern was found." : fetched ? "No author meta tag or simple byline pattern was detected; not all product pages require a named author." : "The page could not be read.", "Identify qualified authors or reviewers on expert editorial pages where applicable.");
  const reviews = /\b(review|testimonial|customer feedback|verified buyer|rated?\s+\d)\b/i.test(page.visibleText);
  add("customer-proof", "trust", "Customer evidence", reviews ? "pass" : fetched ? "warning" : "unknown", reviews ? "Review/testimonial wording or a basic rating phrase appears in the visible text." : fetched ? "No review/testimonial terms were detected; the scan cannot authenticate reviews." : "The page could not be read.", "Show genuine, verifiable customer feedback where available; do not create synthetic testimonials.");
  const sources = page.externalUrls.length;
  add("source-links", "content", "Linked external sources", sources > 0 ? "pass" : fetched ? "warning" : "unknown", `${sources} distinct external link(s) found on this page; link authority was not evaluated.`, "Cite reliable sources for factual or expert claims; use external references only when relevant.");
  add("internal-links", "internal", "Useful internal navigation", page.internalUrls.length >= 3 ? "pass" : page.internalUrls.length > 0 ? "warning" : fetched ? "fail" : "unknown", `${page.internalUrls.length} distinct same-origin HTML link target(s) found on the page.`, "Link related pages with descriptive text and make important pages reachable from the site navigation.");
  add("origin-response", "performance", "Origin response time", page.responseMs !== null && page.responseMs < 1200 ? "pass" : page.responseMs !== null && page.responseMs < 3000 ? "warning" : page.responseMs !== null ? "fail" : "unknown", page.responseMs === null ? page.responseError ?? "No response timing available." : `${page.responseMs} ms measured from the audit server's request; this is not browser Core Web Vitals or PageSpeed Insights.`, "Check hosting and caching if server response time is consistently high; run a browser-based performance test for real user experience.");
  const bloat = new TextEncoder().encode(page.html).byteLength;
  add("html-size", "performance", "HTML response size", bloat < 200_000 ? "pass" : bloat < BODY_LIMIT ? "warning" : "fail", `${Math.round(bloat / 1024)} KB of returned HTML${page.truncated ? " (response was capped at 850 KB)" : ""}.`, "Reduce unnecessary HTML payload and embedded markup; images, fonts, and browser rendering were not measured by this audit.");
  return checks;
}

function categoryScore(checks: AuditCheck[], id: string): number | null {
  return aggregateScore(checks.filter((check) => check.categoryId === id)).score;
}

function severityWeight(severity: AuditSeverity): number {
  return severity === "critical" ? 100 : severity === "high" ? 75 : severity === "medium" ? 45 : severity === "low" ? 20 : 0;
}

function findBrand(title: string, hostname: string): string {
  const cleaned = title.split(/[|—–-]/)[0]?.trim();
  if (cleaned && cleaned.length <= 70) return cleaned;
  return hostname.replace(/^www\./, "").split(".")[0]?.replace(/[-_]/g, " ").replace(/\b\w/g, (character) => character.toUpperCase()) ?? hostname;
}

function robotsAllowed(url: URL, rules: RobotsRule[], agent: string): boolean {
  return crawlerAllowed([{ agents: [agent], rules }], agent, url.pathname);
}

async function auditOne(rawInput: string, mainSite = false): Promise<GeoAuditReport> {
  const initialUrl = safePublicUrl(rawInput);
  const requestedUrl = initialUrl.toString();
  const hostname = initialUrl.hostname;
  const started = Date.now();
  const warnings: string[] = [];
  const homeResult = await fetchPublic(requestedUrl, hostname, "text/html,application/xhtml+xml;q=0.9,*/*;q=0.4");
  if (homeResult.error && homeResult.status === null) warnings.push(homeResult.error);
  if (homeResult.status !== null && ![200, 206].includes(homeResult.status)) warnings.push(`The home page returned HTTP ${homeResult.status}; some checks may be incomplete.`);
  const finalHome = homeResult.url;
  let origin: string;
  try {
    origin = new URL(finalHome).origin;
  } catch {
    origin = initialUrl.origin;
  }
  const homeHost = new URL(origin).hostname;
  const robotsUrl = `${origin}/robots.txt`;
  const robotsResult = await fetchPublic(robotsUrl, homeHost, "text/plain,*/*;q=0.5");
  const hasRobots = robotsResult.status !== null && robotsResult.status >= 200 && robotsResult.status < 300;
  const robotsRules = readRobotsRules(hasRobots ? robotsResult.text : "");
  const sitemapCandidates = [...robotsRules.sitemaps, `${origin}/sitemap.xml`].slice(0, 3);
  let sitemapResult: FetchResult | null = null;
  let sitemapXml = "";
  for (const sitemapUrl of [...new Set(sitemapCandidates)]) {
    const response = await fetchPublic(sitemapUrl, homeHost, "application/xml,text/xml,text/plain,*/*;q=0.3");
    if (response.status !== null && response.status >= 200 && response.status < 300 && /<urlset\b|<sitemapindex\b/i.test(response.text)) {
      sitemapResult = response;
      sitemapXml = response.text;
      break;
    }
    if (response.status !== null && response.status !== 404) {
      sitemapResult = response;
      if (sitemapCandidates.length === 1) break;
    }
  }
  const sitemapPaths = [...sitemapXml.matchAll(/<loc\b[^>]*>([\s\S]*?)<\/loc\s*>/gi)]
    .map((match) => decodeEntities(match[1] ?? "").trim())
    .filter(Boolean)
    .flatMap((url) => {
      try {
        const parsed = safePublicUrl(url);
        return parsed.origin === origin ? [parsed.toString()] : [];
      } catch {
        return [];
      }
    });
  const homePage = readPage(homeResult, origin);
  const rootHtmlPages = homePage.internalUrls
    .filter((url) => !/\.(?:pdf|jpg|jpeg|png|gif|svg|webp|avif|zip|xml|css|js|mp4|mp3)(?:$|\?)/i.test(url))
    .sort((a, b) => {
      const priority = /about|contact|product|service|privacy|faq|shipping/i;
      return Number(priority.test(b)) - Number(priority.test(a));
    });
  const pageCandidates = [...new Set([...sitemapPaths, ...rootHtmlPages])].filter((url) => {
    try {
      return new URL(url).origin === origin && url !== homePage.url;
    } catch {
      return false;
    }
  });
  let discoveredPages = pageCandidates.length;
  const disallowedByAll = !crawlerAllowed(robotsRules.groups, "sarkar-geoaudit", "/" );
  const crawlCandidates = disallowedByAll ? [] : pageCandidates.slice(0, PAGE_LIMIT - 1);
  if (disallowedByAll) warnings.push("robots.txt disallows the audit user-agent from crawling additional pages; the user-requested home page was still checked.");
  const pageResponses = await Promise.all(
    crawlCandidates.map((url) => fetchPublic(url, homeHost, "text/html,application/xhtml+xml;q=0.9,*/*;q=0.4")),
  );
  const pageData = [homePage, ...pageResponses.filter((result) => {
    const contentType = result.headers.get("content-type") ?? "";
    return !contentType || /text\/html|application\/xhtml\+xml/i.test(contentType);
  }).map((result) => readPage(result, origin))].slice(0, PAGE_LIMIT);
  const allChecks = pageData.flatMap((page, index) => {
    page.checks = evaluatePage(page, index, origin);
    return page.checks;
  });

  const rootOk = homeResult.status !== null;
  const add = (id: string, category: string, label: string, status: AuditStatus, evidence: string, fix?: string) => {
    allChecks.push(makeCheck(id, category, label, status, evidence, fix, homePage.url));
  };
  const httpsStatus: AuditStatus = rootOk ? (new URL(homePage.url).protocol === "https:" ? "pass" : "fail") : "unknown";
  add("crawl-https", "crawler", "HTTPS for search crawlers", httpsStatus, rootOk ? `Final page URL: ${homePage.url}` : "The final URL could not be confirmed.", "Provide the site over HTTPS and redirect the HTTP version to HTTPS.");
  const robotsStatus: AuditStatus = hasRobots ? "pass" : robotsResult.status === 404 ? "warning" : robotsResult.status === null ? "unknown" : "fail";
  add("robots-access", "crawler", "robots.txt accessibility", robotsStatus, hasRobots ? `HTTP ${robotsResult.status}; ${robotsRules.groups.reduce((count, group) => count + group.rules.length, 0)} Allow/Disallow rules parsed.` : robotsResult.status === 404 ? "robots.txt returned HTTP 404; no published crawler rules were found." : robotsResult.error ?? `robots.txt returned HTTP ${robotsResult.status ?? "no response"}.`, "Publish a valid robots.txt file if you need explicit crawler rules; check for accidental disallow rules.");
  const sitemapStatus: AuditStatus = sitemapXml ? "pass" : sitemapResult?.status === 404 || sitemapResult === null ? "warning" : sitemapResult.status === null ? "unknown" : "warning";
  add("sitemap-access", "crawler", "XML sitemap discovery", sitemapStatus, sitemapXml ? `${sitemapResult?.url} · ${sitemapPaths.length} same-origin URLs discovered.` : sitemapResult?.error ?? "No readable sitemap.xml was found at the usual path or the sitemap locations listed in robots.txt.", "Publish a valid XML sitemap and reference it from robots.txt or the site root.");
  const crawlers: CrawlerAccess[] = crawlerDefinitions.map((definition) => {
    const matchingGroups = robotsRules.groups.some((group) => group.agents.some((agent) => agent === "*" || definition.agent.toLowerCase().includes(agent)));
    const known = hasRobots || robotsResult.status === 404;
    const allowed = known ? crawlerAllowed(robotsRules.groups, definition.agent, "/") : null;
    const evidence = !known
      ? `Unable to verify: robots.txt returned HTTP ${robotsResult.status ?? "no response"}.`
      : !hasRobots
        ? "robots.txt returned HTTP 404; no explicit crawl restrictions were found."
        : matchingGroups
          ? allowed ? "The parsed robots.txt rules permit access to the site root." : "A matching robots.txt rule disallows the site root."
          : "No user-agent-specific rule was found; the published robots.txt rules permit the site root.";
    return { name: definition.name, agent: definition.agent, allowed, evidence };
  });
  for (const crawler of crawlers) {
    add(
      `bot-${crawler.agent.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      "crawler",
      `${crawler.name} access`,
      crawler.allowed === null ? "unknown" : crawler.allowed ? "pass" : "fail",
      crawler.evidence,
      `Review robots.txt rules for ${crawler.agent} and allow its access if you want this crawler to discover the site.`,
    );
  }
  const responseMs = homePage.responseMs;
  const links = [...new Set(pageData.flatMap((page) => page.externalUrls))];
  const citationSources: CitationSource[] = [];
  for (const url of links) {
    try {
      const domain = new URL(url).hostname.replace(/^www\./, "");
      const existing = citationSources.find((source) => source.domain === domain);
      if (existing) {
        existing.count++;
        if (existing.urls.length < 3) existing.urls.push(url);
      } else {
        citationSources.push({ domain, count: 1, urls: [url] });
      }
    } catch {
      // Only valid HTTP(S) links are recorded.
    }
  }
  const allLinkCount = pageData.reduce((sum, page) => sum + page.internalUrls.length, 0);
  const brokenCrawled = pageData.filter((page) => page.statusCode === 404).length;
  add("crawled-broken-pages", "technical", "Sampled page response errors", brokenCrawled === 0 ? (rootOk ? "pass" : "unknown") : "fail", `${pageData.length} pages checked; ${brokenCrawled} returned HTTP 404. Only URLs included in this limited crawl are counted.`, "Fix broken links for pages that should exist or redirect them to their closest relevant replacement.");
  add("citation-count", "authority", "First-party citation links", citationSources.length >= 3 ? "pass" : citationSources.length > 0 ? "warning" : rootOk ? "warning" : "unknown", `${citationSources.length} distinct external domains linked from the sampled pages. Backlinks, domain authority, and source quality were not measured.`, "Where useful, cite trustworthy sources for factual claims. Independent mentions/backlinks require a separate external-data integration.");
  add("internal-coverage", "internal", "Discovered same-site links", allLinkCount >= 8 ? "pass" : allLinkCount > 0 ? "warning" : rootOk ? "fail" : "unknown", `${allLinkCount} same-origin link targets found on the ${pageData.length} pages checked; ${pageCandidates.length} additional page URLs were discovered. This is a limited sample, not a full link graph.`, "Link important pages from relevant navigation and content, with descriptive anchor text.");
  add("crawl-html", "performance", "HTML rendered in the initial response", pageData.some((page) => page.wordCount > 60) ? "pass" : rootOk ? "warning" : "unknown", pageData.some((page) => page.wordCount > 60) ? "Readable content was present in the initial HTML response; client-side rendering completeness is not verified." : rootOk ? "Little readable text was found in the initial HTML response; a browser-rendered check is needed for JavaScript-heavy pages." : "The page could not be read.", "Make essential page information available in crawlable HTML; verify rendering with a browser test.");
  const rules = robotsRules.groups.flatMap((group) => group.rules.map((rule) => `${group.agents.join(", ")}: ${rule.allow ? "Allow" : "Disallow"} ${rule.path}`));
  const categoriesResult = assembleCategories(allChecks);
  const totalWeight = categoriesResult.filter((category) => category.score !== null).reduce((sum, category) => sum + category.weight, 0);
  const coverage = Math.round(totalWeight * 100);
  const overallScore = scoreOverall(categoriesResult, false);
  const potentialScore = scoreOverall(categoriesResult, true);
  const measuredChecks = allChecks.filter((check) => check.status !== "unknown").length;
  const unverifiedChecks = allChecks.filter((check) => check.status === "unknown").length;
  const scoreByPage: AuditedPage[] = pageData.map((page) => {
    const technical = categoryScore(page.checks, "technical");
    const content = categoryScore(page.checks, "content");
    const schema = categoryScore(page.checks, "schema");
    const entity = categoryScore(page.checks, "entity");
    const pageScores = { technical, content, schema, entity };
    const available = [technical, content, schema, entity].filter((score): score is number => score !== null);
    const weights = { technical: 0.4, content: 0.3, schema: 0.2, entity: 0.1 };
    const pageScoreWeight = Object.entries(pageScores).reduce((sum, [key, score]) => sum + (score === null ? 0 : weights[key as keyof typeof weights]), 0);
    const geoScore = pageScoreWeight ? Math.round(Object.entries(pageScores).reduce((sum, [key, score]) => sum + (score ?? 0) * weights[key as keyof typeof weights], 0) / pageScoreWeight) : null;
    return {
      url: page.url,
      statusCode: page.statusCode,
      responseMs: page.responseMs,
      title: page.title,
      description: page.description,
      headings: page.headings.map((heading) => `${heading.tag.toUpperCase()}: ${heading.text}`),
      wordCount: page.wordCount,
      internalLinks: page.internalUrls.length,
      externalLinks: page.externalUrls,
      imageCount: page.images.length,
      missingAlt: page.images.filter((image) => !image.alt?.trim()).length,
      schemaTypes: page.schemaTypes,
      schemaErrors: page.schemaErrors,
      canonical: page.canonical,
      robotsDirective: page.robotsDirective,
      checks: page.checks,
      scores: pageScores,
      geoScore: available.length ? geoScore : null,
    };
  });
  const orderedChecks = [...allChecks].sort((a, b) => severityWeight(b.severity) - severityWeight(a.severity));
  const issues = orderedChecks.filter((check) => check.status === "fail" || check.status === "warning");
  const actionPlan = issues.filter((check) => check.fix).sort((a, b) => severityWeight(b.severity) - severityWeight(a.severity));
  const page = homePage;
  const name = findBrand(page.title, homeHost);
  const email = page.html.match(/\bmailto:([^\s"'>]+)/i)?.[1];
  const socialUrls = pageData.flatMap((item) => item.externalUrls).filter((url) => /(?:instagram|facebook|linkedin|youtube|tiktok|x\.com|twitter)\./i.test(url));
  const aboutPage = pageCandidates.find((url) => /\/(?:about|our-story|company)(?:\/|$)/i.test(new URL(url).pathname)) ?? null;
  const descriptor = page.description || page.visibleText.slice(0, 280).trim();
  const suggestedJsonLd: Record<string, string | string[]> | null = rootOk
    ? {
        "@context": "https://schema.org",
        "@type": "Organization",
        name,
        url: origin,
        ...(descriptor ? { description: descriptor.slice(0, 300) } : {}),
        ...(email ? { email: decodeEntities(email) } : {}),
        ...(socialUrls.length ? { sameAs: [...new Set(socialUrls)].slice(0, 12) } : {}),
      }
    : null;
  const readiness = crawlerDefinitions
    .filter((crawler) => ["ChatGPT", "ChatGPT search", "Claude", "Perplexity", "Google AI Overviews", "Gemini"].includes(crawler.readiness))
    .map((crawler) => {
      const match = crawlers.find((candidate) => candidate.agent === crawler.agent);
      return {
        platform: crawler.readiness,
        technicalReady: match?.allowed ?? null,
        evidence: match?.evidence ?? "No crawler evidence available.",
      };
    });
  const trustSignals = [
    { dimension: "Experience", ids: ["customer-proof", "about"] },
    { dimension: "Expertise", ids: ["author"] },
    { dimension: "Authoritativeness", ids: ["source-links", "citation-count"] },
    { dimension: "Trustworthiness", ids: ["https", "contact", "policies"] },
  ].map(({ dimension, ids }) => {
    const signals = allChecks.filter((check) => ids.some((id) => check.id.endsWith(id)));
    const evidence = signals.filter((check) => check.status === "pass").map((check) => check.evidence);
    const score = aggregateScore(signals).score;
    return { dimension, score, evidence: evidence.length ? evidence : signals.filter((check) => check.status !== "pass").map((check) => check.evidence) };
  });
  const category = categoriesResult;
  const report: GeoAuditReport = {
    requestedUrl,
    siteUrl: origin,
    hostname: homeHost,
    auditedAt: new Date().toISOString(),
    title: page.title || homeHost,
    description: page.description,
    overallScore,
    potentialScore,
    grade: scoreGrade(overallScore),
    coverage,
    measuredChecks,
    unverifiedChecks,
    categoryScores: category,
    checks: allChecks,
    issues,
    actionPlan,
    pages: scoreByPage,
    crawlPagesLimit: PAGE_LIMIT,
    discoveredPages,
    robots: {
      url: robotsUrl,
      statusCode: robotsResult.status,
      accessible: hasRobots ? true : robotsResult.status === 404 ? false : null,
      rules: rules.slice(0, 40),
      sitemaps: robotsRules.sitemaps,
    },
    sitemap: { url: sitemapResult?.url ?? (sitemapResult?.status === 404 ? `${origin}/sitemap.xml` : null), statusCode: sitemapResult?.status ?? null, pageCount: sitemapPaths.length },
    crawlers,
    citations: { sources: citationSources, externalLinks: links.length, authoritativeRatingsAvailable: false },
    entitySignals: { brand: name, productOrService: descriptor || "No summary was published in the page metadata.", contact: email ? decodeEntities(email) : null, socialProfiles: [...new Set(socialUrls)].slice(0, 12), aboutPage },
    schema: { detectedTypes: [...new Set(pageData.flatMap((item) => item.schemaTypes))].sort(), validBlocks: pageData.reduce((sum, item) => sum + Math.max(0, extractTagContent(item.html, "script").filter((block) => /application\/ld\+json/i.test(block.attrs["type"] ?? "")).length - item.schemaErrors), 0), invalidBlocks: pageData.reduce((sum, item) => sum + item.schemaErrors, 0), suggestedJsonLd },
    aiReadiness: readiness,
    observedAiVisibility: { available: false, message: "AI mentions, citations and answer rankings were not queried. Live AI visibility needs a dedicated search/provider integration." },
    eeat: trustSignals,
    timings: {
      pagesFetched: pageData.filter((item) => item.statusCode !== null).length,
      totalDurationMs: Date.now() - started,
      averageResponseMs: pageData.filter((item) => item.responseMs !== null).length
        ? Math.round(pageData.reduce((sum, item) => sum + (item.responseMs ?? 0), 0) / pageData.filter((item) => item.responseMs !== null).length)
        : null,
      truncatedResponses: [homeResult, robotsResult, ...pageResponses].filter((result) => result.truncated).length,
    },
    competitors: [],
    partialWarnings: warnings,
  };
  if (!mainSite) return report;
  return report;
}

function competitorSummary(inputUrl: string, report: GeoAuditReport): CompetitorSummary {
  return {
    inputUrl,
    name: report.entitySignals.brand,
    url: report.siteUrl,
    geoScore: report.overallScore,
    coverage: report.coverage,
    technicalScore: report.categoryScores.find((category) => category.id === "technical")?.score ?? null,
    contentScore: report.categoryScores.find((category) => category.id === "content")?.score ?? null,
    schemaScore: report.categoryScores.find((category) => category.id === "schema")?.score ?? null,
    entityScore: report.categoryScores.find((category) => category.id === "entity")?.score ?? null,
    citationReadiness: report.categoryScores.find((category) => category.id === "content")?.score ?? null,
    authorityScore: report.categoryScores.find((category) => category.id === "authority")?.score ?? null,
    ...(report.overallScore === null ? { error: "Not enough accessible, measurable content was available to calculate this score." } : {}),
  };
}

export async function runSiteAudits(urls: string[]): Promise<GeoAuditReport[]> {
  if (!Array.isArray(urls) || urls.length < 1 || urls.length > 4) {
    throw new Error("Audit one website and up to three competitor websites.");
  }
  const normalized = urls.map((url) => safePublicUrl(url).toString());
  if (new Set(normalized.map((url) => new URL(url).hostname)).size !== normalized.length) {
    throw new Error("Enter a different website address for each competitor.");
  }
  const mainPromise = auditOne(normalized[0] ?? "");
  const competitorPromise = Promise.allSettled(normalized.slice(1).map((url) => auditOne(url)));
  const [main, competitorResults] = await Promise.all([mainPromise, competitorPromise]);
  main.competitors = competitorResults.map((result, index) => {
    const inputUrl = normalized[index + 1] ?? "";
    if (result.status === "fulfilled") return competitorSummary(inputUrl, result.value);
    return {
      inputUrl,
      name: new URL(inputUrl).hostname,
      url: inputUrl,
      geoScore: null,
      coverage: 0,
      technicalScore: null,
      contentScore: null,
      schemaScore: null,
      entityScore: null,
      citationReadiness: null,
      authorityScore: null,
      error: result.reason instanceof Error ? result.reason.message : "This competitor could not be audited.",
    };
  });
  return [main];
}