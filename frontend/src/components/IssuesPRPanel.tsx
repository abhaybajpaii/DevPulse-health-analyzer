"use client";

import { AlertTriangle, CheckCircle2, Clock, GitMerge, GitPullRequest, XCircle } from "lucide-react";
import type { IssueMetrics, PRMetrics } from "@/types/dashboard";

interface IssuesPRPanelProps {
  issues: IssueMetrics;
  pullRequests: PRMetrics;
}

function ProgressBar({ value, max = 100, color }: { value: number; max?: number; color: string }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{
          width: `${pct}%`,
          background: `linear-gradient(90deg, ${color}88, ${color})`,
          boxShadow: `0 0 8px ${color}55`,
        }}
      />
    </div>
  );
}

function StatBlock({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="mb-2 flex items-center gap-2">
        <Icon className="h-4 w-4" style={{ color }} />
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      </div>
      <p className="text-2xl font-black text-slate-100">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-600">{sub}</p>}
    </div>
  );
}

export function IssuesPRPanel({ issues, pullRequests }: IssuesPRPanelProps) {
  const {
    total_issues,
    open_issues,
    closed_issues,
    closure_rate_pct,
    stale_issues_count,
  } = issues;

  const { total_prs, open_prs, merged_prs, long_running_prs_count } = pullRequests;
  const mergeRatio = total_prs > 0 ? Math.round((merged_prs / total_prs) * 100) : 0;

  const closureColor =
    closure_rate_pct >= 75 ? "#34d399" : closure_rate_pct >= 50 ? "#6366f1" : "#f43f5e";
  const mergeColor =
    mergeRatio >= 70 ? "#34d399" : mergeRatio >= 40 ? "#fbbf24" : "#f43f5e";

  return (
    <div className="space-y-5">
      {/* Issues section */}
      <div>
        <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-300">
          <AlertTriangle className="h-4 w-4 text-amber-400" />
          Issue Tracker
        </h4>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatBlock
            icon={AlertTriangle}
            label="Total Issues"
            value={total_issues}
            color="#fbbf24"
          />
          <StatBlock
            icon={CheckCircle2}
            label="Closed"
            value={closed_issues}
            sub={`${closure_rate_pct.toFixed(1)}% closure rate`}
            color="#34d399"
          />
          <StatBlock
            icon={XCircle}
            label="Open"
            value={open_issues}
            color="#f43f5e"
          />
          <StatBlock
            icon={Clock}
            label="Stale (>60d)"
            value={stale_issues_count}
            sub="No activity in 60+ days"
            color={stale_issues_count > 5 ? "#f43f5e" : "#fbbf24"}
          />
        </div>

        {/* Closure rate progress */}
        <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Issue Closure Rate</span>
            <span className="text-sm font-bold" style={{ color: closureColor }}>
              {closure_rate_pct.toFixed(1)}%
            </span>
          </div>
          <ProgressBar value={closure_rate_pct} color={closureColor} />
          <div className="mt-2 flex justify-between text-[10px] text-slate-600">
            <span>Closed: {closed_issues}</span>
            <span>Open: {open_issues}</span>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-slate-800" />

      {/* Pull Request section */}
      <div>
        <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-300">
          <GitPullRequest className="h-4 w-4 text-indigo-400" />
          Pull Request Analytics
        </h4>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatBlock
            icon={GitPullRequest}
            label="Total PRs"
            value={total_prs}
            color="#6366f1"
          />
          <StatBlock
            icon={GitMerge}
            label="Merged"
            value={merged_prs}
            sub={`${mergeRatio}% merge ratio`}
            color="#34d399"
          />
          <StatBlock
            icon={GitPullRequest}
            label="Open PRs"
            value={open_prs}
            color="#818cf8"
          />
          <StatBlock
            icon={Clock}
            label="Long-Running (>14d)"
            value={long_running_prs_count}
            sub="Open for 14+ days"
            color={long_running_prs_count > 3 ? "#f43f5e" : "#fbbf24"}
          />
        </div>

        {/* Merge ratio progress */}
        <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">PR Merge Ratio</span>
            <span className="text-sm font-bold" style={{ color: mergeColor }}>
              {mergeRatio}%
            </span>
          </div>
          <ProgressBar value={mergeRatio} color={mergeColor} />
          <div className="mt-2 flex justify-between text-[10px] text-slate-600">
            <span>Merged: {merged_prs}</span>
            <span>Total: {total_prs}</span>
          </div>
        </div>

        {/* Stale PR warning */}
        {long_running_prs_count > 0 && (
          <div className="mt-3 flex items-center gap-3 rounded-lg border border-amber-900/60 bg-amber-950/30 p-3">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
            <p className="text-xs text-amber-200">
              <span className="font-bold">{long_running_prs_count} PR{long_running_prs_count > 1 ? "s" : ""}</span> have
              been open for over 14 days — consider reviewing or closing stale pull requests.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
