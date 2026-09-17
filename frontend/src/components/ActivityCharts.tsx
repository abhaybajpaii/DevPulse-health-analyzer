"use client";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import type { ActivityMetrics } from "@/types/dashboard";
import { GitCommitHorizontal, Users, Plus, Minus as MinusIcon } from "lucide-react";

interface ActivityChartsProps {
  activity: ActivityMetrics;
}

const PIE_COLORS = [
  "#6366f1", "#34d399", "#fbbf24", "#f43f5e", "#a78bfa",
  "#38bdf8", "#fb923c", "#4ade80", "#e879f9", "#94a3b8",
];

const CustomTooltip = ({
  active, payload, label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 shadow-xl">
        <p className="text-xs font-semibold text-slate-300">{label}</p>
        <p className="text-sm font-bold text-indigo-400">{payload[0].value} commits</p>
      </div>
    );
  }
  return null;
};

const PieTooltip = ({
  active, payload,
}: {
  active?: boolean;
  payload?: { name: string; value: number }[];
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 shadow-xl">
        <p className="text-xs text-slate-300">{payload[0].name}</p>
        <p className="text-sm font-bold text-emerald-400">{payload[0].value} commits</p>
      </div>
    );
  }
  return null;
};

export function ActivityCharts({ activity }: ActivityChartsProps) {
  const weeklyData = activity.weekly_chart_data ?? [];
  const contributorData = activity.contributor_breakdown ?? [];

  const statCards = [
    {
      icon: GitCommitHorizontal,
      label: "Total Commits",
      value: activity.total_commits_fetched,
      color: "#6366f1",
    },
    {
      icon: Users,
      label: "Active Contributors",
      value: activity.active_contributors_count,
      color: "#34d399",
    },
    {
      icon: Plus,
      label: "Lines Added",
      value: activity.additions_total > 0 ? `+${activity.additions_total.toLocaleString()}` : "N/A",
      color: "#34d399",
    },
    {
      icon: MinusIcon,
      label: "Lines Deleted",
      value: activity.deletions_total > 0 ? `-${activity.deletions_total.toLocaleString()}` : "N/A",
      color: "#f43f5e",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statCards.map(({ icon: Icon, label, value, color }) => (
          <div
            key={label}
            className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-center"
          >
            <Icon className="mx-auto mb-2 h-5 w-5" style={{ color }} />
            <p className="text-xs text-slate-500">{label}</p>
            <p className="mt-1 text-lg font-bold text-slate-100">{value}</p>
          </div>
        ))}
      </div>

      {/* Commit frequency bar chart */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
        <h4 className="mb-5 text-sm font-semibold text-slate-300">
          Weekly Commit Frequency
        </h4>
        {weeklyData.length > 0 ? (
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData} barSize={14}>
                <XAxis
                  dataKey="week"
                  stroke="#475569"
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#475569"
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={28}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "#1e293b88" }} />
                <Bar dataKey="commits" fill="#6366f1" radius={[4, 4, 0, 0]}>
                  {weeklyData.map((_, i) => (
                    <Cell
                      key={i}
                      fill={i === weeklyData.length - 1 ? "#818cf8" : "#6366f1"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-slate-600">No weekly data available.</p>
        )}
      </div>

      {/* Contributor distribution pie chart */}
      {contributorData.length > 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <h4 className="mb-5 text-sm font-semibold text-slate-300">
            Contributor Distribution
          </h4>
          <div className="flex flex-col items-center gap-4 md:flex-row">
            <div className="h-48 w-full md:w-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={contributorData}
                    dataKey="commits"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius="55%"
                    outerRadius="80%"
                    paddingAngle={3}
                  >
                    {contributorData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Legend list */}
            <div className="flex flex-col gap-1.5">
              {contributorData.slice(0, 8).map((c, i) => (
                <div key={c.name} className="flex items-center gap-2 text-xs">
                  <div
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                  />
                  <span className="truncate max-w-[140px] text-slate-300">{c.name}</span>
                  <span className="ml-auto font-mono font-bold text-slate-400">
                    {c.commits}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
