import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowUpRight,
  Bot,
  Check,
  CircleAlert,
  CircleCheck,
  CircleHelp,
  Clock3,
  ExternalLink,
  FileJson,
  Globe2,
  LoaderCircle,
  Plus,
  Printer,
  ScanSearch,
  Share2,
  ShieldCheck,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { runGeoAudit } from "@/lib/geo-audit.functions";
import type { AuditCheck, AuditStatus, GeoAuditReport } from "@/lib/geo-audit.types";

export const Route = createFileRoute("/audit")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "GEO Audit Workspace | SARKAR Fragrances" },
      {
        name: "description",
        content:
          "Run an evidence-based generative search visibility audit with technical findings, crawler access, structured data, and prioritized actions.",
      },
      { property: "og:title", content: "GEO Audit Workspace | SARKAR Fragrances" },
      {
        property: "og:description",
        content: "Measure website readiness for generative search with evidence-backed findings.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "https://sarkar-scents-showcase.lovable.app/audit" },
    ],
    links: [{ rel: "canonical", href: "https://sarkar-scents-showcase.lovable.app/audit" }],
  }),
  component: AuditWorkspace,
});

type AuditTab = "overview" | "findings" | "pages";

function scoreText(score: number | null): string {
  return score === null ? "—" : `${score}`;
}

function statusIcon(status: AuditStatus) {
  if (status === "pass") return <CircleCheck className="size-4" aria-hidden="true" />;
  if (status === "warning") return <TriangleAlert className="size-4" aria-hidden="true" />;
  if (status === "fail") return <CircleAlert className="size-4" aria-hidden="true" />;
  return <CircleHelp className="size-4" aria-hidden="true" />;
}

function statusLabel(status: AuditStatus): string {
  return status === "pass" ? "Pass" : status === "warning" ? "Review" : status === "fail" ? "Issue" : "Unverified";
}

function findingTone(status: AuditStatus): string {
  return status === "pass"
    ? "text-primary"
    : status === "warning"
      ? "geo-warn-text"
      : status === "fail"
        ? "text-destructive"
        : "text-muted-foreground";
}

function findingBackground(status: AuditStatus): string {
  return status === "pass" ? "geo-pass-bg" : status === "warning" ? "geo-warn-bg" : "bg-muted";
}

