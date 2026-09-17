"use client";

import { useState } from "react";
import { ChevronUp, ChevronDown, AlertTriangle, CheckCircle2, Minus } from "lucide-react";
import type { HotspotFile } from "@/types/dashboard";

interface HotspotsTableProps {
  hotspots: HotspotFile[];
}

const RATING_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  A: { bg: "#052e16", text: "#34d399", border: "#16a34a55" },
  B: { bg: "#1e1b4b", text: "#818cf8", border: "#4f46e555" },
  C: { bg: "#451a03", text: "#fbbf24", border: "#d9770655" },
  D: { bg: "#4c0519", text: "#f43f5e", border: "#e11d4855" },
};

const SMELL_COLORS: Record<string, string> = {
  "High Complexity": "bg-rose-950 text-rose-300 border-rose-800",
  "Moderate Complexity": "bg-amber-950 text-amber-300 border-amber-800",
  "Long File": "bg-indigo-950 text-indigo-300 border-indigo-800",
  "God Class Risk": "bg-purple-950 text-purple-300 border-purple-800",
  Clean: "bg-emerald-950 text-emerald-300 border-emerald-800",
};

type SortKey = "file" | "loc" | "cyclomatic_complexity" | "maintainability_rating";

export function HotspotsTable({ hotspots }: HotspotsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("cyclomatic_complexity");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  if (!hotspots || hotspots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-slate-800 bg-slate-900/50 py-12 text-center">
        <CheckCircle2 className="h-10 w-10 text-emerald-500 opacity-60" />
        <p className="text-sm font-medium text-slate-400">No significant hotspots detected.</p>
        <p className="text-xs text-slate-600">All analyzed files are within healthy complexity bounds.</p>
      </div>
    );
  }

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const sorted = [...hotspots].sort((a, b) => {
    const va = a[sortKey];
    const vb = b[sortKey];
    if (typeof va === "number" && typeof vb === "number") {
      return sortDir === "asc" ? va - vb : vb - va;
    }
    return sortDir === "asc"
      ? String(va).localeCompare(String(vb))
      : String(vb).localeCompare(String(va));
  });

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <Minus className="ml-1 h-3 w-3 text-slate-600" />;
    return sortDir === "asc"
      ? <ChevronUp className="ml-1 h-3 w-3 text-indigo-400" />
      : <ChevronDown className="ml-1 h-3 w-3 text-indigo-400" />;
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-800 bg-slate-900/80">
            {(
              [
                ["file", "File Path"],
                ["loc", "LOC"],
                ["cyclomatic_complexity", "Complexity"],
                ["maintainability_rating", "Rating"],
              ] as [SortKey, string][]
            ).map(([key, label]) => (
              <th
                key={key}
                onClick={() => handleSort(key)}
                className="cursor-pointer select-none px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 transition-colors hover:text-slate-200"
              >
                <span className="inline-flex items-center">
                  {label}
                  <SortIcon col={key} />
                </span>
              </th>
            ))}
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
              Code Smells
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => {
            const ratingStyle = RATING_COLORS[row.maintainability_rating] ?? RATING_COLORS.B;
            const ccColor =
              row.cyclomatic_complexity > 15
                ? "#f43f5e"
                : row.cyclomatic_complexity > 10
                ? "#fbbf24"
                : row.cyclomatic_complexity > 5
                ? "#818cf8"
                : "#34d399";

            return (
              <tr
                key={i}
                className="border-b border-slate-800/60 bg-slate-900/30 transition-colors hover:bg-slate-800/40"
              >
                <td className="max-w-[240px] px-4 py-3">
                  <div className="flex items-center gap-2">
                    {row.cyclomatic_complexity > 10 ? (
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500 opacity-50" />
                    )}
                    <span
                      className="truncate font-mono text-xs text-slate-300"
                      title={row.file}
                    >
                      {row.file}
                    </span>
                  </div>
                  <span className="ml-5 text-xs text-slate-600">{row.language}</span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-slate-400">
                  {row.loc.toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <span
                    className="inline-flex items-center gap-1 rounded px-2 py-0.5 font-mono text-xs font-bold"
                    style={{ background: `${ccColor}18`, color: ccColor, border: `1px solid ${ccColor}44` }}
                  >
                    {row.cyclomatic_complexity}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className="inline-flex items-center rounded px-2.5 py-0.5 text-xs font-bold"
                    style={{
                      background: ratingStyle.bg,
                      color: ratingStyle.text,
                      border: `1px solid ${ratingStyle.border}`,
                    }}
                  >
                    {row.maintainability_rating}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {row.smells.map((smell) => (
                      <span
                        key={smell}
                        className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${
                          SMELL_COLORS[smell] ?? "bg-slate-800 text-slate-400 border-slate-700"
                        }`}
                      >
                        {smell}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
