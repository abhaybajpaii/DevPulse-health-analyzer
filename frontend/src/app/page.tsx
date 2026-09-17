"use client";

import { useState } from "react";
import axios from "axios";
import {
  Activity, Search, AlertTriangle, CheckCircle2, Star, GitFork,
  Code2, BarChart3, GitPullRequest, Shield, Zap, GitCompare,
  Loader2, RefreshCw,
} from "lucide-react";

import type { AnalysisResponse } from "@/types/dashboard";
import { HealthGauge } from "@/components/HealthGauge";
import { HotspotsTable } from "@/components/HotspotsTable";
import { ActivityCharts } from "@/components/ActivityCharts";
import { DependencyCard } from "@/components/DependencyCard";
import { IssuesPRPanel } from "@/components/IssuesPRPanel";
import { ComparisonModal } from "@/components/ComparisonModal";
import { ExportButton } from "@/components/ExportButton";

// ─── Constants ────────────────────────────────────────────────────────────────

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";

const TABS = [
  { id: "overview", label: "Overview", icon: Activity },
  { id: "code", label: "Code Quality", icon: Code2 },
  { id: "activity", label: "Git Activity", icon: BarChart3 },
  { id: "issues", label: "Issues & PRs", icon: GitPullRequest },
  { id: "deps", label: "Deps & Docs", icon: Shield },
] as const;

type TabId = (typeof TABS)[number]["id"];

// ─── Skeleton loader ───────────────────────────────────────────────────────────

function SkeletonDashboard() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <div className="skeleton h-52 rounded-xl" />
        <div className="skeleton col-span-2 h-52 rounded-xl" />
      </div>
      <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton h-20 rounded-xl" />
        ))}
      </div>
      <div className="skeleton h-40 rounded-xl" />
    </div>
  );
}

// ─── AI Summary box ────────────────────────────────────────────────────────────