function FindingRow({ check, number }: { check: AuditCheck; number: number }) {
  return (
    <article className="grid gap-4 border-b border-border py-5 last:border-0 md:grid-cols-[2.25rem_minmax(0,1fr)_auto] md:items-start">
      <span className="flex size-8 items-center justify-center rounded-full bg-muted font-mono text-xs text-muted-foreground">
        {String(number).padStart(2, "0")}
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className="text-base font-semibold">{check.label}</h3>
          <span className={`inline-flex items-center gap-1 text-xs font-medium ${findingTone(check.status)}`}>
            {statusIcon(check.status)} {statusLabel(check.status)}
          </span>
          <span className="text-xs text-muted-foreground">{check.severity} priority</span>
        </div>
        <p className="mt-2 break-words text-sm leading-relaxed text-muted-foreground">{check.evidence}</p>
        {check.fix && check.status !== "pass" && check.status !== "unknown" ? (
          <p className="mt-3 border-l-2 border-primary pl-3 text-sm leading-relaxed">
            <span className="font-semibold text-foreground">Suggested action</span>
            <span className="text-muted-foreground"> · {check.fix}</span>
          </p>
        ) : null}
        {check.pageUrl ? (
          <a
            href={check.pageUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-3 inline-flex max-w-full items-center gap-1 break-all text-xs text-primary hover:underline"
          >
            {check.pageUrl} <ExternalLink className="size-3 shrink-0" aria-hidden="true" />
          </a>
        ) : null}
      </div>
      <span className={`w-fit rounded-sm px-2 py-1 text-[11px] font-semibold uppercase ${findingBackground(check.status)} ${findingTone(check.status)}`}>
        {check.categoryId}
      </span>
    </article>
  );
}

function AuditWorkspace() {
  const audit = useServerFn(runGeoAudit);
  const [siteUrl, setSiteUrl] = useState("https://sarkar-scents-showcase.lovable.app");
  const [competitors, setCompetitors] = useState<string[]>([]);
  const [report, setReport] = useState<GeoAuditReport | null>(null);
  const [tab, setTab] = useState<AuditTab>("overview");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const run = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const urls = [siteUrl.trim(), ...competitors.map((url) => url.trim()).filter(Boolean)];
      const reports = await audit({ data: { urls } });
      const nextReport = reports[0];
      if (!nextReport) throw new Error("No audit report was returned. Please try again.");
      setReport(nextReport);
      setTab("overview");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The audit could not be completed.");
    } finally {
      setBusy(false);
    }
  };

  const reportText = () => {
    if (!report) return "";
    return [
      `GEO audit · ${report.hostname}`,
      `Score: ${scoreText(report.overallScore)} / 100 · ${report.grade}`,
      `Coverage: ${report.coverage}% · ${report.measuredChecks} measured · ${report.unverifiedChecks} unverified`,
      `Audited ${new Date(report.auditedAt).toLocaleString()}`,
      "AI visibility: not queried; technical readiness only.",
      report.siteUrl,
    ].join("\n");
  };

  const downloadReport = () => {
    if (!report) return;
    const payload = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(payload);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `geo-audit-${report.hostname}-${report.auditedAt.slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice("Audit snapshot downloaded as JSON.");
  };

  const shareReport = async () => {
    if (!report) return;
    const text = reportText();
    try {
      if (navigator.share) {
        await navigator.share({ title: `GEO audit · ${report.hostname}`, text });
        setNotice("Audit summary shared.");
      } else {
        await navigator.clipboard.writeText(text);
        setNotice("Audit summary copied to clipboard.");
      }
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      try {
        await navigator.clipboard.writeText(text);
        setNotice("Audit summary copied to clipboard.");
      } catch {
        setNotice("Sharing is unavailable in this browser. Download the JSON snapshot instead.");
      }
    }
  };

  return (
    <div className="geo-shell min-h-screen">
      <header className="geo-no-print border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" aria-hidden="true" /> Back to SARKAR
          </Link>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <span className="flex size-8 items-center justify-center rounded-sm bg-accent text-primary">
              <ScanSearch className="size-4" aria-hidden="true" />
            </span>
            GEO Audit
            <span className="hidden border-l border-border pl-2 text-xs font-normal text-muted-foreground sm:inline">Website visibility workspace</span>
          </div>
          <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
            <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
            Evidence-led · no ranking promises
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 pb-16">
        <section className="border-b border-border py-9 md:py-12">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.72fr)] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase text-primary">Generative search · live diagnostics</p>
              <h1 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight md:text-5xl">SARKAR GEO Audit</h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
                Inspect crawl access, page structure, content signals, and trust cues. Every score is tied to a measured observation or marked unverified.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-4 border-t border-border pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
              <div><p className="text-xl font-semibold">10</p><p className="mt-1 text-xs text-muted-foreground">Scored areas</p></div>
              <div><p className="text-xl font-semibold">6</p><p className="mt-1 text-xs text-muted-foreground">Pages per site</p></div>
              <div><p className="text-xl font-semibold">Live</p><p className="mt-1 text-xs text-muted-foreground">Public-page scan</p></div>
            </div>
          </div>

          <form onSubmit={run} className="mt-8 border-t border-border pt-6" noValidate>
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
              <label className="block min-w-0">
                <span className="mb-2 block text-xs font-semibold uppercase text-muted-foreground">Website to audit</span>
                <Input
                  type="url"
                  required
                  value={siteUrl}
                  onChange={(event) => setSiteUrl(event.target.value)}
                  placeholder="https://yourwebsite.com"
                  aria-label="Website to audit"
                  className="h-11 rounded-sm bg-card"
                />
              </label>
              <div className="min-w-0">
                {competitors.map((url, index) => (
                  <label className="mb-3 block min-w-0 last:mb-0" key={index}>
                    <span className="mb-2 block text-xs font-semibold uppercase text-muted-foreground">Competitor {index + 1} <span className="font-normal normal-case">(optional)</span></span>
                    <span className="flex gap-2">
                      <Input
                        type="url"
                        value={url}
                        onChange={(event) => setCompetitors((current) => current.map((item, i) => i === index ? event.target.value : item))}
                        placeholder="https://competitor.com"
                        aria-label={`Competitor ${index + 1} website`}
                        className="h-11 min-w-0 rounded-sm bg-card"
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="size-11 shrink-0 rounded-sm"
                        aria-label={`Remove competitor ${index + 1}`}
                        title="Remove competitor"
                        onClick={() => setCompetitors((current) => current.filter((_, i) => i !== index))}
                      ><Trash2 /></Button>
                    </span>
                  </label>
                ))}
                {competitors.length < 3 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mt-2 h-8 rounded-sm px-1 text-xs text-muted-foreground"
                    onClick={() => setCompetitors((current) => [...current, ""])}
                  ><Plus /> Add competitor</Button>
                ) : null}
              </div>
              <Button type="submit" disabled={busy || !siteUrl.trim()} className="h-11 rounded-sm px-6">
                {busy ? <><LoaderCircle className="animate-spin" /> Auditing…</> : <><ScanSearch /> Run audit</>}
              </Button>
            </div>
            {busy ? (
              <p role="status" className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <LoaderCircle className="size-4 animate-spin text-primary" /> Checking up to six public pages per website; larger sites may take a little longer.
              </p>
            ) : null}
            {error ? <p role="alert" className="mt-4 border-l-2 border-destructive pl-3 text-sm text-destructive">{error}</p> : null}
          </form>
        </section>

        {!report && !busy ? (
          <section className="grid gap-10 py-12 md:grid-cols-[minmax(0,0.9fr)_minmax(280px,1.1fr)] md:items-start">
            <div>
              <div className="flex size-11 items-center justify-center rounded-sm bg-accent text-primary"><Globe2 className="size-5" /></div>
              <h2 className="mt-4 text-2xl font-semibold">Start with a public website</h2>
              <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">Enter a complete website address above to inspect the homepage and a small sample of same-site pages. No credentials or changes to the website are required.</p>
            </div>
            <div className="border-l-2 border-primary pl-5">
              <p className="text-sm font-semibold">What this scan can tell you</p>
              <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
                <li>Whether common search and AI crawlers are allowed by robots.txt.</li>
                <li>Which page, content, metadata, and structured-data checks passed.</li>
                <li>Which fixes are most useful based on the measured findings.</li>
              </ul>
              <p className="mt-4 text-xs leading-relaxed text-muted-foreground">This does not query AI answer engines, measure rankings, or predict citations. GEO is evolving; findings reflect a bounded technical sample, not a guarantee of visibility.</p>
            </div>
          </section>
        ) : null}

        {report ? (
          <>
            <section className="border-b border-border py-8">
              <div className="flex flex-wrap items-start justify-between gap-5">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Audit report · {new Date(report.auditedAt).toLocaleString()}</p>
                  <h2 className="mt-2 break-all text-2xl font-semibold">{report.entitySignals.brand}</h2>
                  <a href={report.siteUrl} target="_blank" rel="noreferrer noopener" className="mt-1 inline-flex max-w-full items-center gap-1 break-all text-sm text-primary hover:underline">
                    {report.siteUrl} <ArrowUpRight className="size-4 shrink-0" />
                  </a>
                  <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">{report.description || "No site description was published in the pages sampled."}</p>
                </div>
                <div className="geo-no-print flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" className="rounded-sm" onClick={shareReport}><Share2 /> Share summary</Button>
                  <Button type="button" variant="outline" size="sm" className="rounded-sm" onClick={downloadReport}><ArrowDownToLine /> Export JSON</Button>
                  <Button type="button" variant="outline" size="icon" className="rounded-sm" aria-label="Print report" title="Print report" onClick={() => window.print()}><Printer /></Button>
                </div>
              </div>
              {notice ? <p role="status" className="mt-3 text-xs text-primary">{notice}</p> : null}
              {report.partialWarnings.length ? (
                <div className="geo-warn-bg geo-warn-text mt-5 flex gap-3 rounded-sm px-4 py-3 text-sm">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                  <div><p className="font-semibold">Some checks were limited</p><ul className="mt-1 list-inside list-disc text-xs leading-relaxed">{report.partialWarnings.slice(0, 4).map((warning, index) => <li key={`${index}-${warning}`}>{warning}</li>)}</ul></div>
                </div>
              ) : null}
            </section>

            <section className="grid gap-x-10 gap-y-8 border-b border-border py-8 md:grid-cols-[minmax(230px,0.65fr)_minmax(0,1.35fr)]">
              <div className="flex gap-5">
                <div className="flex size-28 shrink-0 flex-col items-center justify-center border border-border bg-card">
                  <span className="font-mono text-4xl font-semibold leading-none">{scoreText(report.overallScore)}</span>
                  <span className="mt-1 text-xs text-muted-foreground">out of 100</span>
                </div>
                <div className="py-1">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Overall GEO score</p>
                  <p className="mt-2 text-xl font-semibold">{report.overallScore === null ? "Unrated" : report.overallScore >= 90 ? "A" : report.overallScore >= 75 ? "B" : report.overallScore >= 60 ? "C" : report.overallScore >= 40 ? "D" : "F"} · {report.grade}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{report.overallScore === null ? "Insufficient measurable evidence" : "Based on measured checks only"}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
                <div><p className="font-mono text-2xl font-semibold">{report.coverage}%</p><p className="mt-1 text-xs text-muted-foreground">Score coverage</p></div>
                <div><p className="font-mono text-2xl font-semibold">{report.measuredChecks}</p><p className="mt-1 text-xs text-muted-foreground">Checks measured</p></div>
                <div><p className="font-mono text-2xl font-semibold">{report.unverifiedChecks}</p><p className="mt-1 text-xs text-muted-foreground">Unverified</p></div>
                <div><p className="font-mono text-2xl font-semibold">{report.timings.pagesFetched}/{report.crawlPagesLimit}</p><p className="mt-1 text-xs text-muted-foreground">Pages fetched / limit</p></div>
              </div>
              <div className="md:col-span-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>Observed AI visibility</span>
                  <span className="inline-flex items-center gap-1"><CircleHelp className="size-3.5" /> Not queried</span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{report.observedAiVisibility.message} Technical crawler access below reflects robots.txt rules only; it does not confirm indexing, recommendations, or citations.</p>
              </div>
            </section>

            <nav aria-label="Audit report sections" className="geo-no-print flex flex-wrap gap-1 border-b border-border py-3">
              {(["overview", "findings", "pages"] as const).map((name) => (
                <Button key={name} type="button" size="sm" variant={tab === name ? "secondary" : "ghost"} className="rounded-sm capitalize" aria-pressed={tab === name} onClick={() => setTab(name)}>{name === "pages" ? "Pages & competitors" : name}</Button>
              ))}
            </nav>

            {tab === "overview" ? (
              <div className="grid gap-10 py-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
                <section>
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div><p className="text-xs font-semibold uppercase text-primary">Score breakdown</p><h2 className="mt-2 text-2xl font-semibold">Category performance</h2></div>
                    <p className="text-xs text-muted-foreground">Scores are weighted by measured evidence.</p>
                  </div>
                  <div className="mt-5 divide-y divide-border border-y border-border">
                    {report.categoryScores.map((category) => (
                      <div key={category.id} className="grid grid-cols-[minmax(0,1fr)_3rem] gap-x-4 gap-y-2 py-4 sm:grid-cols-[minmax(0,1fr)_3rem_2.5rem]">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1"><p className="text-sm font-medium">{category.label}</p><span className="text-[11px] text-muted-foreground">{category.measured} measured · {Math.round(category.weight * 100)}% weight</span></div>
                          <progress className="geo-progress mt-2" max={100} value={category.score ?? 0} aria-label={`${category.label} score ${scoreText(category.score)} out of 100`} />
                        </div>
                        <span className="self-center text-right font-mono text-lg font-semibold">{scoreText(category.score)}</span>
                        <span className="col-span-2 text-[11px] text-muted-foreground sm:col-span-1 sm:self-center sm:text-right">{category.score === null ? "Unverified" : `${category.passed} pass · ${category.warnings + category.failed} to review`}</span>
                      </div>
                    ))}
                  </div>
                </section>

                <div className="space-y-10">
                  <section>
                    <div className="flex items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase text-primary">Access</p><h2 className="mt-2 text-xl font-semibold">Crawler rules</h2></div><span className="text-xs text-muted-foreground">robots.txt only</span></div>
                    <div className="mt-4 divide-y divide-border border-y border-border">
                      {report.crawlers.map((crawler) => (
                        <div key={crawler.agent} className="flex items-start justify-between gap-4 py-3">
                          <div className="flex min-w-0 gap-3"><Bot className="mt-0.5 size-4 shrink-0 text-primary" /><div className="min-w-0"><p className="text-sm font-medium">{crawler.name}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{crawler.evidence}</p></div></div>
                          <span className={`shrink-0 text-xs font-semibold ${crawler.allowed === true ? "text-primary" : crawler.allowed === false ? "text-destructive" : "text-muted-foreground"}`}>{crawler.allowed === true ? "Allowed" : crawler.allowed === false ? "Blocked" : "Unknown"}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                  <section>
                    <div><p className="text-xs font-semibold uppercase text-primary">Structured data</p><h2 className="mt-2 text-xl font-semibold">Schema signals</h2></div>
                    <div className="mt-4 border-y border-border py-4">
                      <p className="text-sm">{report.schema.detectedTypes.length ? report.schema.detectedTypes.join(" · ") : "No structured data types detected"}</p>
                      <p className="mt-2 text-xs text-muted-foreground">{report.schema.validBlocks} readable block(s) · {report.schema.invalidBlocks} malformed · sampled pages only</p>
                      {report.schema.suggestedJsonLd ? <details className="mt-4"><summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium"><FileJson className="size-4 text-primary" /> View suggested Organization JSON-LD</summary><pre className="mt-3 overflow-x-auto bg-muted p-4 text-xs leading-relaxed">{JSON.stringify(report.schema.suggestedJsonLd, null, 2)}</pre></details> : null}
                    </div>
                  </section>
                  <section>
                    <div><p className="text-xs font-semibold uppercase text-primary">Site identity</p><h2 className="mt-2 text-xl font-semibold">Entity signals</h2></div>
                    <dl className="mt-4 divide-y divide-border border-y border-border text-sm">
                      <div className="flex justify-between gap-4 py-3"><dt className="text-muted-foreground">Brand</dt><dd className="text-right">{report.entitySignals.brand}</dd></div>
                      <div className="flex justify-between gap-4 py-3"><dt className="text-muted-foreground">Offering</dt><dd className="max-w-[65%] text-right">{report.entitySignals.productOrService}</dd></div>
                      <div className="flex justify-between gap-4 py-3"><dt className="text-muted-foreground">Contact</dt><dd className="text-right">{report.entitySignals.contact ?? "Not detected"}</dd></div>
                      <div className="flex justify-between gap-4 py-3"><dt className="text-muted-foreground">Social links</dt><dd className="text-right">{report.entitySignals.socialProfiles.length || "None detected"}</dd></div>
                    </dl>
                  </section>
                </div>
              </div>
            ) : null}

            {tab === "findings" ? (
              <section className="py-8">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div><p className="text-xs font-semibold uppercase text-primary">Evidence register</p><h2 className="mt-2 text-2xl font-semibold">Findings &amp; actions</h2></div>
                  <p className="text-xs text-muted-foreground">{report.issues.length} item(s) to review · severity ordered</p>
                </div>
                {report.issues.length ? <div className="mt-4 border-y border-border">{report.issues.map((check, index) => <FindingRow key={check.id} check={check} number={index + 1} />)}</div> : <div className="mt-5 flex items-center gap-3 border-y border-border py-8 text-sm text-muted-foreground"><Check className="size-5 text-primary" /> No failing or warning checks were reported in this sample.</div>}
                {report.unverifiedChecks ? <details className="mt-6 border-b border-border pb-5"><summary className="cursor-pointer text-sm font-semibold">Show {report.unverifiedChecks} unverified checks</summary><div className="mt-2">{report.checks.filter((check) => check.status === "unknown").slice(0, 50).map((check, index) => <FindingRow key={check.id} check={check} number={index + 1} />)}</div></details> : null}
                <div className="mt-8 grid gap-8 md:grid-cols-2">
                  <section><p className="text-xs font-semibold uppercase text-primary">Crawler readiness</p><h3 className="mt-2 text-lg font-semibold">Technical access observations</h3><div className="mt-3 divide-y divide-border border-y border-border">{report.aiReadiness.map((item) => <div key={item.platform} className="flex justify-between gap-3 py-3 text-sm"><div><p className="font-medium">{item.platform}</p><p className="mt-1 text-xs text-muted-foreground">{item.evidence}</p></div><span className="shrink-0 text-xs text-muted-foreground">{item.technicalReady === null ? "Unverified" : item.technicalReady ? "Allowed" : "Blocked"}</span></div>)}</div></section>
                  <section><p className="text-xs font-semibold uppercase text-primary">Trust dimensions</p><h3 className="mt-2 text-lg font-semibold">E-E-A-T signals</h3><div className="mt-3 divide-y divide-border border-y border-border">{report.eeat.map((dimension) => <div key={dimension.dimension} className="flex justify-between gap-3 py-3 text-sm"><div><p className="font-medium">{dimension.dimension}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{dimension.evidence.join(" ") || "No directly measured signal in this sample."}</p></div><span className="font-mono text-sm">{dimension.score === null ? "—" : `${dimension.score}%`}</span></div>)}</div></section>
                </div>
                <p className="mt-8 border-l-2 border-border pl-4 text-xs leading-relaxed text-muted-foreground">This audit uses a limited HTML and robots.txt sample. It does not verify review authenticity, page rendering in a full browser, Core Web Vitals, backlink authority, live AI answers, or search ranking. Scores represent observed checks, not a prediction or guarantee.</p>
              </section>
            ) : null}

            {tab === "pages" ? (
              <section className="py-8">
                <div><p className="text-xs font-semibold uppercase text-primary">Sampled URLs</p><h2 className="mt-2 text-2xl font-semibold">Pages &amp; competitors</h2><p className="mt-2 text-sm text-muted-foreground">{report.discoveredPages} discovered link target(s); up to {report.crawlPagesLimit} pages are fetched per website.</p></div>
                <div className="mt-5 divide-y divide-border border-y border-border">
                  {report.pages.map((page) => (
                    <article key={page.url} className="grid gap-4 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                      <div className="min-w-0"><a href={page.url} target="_blank" rel="noreferrer noopener" className="inline-flex max-w-full items-center gap-2 break-all text-sm font-medium text-primary hover:underline">{page.url}<ExternalLink className="size-3 shrink-0" /></a><p className="mt-2 text-sm">{page.title || "No page title detected"}</p><p className="mt-1 text-xs text-muted-foreground">HTTP {page.statusCode ?? "—"} · {page.wordCount} words · {page.internalLinks} internal links · {page.imageCount} images · {page.schemaTypes.length} schema type(s)</p><p className="mt-2 text-xs leading-relaxed text-muted-foreground">{page.description || "No meta description detected"}</p></div>
                      <div className="flex flex-wrap items-start gap-5"><div className="text-right"><p className="font-mono text-xl font-semibold">{scoreText(page.geoScore)}</p><p className="text-[11px] text-muted-foreground">page score</p></div><details className="max-w-full text-xs"><summary className="cursor-pointer text-primary">Checks</summary><div className="mt-2 max-h-72 w-full max-w-sm overflow-auto border border-border bg-card p-3">{page.checks.map((check) => <p key={check.id} className="border-b border-border py-2"><span className={`mr-2 font-semibold ${findingTone(check.status)}`}>{statusLabel(check.status)}</span>{check.label}<span className="mt-1 block break-words text-muted-foreground">{check.evidence}</span></p>)}</div></details></div>
                    </article>
                  ))}
                  {!report.pages.length ? <p className="py-8 text-sm text-muted-foreground">No website pages were available to inspect.</p> : null}
                </div>

                <div className="mt-10">
                  <p className="text-xs font-semibold uppercase text-primary">Live comparison</p><h3 className="mt-2 text-xl font-semibold">Competitor snapshot</h3>
                  {report.competitors.length ? (
                    <div className="mt-4 overflow-x-auto border-y border-border">
                      <table className="w-full min-w-[620px] border-collapse text-left text-sm"><thead><tr className="border-b border-border text-xs text-muted-foreground"><th className="py-3 pr-4 font-medium">Website</th><th className="py-3 px-3 font-medium">GEO score</th><th className="py-3 px-3 font-medium">Coverage</th><th className="py-3 px-3 font-medium">Technical</th><th className="py-3 px-3 font-medium">Content</th><th className="py-3 px-3 font-medium">Schema</th></tr></thead><tbody>{[{ name: report.entitySignals.brand, url: report.siteUrl, geoScore: report.overallScore, coverage: report.coverage, technicalScore: report.categoryScores.find((category) => category.id === "technical")?.score ?? null, contentScore: report.categoryScores.find((category) => category.id === "content")?.score ?? null, schemaScore: report.categoryScores.find((category) => category.id === "schema")?.score ?? null, error: undefined }, ...report.competitors].map((item) => <tr key={item.url} className="border-b border-border last:border-0"><td className="max-w-52 py-3 pr-4"><a href={item.url} target="_blank" rel="noreferrer noopener" className="break-all font-medium text-primary hover:underline">{item.name}</a>{item.error ? <span className="mt-1 block text-xs text-muted-foreground">{item.error}</span> : null}</td><td className="px-3 font-mono">{scoreText(item.geoScore)}</td><td className="px-3">{item.coverage}%</td><td className="px-3">{scoreText(item.technicalScore)}</td><td className="px-3">{scoreText(item.contentScore)}</td><td className="px-3">{scoreText(item.schemaScore)}</td></tr>)}</tbody></table>
                    </div>
                  ) : <p className="mt-4 border-y border-border py-5 text-sm text-muted-foreground">No competitors included. Add up to three websites and rerun to compare them using the same live checks.</p>}
                </div>

                <div className="mt-10 grid gap-8 md:grid-cols-2">
                  <section><div className="flex items-center gap-2"><Globe2 className="size-4 text-primary" /><h3 className="text-lg font-semibold">Robots.txt</h3></div><p className="mt-2 text-xs text-muted-foreground">{report.robots.url} · HTTP {report.robots.statusCode ?? "unknown"}</p><p className="mt-2 text-sm">{report.robots.accessible === true ? "File fetched successfully." : report.robots.accessible === false ? "No robots.txt file found (404)." : "Availability could not be confirmed."}</p>{report.robots.rules.length ? <details className="mt-3"><summary className="cursor-pointer text-sm text-primary">Show observed rules ({report.robots.rules.length})</summary><pre className="mt-2 max-h-52 overflow-auto border border-border bg-card p-3 text-xs">{report.robots.rules.join("\n")}</pre></details> : null}</section>
                  <section><div className="flex items-center gap-2"><Clock3 className="size-4 text-primary" /><h3 className="text-lg font-semibold">Crawl details</h3></div><dl className="mt-3 divide-y divide-border border-y border-border text-sm"><div className="flex justify-between gap-3 py-2.5"><dt className="text-muted-foreground">Pages successfully fetched</dt><dd>{report.timings.pagesFetched}</dd></div><div className="flex justify-between gap-3 py-2.5"><dt className="text-muted-foreground">Average response</dt><dd>{report.timings.averageResponseMs === null ? "—" : `${report.timings.averageResponseMs} ms`}</dd></div><div className="flex justify-between gap-3 py-2.5"><dt className="text-muted-foreground">Total scan time</dt><dd>{report.timings.totalDurationMs} ms</dd></div><div className="flex justify-between gap-3 py-2.5"><dt className="text-muted-foreground">Responses capped</dt><dd>{report.timings.truncatedResponses}</dd></div></dl></section>
                </div>
              </section>
            ) : null}
          </>
        ) : null}

        <footer className="border-t border-border py-5 text-xs leading-relaxed text-muted-foreground">
          <div className="flex flex-wrap items-center justify-between gap-2"><span>GEO Audit · Technical diagnostics from a bounded public-page sample.</span><span className="inline-flex items-center gap-1"><Clock3 className="size-3" /> Up to six pages per website</span></div>
          <p className="mt-2 max-w-5xl">Generative engine optimization is an evolving field. Scores reflect the checks available at audit time; they do not represent proprietary AI engine behavior, observed answer visibility, or guaranteed search outcomes.</p>
        </footer>
      </main>
    </div>
  );
}