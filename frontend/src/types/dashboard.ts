// ─── Core health types ─────────────────────────────────────────────────────

export interface HealthBreakdown {
  code_quality: number;
  testing: number;
  activity: number;
  issue_health: number;
  dependencies: number;
  documentation: number;
}

export interface HealthScore {
  overall_score: number;
  breakdown: HealthBreakdown;
  reasons: string[];
}

// ─── Repository metadata ───────────────────────────────────────────────────

export interface RepoMetadata {
  name: string;
  full_name: string;
  description: string | null;
  owner: string;
  stars: number;
  forks: number;
  open_issues_count: number;
  primary_language: string | null;
  default_branch: string;
  created_at?: string;
  updated_at?: string;
  size_kb?: number;
}

// ─── Code quality & hotspots ───────────────────────────────────────────────

export interface HotspotFile {
  file: string;
  loc: number;
  cyclomatic_complexity: number;
  maintainability_rating: "A" | "B" | "C" | "D";
  smells: string[];
  language: string;
}

export interface CodeMetrics {
  total_files: number;
  python_files_count: number;
  js_ts_files_count: number;
  test_files_count: number;
  test_to_source_ratio: number;
  hotspots: HotspotFile[];
}

// ─── Activity & velocity ───────────────────────────────────────────────────

export interface WeeklyChartPoint {
  week: string;
  commits: number;
}

export interface ContributorVelocity {
  name: string;
  commits: number;
}

export interface ActivityMetrics {
  total_commits_fetched: number;
  active_contributors_count: number;
  recent_commits_30_days: number;
  weekly_activity: Record<string, number>;
  weekly_chart_data: WeeklyChartPoint[];
  contributor_breakdown: ContributorVelocity[];
  additions_total: number;
  deletions_total: number;
}

// ─── Issues & PRs ─────────────────────────────────────────────────────────

export interface IssueMetrics {
  total_issues: number;
  open_issues: number;
  closed_issues: number;
  closure_rate_pct: number;
  stale_issues_count: number;
}

export interface PRMetrics {
  total_prs: number;
  open_prs: number;
  merged_prs: number;
  long_running_prs_count: number;
}

// ─── Dependencies ─────────────────────────────────────────────────────────

export interface OutdatedHeuristic {
  name: string;
  detected_version: string;
  min_recommended_major: number;
  severity: "critical" | "warning" | "info";
}

export interface DependencyManifest {
  total_dependencies: number;
  unpinned_count: number;
  unpinned_packages: string[];
  outdated_heuristics: OutdatedHeuristic[];
  dependency_score: number;
}

// ─── Documentation ─────────────────────────────────────────────────────────

export interface DocChecklistItem {
  file: string;
  present: boolean;
  weight: number;
  note: string;
}

export interface DocScores {
  documentation_score: number;
  checklist: DocChecklistItem[];
}

// ─── AI Summary ───────────────────────────────────────────────────────────

export interface AISummary {
  overall_score: number;
  strengths: string[];
  bottlenecks: string[];
  recommendations: string[];
}

// ─── Full analysis response ────────────────────────────────────────────────

export interface AnalysisResponse {
  status: string;
  cached?: boolean;
  repository: RepoMetadata;
  health_score: HealthScore;
  ai_summary: AISummary;
  metrics: {
    activity: ActivityMetrics;
    issues: IssueMetrics;
    pull_requests: PRMetrics;
    code: CodeMetrics;
    dependencies: DependencyManifest;
    documentation: DocScores;
  };
}

// ─── Comparison ───────────────────────────────────────────────────────────

export interface ComparisonDelta {
  score_delta: number;
  activity_delta: number;
  issue_health_delta: number;
  dependency_delta: number;
  documentation_delta: number;
  winner: string;
}

export interface ComparisonPayload {
  status: string;
  repo_a: AnalysisResponse;
  repo_b: AnalysisResponse;
  delta: ComparisonDelta;
}