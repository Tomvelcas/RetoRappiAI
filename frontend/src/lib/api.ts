const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:8418";

export type Confidence = "high" | "medium" | "low";
export type CoverageFlag = Confidence;

export type BackendHealth = {
  status: string;
  service: string;
  environment: string;
};

export type TimeWindow = {
  requested_start: string | null;
  requested_end: string | null;
  effective_start: string;
  effective_end: string;
  comparison_start?: string | null;
  comparison_end?: string | null;
  observed_dataset_start: string;
  observed_dataset_end: string;
};

export type KPI = {
  key: string;
  label: string;
  value: number | string;
  formatted_value: string;
  context: string;
  change_label: string | null;
  confidence: Confidence | null;
};

export type DailyTrendPoint = {
  date: string;
  mean_signal: number;
  median_signal: number;
  coverage_ratio: number;
  coverage_flag: CoverageFlag;
};

export type IntradayProfilePoint = {
  hour: number;
  mean_signal: number;
  median_signal: number;
  avg_points: number;
  coverage_ratio: number;
  coverage_flag: CoverageFlag;
};

export type AnomalyHighlight = {
  hour_bucket: string;
  date: string;
  hour: number;
  mean_signal: number;
  baseline_mean: number;
  baseline_median: number;
  zscore: number;
  delta_vs_hour_median: number;
  n_points: number;
  anomaly_direction: string;
  coverage_flag: CoverageFlag;
  confidence: Confidence;
};

export type QualitySummary = {
  selected_coverage_ratio: number;
  selected_coverage_flag: CoverageFlag;
  daily_rows_in_selection: number;
  raw_file_count: number;
  canonical_timestamp_count: number;
  duplicate_window_groups: number;
  duplicate_window_records: number;
  incomplete_window_records: number;
  overlapping_timestamp_count: number;
  missing_points_full_range: number;
  missing_ratio_full_range: number;
  cadence_seconds_mode: number;
  observed_start: string;
  observed_end: string;
  source_metric_name: string;
  source_plot_name: string;
};

export type CoverageExtremePoint = {
  date: string;
  coverage_ratio: number;
  coverage_flag: CoverageFlag;
  n_points: number;
  expected_points: number;
  missing_points: number;
  mean_signal: number;
};

export type DayBriefingHour = {
  hour: number;
  label: string;
  mean_signal: number;
  coverage_ratio: number;
  coverage_flag: CoverageFlag;
};

export type DayBriefing = {
  target_date: string;
  headline: string;
  summary: string;
  confidence: Confidence;
  mean_signal: number;
  formatted_mean_signal: string;
  median_signal: number;
  coverage_ratio: number;
  coverage_flag: CoverageFlag;
  delta_vs_prior_day: number | null;
  delta_vs_prior_day_label: string | null;
  strongest_hour: DayBriefingHour;
  weakest_hour: DayBriefingHour;
  top_anomalies: AnomalyHighlight[];
  highlights: string[];
  cautions: string[];
  suggested_questions: string[];
};

export type MetricsOverviewResponse = {
  generated_at: string;
  time_window: TimeWindow;
  kpis: KPI[];
  trend: DailyTrendPoint[];
  intraday_profile: IntradayProfilePoint[];
  top_anomalies: AnomalyHighlight[];
  quality: QualitySummary;
  notes: string[];
};

export type MetricsCoverageExtremesResponse = {
  generated_at: string;
  time_window: TimeWindow;
  lowest_coverage_days: CoverageExtremePoint[];
  highest_coverage_days: CoverageExtremePoint[];
  notes: string[];
};

export type MetricsDayBriefingResponse = {
  generated_at: string;
  time_window: TimeWindow;
  briefing: DayBriefing;
};

export type ChatEvidenceItem = {
  label: string;
  value: string;
  source: string;
};

export type ChatQueryRequest = {
  question: string;
  conversation_id?: string;
  use_llm?: boolean;
  allow_hypotheses?: boolean;
  external_context?: string;
};

export type ChatQueryResponse = {
  answer: string;
  intent: string;
  supported: boolean;
  confidence: Confidence;
  answer_mode: "deterministic" | "llm_enhanced" | "deterministic_fallback";
  llm_used: boolean;
  llm_provider: string | null;
  llm_model: string | null;
  external_context_used: boolean;
  evidence: ChatEvidenceItem[];
  hypotheses: string[];
  follow_up_questions: string[];
  warnings: string[];
  source_tables: string[];
  reasoning_scope: string;
  disclaimer: string;
  time_window: TimeWindow | null;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    cache: "no-store",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;

    try {
      const errorPayload = (await response.json()) as { detail?: string };
      if (errorPayload.detail) {
        message = errorPayload.detail;
      }
    } catch {
      // Ignore JSON parse issues and keep the default message.
    }

    throw new Error(message);
  }

  return (await response.json()) as T;
}

export function getBackendHealth(signal?: AbortSignal): Promise<BackendHealth> {
  return request<BackendHealth>("/health", { signal });
}

export function getMetricsOverview(signal?: AbortSignal): Promise<MetricsOverviewResponse> {
  return request<MetricsOverviewResponse>("/api/v1/metrics/overview", { signal });
}

export function getCoverageExtremes(
  limit = 3,
  signal?: AbortSignal,
): Promise<MetricsCoverageExtremesResponse> {
  return request<MetricsCoverageExtremesResponse>(
    `/api/v1/metrics/coverage-extremes?limit=${limit}`,
    { signal },
  );
}

export function getDayBriefing(
  targetDate?: string,
  anomalyLimit = 3,
  signal?: AbortSignal,
): Promise<MetricsDayBriefingResponse> {
  const params = new URLSearchParams();
  if (targetDate) {
    params.set("target_date", targetDate);
  }
  params.set("anomaly_limit", String(anomalyLimit));

  return request<MetricsDayBriefingResponse>(
    `/api/v1/metrics/day-briefing?${params.toString()}`,
    { signal },
  );
}

export function queryChat(
  payload: ChatQueryRequest,
  signal?: AbortSignal,
): Promise<ChatQueryResponse> {
  return request<ChatQueryResponse>("/api/v1/chat/query", {
    method: "POST",
    body: JSON.stringify(payload),
    signal,
  });
}
