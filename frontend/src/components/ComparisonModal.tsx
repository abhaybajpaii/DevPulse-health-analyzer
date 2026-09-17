"use client";

import { useState } from "react";
import axios from "axios";
import { X, GitCompare, Loader2, ArrowRight, Trophy } from "lucide-react";
import { HealthGauge } from "./HealthGauge";
import type { ComparisonPayload, AnalysisResponse } from "@/types/dashboard";

interface ComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const API_URL =
  typeof window !== "undefined"
    ? process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1"
    : "http://127.0.0.1:8000/api/v1";

function DeltaBadge({ value, unit = "" }: { value: number; unit?: string }) {
  if (value === 0) return <span className="text-slate-500">—</span>;
  const isPos = value > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs font-bold ${
        isPos
          ? "bg-emerald-950 text-emerald-300 border border-emerald-900"
          : "bg-rose-950 text-rose-300 border border-rose-900"
      }`}
    >
      {isPos ? "+" : ""}
      {value}
      {unit}
    </span>
  );
}

function RepoColumn({ data, label }: { data: AnalysisResponse; label: string }) {
  const score = data.health_score.overall_score;
  const repo = data.repository;
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div
        className={`w-full rounded-xl border p-3 ${
          label === "Repo A" ? "border-indigo-800 bg-indigo-950/30" : "border-emerald-800 bg-emerald-950/30"
        }`}
      >
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">{label}</p>
        <p className="mt-1 truncate text-sm font-bold text-slate-200">{repo.full_name}</p>
        {repo.primary_language && (
          <span className="mt-1 inline-block rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400">
            {repo.primary_language}
          </span>
        )}
      </div>
      <HealthGauge score={score} size={140} label="Overall" />
      <div className="w-full space-y-1.5">
        {Object.entries(data.health_score.breakdown).map(([key, val]) => (
          <div key={key} className="flex items-center justify-between text-xs">
            <span className="capitalize text-slate-500">{key.replace("_", " ")}</span>
            <span className="font-mono font-bold text-slate-300">{val}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ComparisonModal({ isOpen, onClose }: ComparisonModalProps) {
  const [urlA, setUrlA] = useState("");
  const [urlB, setUrlB] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ComparisonPayload | null>(null);

  const handleCompare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlA.trim() || !urlB.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await axios.post<ComparisonPayload>(
        `${API_URL}/github/compare`,
        { url_a: urlA, url_b: urlB },
      );
      setResult(res.data);
    } catch (err: unknown) {
      const msg =
        axios.isAxiosError(err)
          ? err.response?.data?.detail || "Comparison failed. Check both URLs and try again."
          : "An unexpected error occurred.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 pt-16"
      style={{ background: "rgba(2, 8, 23, 0.85)", backdropFilter: "blur(8px)" }}
    >
      <div
        className="w-full max-w-4xl rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl"
        style={{ boxShadow: "0 0 60px rgba(99, 102, 241, 0.15)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <h2 className="flex items-center gap-2 text-lg font-bold text-white">
            <GitCompare className="h-5 w-5 text-indigo-400" />
            Repository Comparison
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Input form */}
        <form onSubmit={handleCompare} className="border-b border-slate-800 px-6 py-4">
          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <input
              type="text"
              placeholder="https://github.com/owner/repo-a"
              value={urlA}
              onChange={(e) => setUrlA(e.target.value)}
              className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <ArrowRight className="h-4 w-4 shrink-0 text-slate-600" />
            <input
              type="text"
              placeholder="https://github.com/owner/repo-b"
              value={urlB}
              onChange={(e) => setUrlB(e.target.value)}
              className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <button
              type="submit"
              disabled={loading || !urlA.trim() || !urlB.trim()}
              className="flex shrink-0 items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                "Compare"
              )}
            </button>
          </div>
          {error && (
            <p className="mt-3 text-xs text-rose-400">{error}</p>
          )}
        </form>

        {/* Results */}
        {result && result.status === "success" && (
          <div className="px-6 py-5">
            {/* Winner banner */}
            {result.delta.winner && (
              <div className="mb-5 flex items-center gap-3 rounded-xl border border-yellow-800/50 bg-yellow-950/30 px-4 py-3">
                <Trophy className="h-5 w-5 shrink-0 text-yellow-400" />
                <p className="text-sm text-yellow-200">
                  <span className="font-bold">{result.delta.winner}</span> scores higher overall.
                </p>
              </div>
            )}

            {/* Side-by-side comparison */}
            <div className="grid grid-cols-2 gap-6">
              {result.repo_a.status === "success" && (
                <RepoColumn data={result.repo_a} label="Repo A" />
              )}
              {result.repo_b.status === "success" && (
                <RepoColumn data={result.repo_b} label="Repo B" />
              )}
            </div>

            {/* Delta table */}
            <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Differential (A vs B)
              </h4>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {[
                  { label: "Health Score", val: result.delta.score_delta },
                  { label: "Activity", val: result.delta.activity_delta },
                  { label: "Issue Health", val: result.delta.issue_health_delta },
                  { label: "Dep. Score", val: result.delta.dependency_delta },
                  { label: "Docs Score", val: result.delta.documentation_delta },
                ].map(({ label, val }) => (
                  <div
                    key={label}
                    className="flex flex-col items-center gap-1 rounded-lg border border-slate-800 p-3"
                  >
                    <span className="text-[10px] text-slate-500">{label}</span>
                    <DeltaBadge value={val} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-4 px-6 py-5">
            <div className="skeleton h-20 w-full rounded-xl" />
            <div className="grid grid-cols-2 gap-4">
              <div className="skeleton h-48 rounded-xl" />
              <div className="skeleton h-48 rounded-xl" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
