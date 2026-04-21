const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:8418";

export type Confidence = "high" | "medium" | "low";
export type CoverageFlag = Confidence;

export type BackendHealth = {
  status: string;
  service: string;
  environment: string;
  llm: {
    enabled: boolean;
    ready: boolean;
    provider: string;
    model: string | null;
    auto_mode: boolean;
  };
  chat: {
    memory_enabled: boolean;
    memory_backend: string;
  };
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

export type ChatArtifactCard = {
  label: string;
  value: string;
  detail: string | null;
  tone: "default" | "accent" | "warning" | "muted";
};

export type ChatArtifactPoint = {
  label: string;
  value: number;
  formatted_value: string;
  detail: string | null;
  highlight: boolean;
  tone: "default" | "accent" | "warning" | "muted";
};

export type ChatArtifact = {
  kind: "hourly_coverage_chart" | "bar_chart";
  title: string;
  subtitle: string | null;
  cards: ChatArtifactCard[];
  points: ChatArtifactPoint[];
  footnote: string | null;
};

export type ChatExternalSource = {
  title: string;
  url: string;
  domain: string;
};

export type ChatQueryRequest = {
  question: string;
  conversation_id?: string;
  use_llm?: boolean;
  allow_hypotheses?: boolean;
  allow_web_research?: boolean;
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
  web_research_used: boolean;
  analysis_steps: string[];
  evidence: ChatEvidenceItem[];
  artifacts: ChatArtifact[];
  hypotheses: string[];
  web_sources: ChatExternalSource[];
  follow_up_questions: string[];
  warnings: string[];
  source_tables: string[];
  reasoning_scope: string;
  disclaimer: string;
  time_window: TimeWindow | null;
};

export type MetricsQueryOptions = {
  startDate?: string | null;
  endDate?: string | null;
  anomalyLimit?: number;
  limit?: number;
  targetDate?: string;
  signal?: AbortSignal;
};

function buildMetricsQuery(options: MetricsQueryOptions, extra?: Record<string, string>): string {
  const params = new URLSearchParams();

  if (options.startDate) {
    params.set("start_date", options.startDate);
  }

  if (options.endDate) {
    params.set("end_date", options.endDate);
  }

  if (options.targetDate) {
    params.set("target_date", options.targetDate);
  }

  if (typeof options.anomalyLimit === "number") {
    params.set("anomaly_limit", String(options.anomalyLimit));
  }

  if (typeof options.limit === "number") {
    params.set("limit", String(options.limit));
  }

  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      params.set(key, value);
    }
  }

  const query = params.toString();
  return query ? `?${query}` : "";
}

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

function readEmbeddedJsonStringField(raw: string, fieldName: string): string | null {
  const marker = `"${fieldName}"`;
  const markerIndex = raw.indexOf(marker);
  if (markerIndex === -1) {
    return null;
  }

  const colonIndex = raw.indexOf(":", markerIndex + marker.length);
  if (colonIndex === -1) {
    return null;
  }

  let valueStart = colonIndex + 1;
  while (valueStart < raw.length && /\s/.test(raw[valueStart] ?? "")) {
    valueStart += 1;
  }

  if (raw[valueStart] !== "\"") {
    return null;
  }

  valueStart += 1;
  let escaped = false;
  let buffer = "";
  for (let index = valueStart; index < raw.length; index += 1) {
    const char = raw[index] ?? "";
    if (escaped) {
      buffer += char;
      escaped = false;
      continue;
    }
    if (char === "\\") {
      buffer += char;
      escaped = true;
      continue;
    }
    if (char === "\"") {
      try {
        return JSON.parse(`"${buffer}"`) as string;
      } catch {
        return buffer
          .replace(/\\n/g, "\n")
          .replace(/\\t/g, "\t")
          .replace(/\\"/g, "\"")
          .replace(/\\\\/g, "\\");
      }
    }
    buffer += char;
  }

  return null;
}

