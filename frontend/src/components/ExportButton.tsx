"use client";

import { useState, useRef } from "react";
import { Download, ChevronDown, FileJson, Printer } from "lucide-react";
import type { AnalysisResponse } from "@/types/dashboard";

interface ExportButtonProps {
  data: AnalysisResponse;
}

export function ExportButton({ data }: ExportButtonProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const repoName = data.repository.full_name.replace("/", "_");
    a.download = `devpulse_${repoName}_${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setOpen(false);
  };

  const exportPDF = () => {
    window.print();
    setOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:border-slate-600 hover:text-white"
      >
        <Download className="h-4 w-4" />
        Export
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
          />
          {/* Dropdown */}
          <div className="absolute right-0 top-full z-20 mt-1.5 w-48 overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-xl">
            <button
              onClick={exportJSON}
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
            >
              <FileJson className="h-4 w-4 text-indigo-400" />
              Export JSON
            </button>
            <div className="border-t border-slate-800" />
            <button
              onClick={exportPDF}
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
            >
              <Printer className="h-4 w-4 text-emerald-400" />
              Export PDF (Print)
            </button>
          </div>
        </>
      )}
    </div>
  );
}
