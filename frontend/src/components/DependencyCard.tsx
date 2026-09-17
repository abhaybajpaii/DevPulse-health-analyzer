"use client";

import { ShieldAlert, ShieldCheck, AlertTriangle, Info, PackageOpen, FileText } from "lucide-react";
import type { DependencyManifest, DocScores } from "@/types/dashboard";

interface DependencyCardProps {
  dependencies: DependencyManifest;
  documentation: DocScores;
}

const SEVERITY_CONFIG = {
  critical: {
    icon: ShieldAlert,
    className: "border-rose-800 bg-rose-950/60 text-rose-300",
    badge: "bg-rose-900 text-rose-300 border-rose-700",
    label: "Critical",
  },
  warning: {
    icon: AlertTriangle,
    className: "border-amber-800 bg-amber-950/60 text-amber-300",
    badge: "bg-amber-900 text-amber-300 border-amber-700",
    label: "Outdated",
  },
  info: {
    icon: Info,
    className: "border-indigo-800 bg-indigo-950/60 text-indigo-300",
    badge: "bg-indigo-900 text-indigo-300 border-indigo-700",
    label: "Info",
  },
};

function ScoreRing({ score, label }: { score: number; label: string }) {
  const color =
    score >= 80 ? "#34d399" : score >= 60 ? "#6366f1" : score >= 40 ? "#fbbf24" : "#f43f5e";
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative flex h-16 w-16 items-center justify-center">
        <svg className="absolute inset-0" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r="26" fill="none" stroke="#1e293b" strokeWidth="7" />
          <circle
            cx="32"
            cy="32"
            r="26"
            fill="none"
            stroke={color}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={`${(score / 100) * 163.4} 163.4`}
            transform="rotate(-90 32 32)"
            style={{ transition: "stroke-dasharray 1s ease" }}
          />
        </svg>
        <span className="relative text-sm font-bold" style={{ color }}>
          {score}
        </span>
      </div>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}

export function DependencyCard({ dependencies, documentation }: DependencyCardProps) {
  const { total_dependencies, unpinned_count, unpinned_packages, outdated_heuristics, dependency_score } =
    dependencies;
  const { documentation_score, checklist } = documentation;

  return (
    <div className="space-y-5">
      {/* Score overview rings */}
      <div className="flex items-center justify-around rounded-xl border border-slate-800 bg-slate-900/50 p-5">
        <ScoreRing score={Math.round(dependency_score)} label="Dep Health" />
        <div className="h-12 w-px bg-slate-800" />
        <ScoreRing score={Math.round(documentation_score)} label="Doc Score" />
        <div className="h-12 w-px bg-slate-800" />
        <div className="flex flex-col items-center gap-1">
          <div className="flex h-16 w-16 items-center justify-center">
            <p className="text-2xl font-black text-slate-100">{total_dependencies}</p>
          </div>
          <p className="text-xs text-slate-500">Total Deps</p>
        </div>
        <div className="h-12 w-px bg-slate-800" />
        <div className="flex flex-col items-center gap-1">
          <div className="flex h-16 w-16 items-center justify-center">
            <p
              className="text-2xl font-black"
              style={{ color: unpinned_count > 5 ? "#f43f5e" : unpinned_count > 0 ? "#fbbf24" : "#34d399" }}
            >
              {unpinned_count}
            </p>
          </div>
          <p className="text-xs text-slate-500">Unpinned</p>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {/* Outdated / vulnerable packages */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-300">
            <PackageOpen className="h-4 w-4 text-amber-400" />
            Dependency Heuristics
          </h4>
          {outdated_heuristics.length === 0 ? (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-900 bg-emerald-950/40 p-3">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <p className="text-xs text-emerald-300">All detected frameworks are up-to-date.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {outdated_heuristics.map((dep) => {
                const cfg = SEVERITY_CONFIG[dep.severity];
                const Icon = cfg.icon;
                return (
                  <div
                    key={dep.name}
                    className={`flex items-center justify-between rounded-lg border px-3 py-2 ${cfg.className}`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      <span className="text-xs font-semibold">{dep.name}</span>
                      <span className="font-mono text-[10px] opacity-70">{dep.detected_version}</span>
                    </div>
                    <span className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${cfg.badge}`}>
                      {cfg.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
          {unpinned_packages.length > 0 && (
            <div className="mt-3">
              <p className="mb-1.5 text-[10px] font-semibold uppercase text-slate-500">
                Unpinned Packages
              </p>
              <div className="flex flex-wrap gap-1">
                {unpinned_packages.slice(0, 8).map((pkg) => (
                  <span
                    key={pkg}
                    className="rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-400"
                  >
                    {pkg}
                  </span>
                ))}
                {unpinned_packages.length > 8 && (
                  <span className="text-[10px] text-slate-600">+{unpinned_packages.length - 8} more</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Documentation checklist */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-300">
            <FileText className="h-4 w-4 text-indigo-400" />
            Documentation Checklist
          </h4>
          <div className="space-y-2">
            {checklist.map((item) => (
              <div key={item.file} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {item.present ? (
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <ShieldAlert className="h-3.5 w-3.5 text-slate-600" />
                  )}
                  <span className={`font-mono text-xs ${item.present ? "text-slate-300" : "text-slate-600"}`}>
                    {item.file}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-600">{item.note}</span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                      item.present
                        ? "bg-emerald-950 text-emerald-400 border border-emerald-900"
                        : "bg-slate-800 text-slate-600 border border-slate-700"
                    }`}
                  >
                    +{item.weight}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