function readEmbeddedJsonArrayField(raw: string, fieldName: string): string[] | null {
  const marker = `"${fieldName}"`;
  const markerIndex = raw.indexOf(marker);
  if (markerIndex === -1) {
    return null;
  }

  const colonIndex = raw.indexOf(":", markerIndex + marker.length);
  if (colonIndex === -1) {
    return null;
  }

  let valueStart = colonIndex + 1;
  while (valueStart < raw.length && /\s/.test(raw[valueStart] ?? "")) {
    valueStart += 1;
  }

  if (raw[valueStart] !== "[") {
    return null;
  }

  let depth = 0;
  let insideString = false;
  let escaped = false;
  for (let index = valueStart; index < raw.length; index += 1) {
    const char = raw[index] ?? "";
    if (insideString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "\"") {
        insideString = false;
      }
      continue;
    }

    if (char === "\"") {
      insideString = true;
      continue;
    }
    if (char === "[") {
      depth += 1;
      continue;
    }
    if (char === "]") {
      depth -= 1;
      if (depth === 0) {
        const candidate = raw.slice(valueStart, index + 1);
        try {
          const parsed = JSON.parse(candidate) as unknown;
          if (!Array.isArray(parsed)) {
            return null;
          }
          return parsed
            .map((item) => String(item).trim())
            .filter(Boolean);
        } catch {
          return null;
        }
      }
    }
  }

  return null;
}

function normalizeChatResponse(payload: ChatQueryResponse): ChatQueryResponse {
  if (typeof payload.answer !== "string") {
    return payload;
  }

  const rawAnswer = payload.answer.trim();
  if (!rawAnswer.startsWith("{") || !rawAnswer.includes("\"answer\"")) {
    return payload;
  }

  let parsedAnswer: string | null = null;
  let parsedHypotheses: string[] = [];
  let parsedFollowUps: string[] = [];
  let parsedCaveats: string[] = [];

  try {
    const parsed = JSON.parse(rawAnswer) as Partial<{
      answer: unknown;
      hypotheses: unknown;
      follow_up_questions: unknown;
      caveats: unknown;
    }>;
    parsedAnswer = typeof parsed.answer === "string" ? parsed.answer.trim() : null;
    parsedHypotheses = Array.isArray(parsed.hypotheses)
      ? parsed.hypotheses.map((item) => String(item).trim()).filter(Boolean)
      : [];
    parsedFollowUps = Array.isArray(parsed.follow_up_questions)
      ? parsed.follow_up_questions.map((item) => String(item).trim()).filter(Boolean)
      : [];
    parsedCaveats = Array.isArray(parsed.caveats)
      ? parsed.caveats.map((item) => String(item).trim()).filter(Boolean)
      : [];
  } catch {
    parsedAnswer = readEmbeddedJsonStringField(rawAnswer, "answer");
    parsedHypotheses = readEmbeddedJsonArrayField(rawAnswer, "hypotheses") ?? [];
    parsedFollowUps = readEmbeddedJsonArrayField(rawAnswer, "follow_up_questions") ?? [];
    parsedCaveats = readEmbeddedJsonArrayField(rawAnswer, "caveats") ?? [];
  }

  if (!parsedAnswer) {
    return payload;
  }

  return {
    ...payload,
    answer: parsedAnswer,
    hypotheses: payload.hypotheses.length ? payload.hypotheses : parsedHypotheses,
    follow_up_questions: payload.follow_up_questions.length
      ? payload.follow_up_questions
      : parsedFollowUps,
    warnings: payload.warnings.length ? payload.warnings : parsedCaveats,
  };
}

export function getBackendHealth(signal?: AbortSignal): Promise<BackendHealth> {
  return request<BackendHealth>("/health", { signal });
}

export function getMetricsOverview(
  options: MetricsQueryOptions = {},
): Promise<MetricsOverviewResponse> {
  return request<MetricsOverviewResponse>(
    `/api/v1/metrics/overview${buildMetricsQuery(options)}`,
    { signal: options.signal },
  );
}

export function getCoverageExtremes(
  options: MetricsQueryOptions = {},
): Promise<MetricsCoverageExtremesResponse> {
  return request<MetricsCoverageExtremesResponse>(
    `/api/v1/metrics/coverage-extremes${buildMetricsQuery({
      ...options,
      limit: options.limit ?? 3,
    })}`,
    { signal: options.signal },
  );
}

export function getDayBriefing(
  options: MetricsQueryOptions = {},
): Promise<MetricsDayBriefingResponse> {
  return request<MetricsDayBriefingResponse>(
    `/api/v1/metrics/day-briefing${buildMetricsQuery({
      ...options,
      anomalyLimit: options.anomalyLimit ?? 3,
    })}`,
    { signal: options.signal },
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
  }).then(normalizeChatResponse);
}