function AISummaryBox({ summary }: { summary: AnalysisResponse["ai_summary"] }) {
  const sections = [
    {
      label: "Strengths",
      items: summary.strengths,
      color: "#34d399",
      bg: "rgba(52, 211, 153, 0.06)",
      border: "rgba(52, 211, 153, 0.2)",
    },
    {
      label: "Bottlenecks",
      items: summary.bottlenecks,
      color: "#fbbf24",
      bg: "rgba(251, 191, 36, 0.06)",
      border: "rgba(251, 191, 36, 0.2)",
    },
    {
      label: "Recommendations",
      items: summary.recommendations,
      color: "#818cf8",
      bg: "rgba(129, 140, 248, 0.06)",
      border: "rgba(129, 140, 248, 0.2)",
    },
  ];

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
      <div className="mb-4 flex items-center gap-2">
        <Zap className="h-4 w-4 text-indigo-400" />
        <h3 className="text-sm font-bold text-slate-200">AI Executive Summary</h3>
        <span className="ml-auto rounded-full bg-indigo-950 px-2 py-0.5 text-[10px] font-semibold text-indigo-300 border border-indigo-900">
          AI
        </span>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {sections.map(({ label, items, color, bg, border }) => (
          <div
            key={label}
            className="rounded-lg p-3"
            style={{ background: bg, border: `1px solid ${border}` }}
          >
            <p
              className="mb-2 text-[10px] font-bold uppercase tracking-widest"
              style={{ color }}
            >
              {label}
            </p>
            <ul className="space-y-1.5">
              {items.map((item, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-slate-300">
                  <span className="mt-0.5 shrink-0 text-[8px]" style={{ color }}>
                    ●
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Overview tab ──────────────────────────────────────────────────────────────

function OverviewTab({ data }: { data: AnalysisResponse }) {
  const { health_score, repository, ai_summary, metrics } = data;
  const breakdownEntries = Object.entries(health_score.breakdown) as [string, number][];

  const breakdownColors: Record<string, string> = {
    code_quality: "#6366f1",
    testing: "#34d399",
    activity: "#38bdf8",
    issue_health: "#fbbf24",
    dependencies: "#f43f5e",
    documentation: "#a78bfa",
  };

  return (
    <div className="space-y-5">
      {/* Top row: gauge + repo info + breakdown */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Health Gauge */}
        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-900/60 p-6 lg:col-span-3">
          <HealthGauge score={health_score.overall_score} size={188} label="Overall Health" />
        </div>

        {/* Repo info + reasons */}
        <div className="space-y-4 lg:col-span-5">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <h2 className="text-base font-bold text-white">{repository.full_name}</h2>
            {repository.description && (
              <p className="mt-1 text-xs text-slate-400">{repository.description}</p>
            )}
            <div className="mt-3 flex flex-wrap gap-3">
              {repository.primary_language && (
                <span className="rounded-full bg-indigo-950 px-3 py-1 text-xs font-semibold text-indigo-300 border border-indigo-900">
                  {repository.primary_language}
                </span>
              )}
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <Star className="h-3.5 w-3.5 text-yellow-400" />
                {repository.stars.toLocaleString()}
              </span>
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <GitFork className="h-3.5 w-3.5 text-slate-500" />
                {repository.forks.toLocaleString()}
              </span>
              <span className="text-xs text-slate-600">
                Branch: <span className="text-slate-400">{repository.default_branch}</span>
              </span>
            </div>
          </div>

          {/* Key observations */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Key Observations
            </p>
            <div className="space-y-1.5">
              {health_score.reasons.map((reason, i) => {
                const isPos = reason.startsWith("✓");
                return (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    {isPos ? (
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
                    )}
                    <span className={isPos ? "text-slate-300" : "text-amber-200"}>
                      {reason.replace(/^[✓⚠]\s*/, "")}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Breakdown mini-gauges */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 lg:col-span-4">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Score Breakdown
          </p>
          <div className="space-y-3">
            {breakdownEntries.map(([key, val]) => {
              const color = breakdownColors[key] ?? "#6366f1";
              return (
                <div key={key}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="capitalize text-slate-400">{key.replace(/_/g, " ")}</span>
                    <span className="font-mono font-bold" style={{ color }}>
                      {val}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${val}%`,
                        background: `linear-gradient(90deg, ${color}66, ${color})`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* AI Executive Summary */}
      <AISummaryBox summary={ai_summary} />

      {/* Quick stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Recent Commits (30d)", value: metrics.activity.recent_commits_30_days, color: "#6366f1" },
          { label: "Active Contributors", value: metrics.activity.active_contributors_count, color: "#34d399" },
          { label: "Stale Issues", value: metrics.issues.stale_issues_count, color: "#fbbf24" },
          { label: "Open PRs", value: metrics.pull_requests.open_prs, color: "#818cf8" },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-center"
          >
            <p className="text-xs text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-black" style={{ color }}>
              {value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Code Quality tab ──────────────────────────────────────────────────────────

function CodeTab({ data }: { data: AnalysisResponse }) {
  const { code } = data.metrics;
  const stats = [
    { label: "Total Files", value: code.total_files, color: "#6366f1" },
    { label: "Python Files", value: code.python_files_count, color: "#34d399" },
    { label: "JS/TS Files", value: code.js_ts_files_count, color: "#fbbf24" },
    { label: "Test Files", value: code.test_files_count, color: "#818cf8" },
    {
      label: "Test / Source Ratio",
      value: code.test_to_source_ratio.toFixed(2),
      color: code.test_to_source_ratio >= 0.3 ? "#34d399" : "#f43f5e",
    },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {stats.map(({ label, value, color }) => (
          <div
            key={label}
            className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-center"
          >
            <p className="text-xs text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-black" style={{ color }}>
              {value}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-300">
          <Code2 className="h-4 w-4 text-indigo-400" />
          Code Hotspots
          <span className="ml-auto text-xs text-slate-600">Sorted by complexity</span>
        </h3>
        <HotspotsTable hotspots={code.hotspots ?? []} />
      </div>
    </div>
  );
}

// ─── Main Dashboard Page ───────────────────────────────────────────────────────

export default function Dashboard() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AnalysisResponse | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [compareOpen, setCompareOpen] = useState(false);

  const analyzeRepo = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post<AnalysisResponse>(
        `${API_URL}/github/analyze`,
        { url },
      );
      setData(response.data);
      setActiveTab("overview");
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.detail ||
          "Failed to analyze repository. Verify the URL and backend status."
        : "An unexpected error occurred.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Comparison Modal */}
      <ComparisonModal isOpen={compareOpen} onClose={() => setCompareOpen(false)} />

      <div className="cyber-grid min-h-screen">
        <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">

          {/* ── Top bar ─────────────────────────────────────────────────── */}
          <header className="mb-8 no-print">
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              {/* Brand */}
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 shadow-lg"
                  style={{ boxShadow: "0 0 20px rgba(99,102,241,0.5)" }}>
                  <Activity className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-black tracking-tight text-white">DevPulse</h1>
                  <p className="text-xs text-slate-500">Project Health Analytics</p>
                </div>
                {/* Live pulse dot */}
                <div className="ml-2 h-2 w-2 rounded-full bg-emerald-400 pulse-dot" />
              </div>

              {/* Search form */}
              <form
                onSubmit={analyzeRepo}
                className="flex flex-1 items-center gap-2 md:max-w-2xl"
              >
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    id="repo-url-input"
                    type="text"
                    placeholder="https://github.com/owner/repository"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 py-2.5 pl-9 pr-4 text-sm text-slate-100 placeholder-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
                  />
                </div>
                <button
                  id="analyze-btn"
                  type="submit"
                  disabled={loading}
                  className="flex shrink-0 items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-indigo-500 hover:shadow-lg active:scale-95 disabled:opacity-60"
                  style={{ boxShadow: loading ? "none" : "0 0 16px rgba(99,102,241,0.4)" }}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  {loading ? "Analyzing…" : "Analyze"}
                </button>
              </form>

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                <button
                  id="compare-repos-btn"
                  onClick={() => setCompareOpen(true)}
                  className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:border-slate-600 hover:text-white"
                >
                  <GitCompare className="h-4 w-4" />
                  Compare
                </button>
                {data && <ExportButton data={data} />}
              </div>
            </div>

            {/* Error banner */}
            {error && (
              <div className="mt-4 flex items-center gap-3 rounded-xl border border-rose-800 bg-rose-950/40 px-4 py-3 text-sm text-rose-300">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
                <span>{error}</span>
                <button
                  onClick={() => analyzeRepo()}
                  className="ml-auto flex items-center gap-1 rounded-lg bg-rose-900/50 px-2 py-1 text-xs hover:bg-rose-900"
                >
                  <RefreshCw className="h-3 w-3" /> Retry
                </button>
              </div>
            )}
          </header>

          {/* ── Loading skeleton ─────────────────────────────────────────── */}
          {loading && !data && <SkeletonDashboard />}

          {/* ── Empty state ──────────────────────────────────────────────── */}
          {!loading && !data && !error && (
            <div className="flex flex-col items-center justify-center gap-5 py-24 text-center">
              <div className="relative">
                <div
                  className="flex h-24 w-24 items-center justify-center rounded-3xl bg-indigo-600/20"
                  style={{ boxShadow: "0 0 40px rgba(99,102,241,0.2)" }}
                >
                  <Activity className="h-12 w-12 text-indigo-500" />
                </div>
                <div className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-emerald-400 pulse-dot" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-200">
                  Enterprise Repository Analyzer
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Enter any public GitHub repository URL above to generate a comprehensive health report.
                </p>
              </div>
              <div className="mt-2 flex flex-wrap justify-center gap-2 text-xs text-slate-600">
                {[
                  "Code Hotspots",
                  "Security Heuristics",
                  "Dependency Scanner",
                  "Git Velocity",
                  "AI Summary",
                  "Repo Comparison",
                ].map((f) => (
                  <span key={f} className="rounded-full border border-slate-800 bg-slate-900 px-3 py-1">
                    {f}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ── Dashboard content ────────────────────────────────────────── */}
          {data && (
            <div className="space-y-5">
              {/* Tab navigation */}
              <nav className="no-print flex overflow-x-auto border-b border-slate-800 pb-0">
                <div className="flex gap-0">
                  {TABS.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      id={`tab-${id}`}
                      onClick={() => setActiveTab(id)}
                      className={`relative flex shrink-0 items-center gap-2 px-5 py-3 text-sm font-medium transition-colors ${
                        activeTab === id
                          ? "text-white tab-active"
                          : "text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                      {activeTab === id && (
                        <span
                          className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                          style={{
                            background: "linear-gradient(90deg, #6366f1, #34d399)",
                          }}
                        />
                      )}
                    </button>
                  ))}
                </div>
              </nav>

              {/* Tab panels */}
              <div className="min-h-[400px]">
                {activeTab === "overview" && <OverviewTab data={data} />}

                {activeTab === "code" && <CodeTab data={data} />}

                {activeTab === "activity" && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-slate-300">
                      Git Activity & Contributor Velocity
                    </h3>
                    <ActivityCharts activity={data.metrics.activity} />
                  </div>
                )}

                {activeTab === "issues" && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-slate-300">
                      Issue & Pull Request Analytics
                    </h3>
                    <IssuesPRPanel
                      issues={data.metrics.issues}
                      pullRequests={data.metrics.pull_requests}
                    />
                  </div>
                )}

                {activeTab === "deps" && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-slate-300">
                      Dependencies & Documentation Health
                    </h3>
                    <DependencyCard
                      dependencies={data.metrics.dependencies}
                      documentation={data.metrics.documentation}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}