const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:8000";

export type BackendHealth = {
  status: string;
  service: string;
  environment: string;
};

export type MetricsOverview = {
  generated_at: string;
  kpis: Array<{
    label: string;
    value: string;
    change: string;
  }>;
  trend: Array<{
    date: string;
    availability_rate: number;
  }>;
  notes: string[];
};

export type ChatResponse = {
  answer: string;
  grounded_metrics: string[];
  reasoning_scope: string;
  disclaimer: string;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

export function getBackendHealth(): Promise<BackendHealth> {
  return request<BackendHealth>("/health", { cache: "no-store" });
}

export function getMetricsOverview(): Promise<MetricsOverview> {
  return request<MetricsOverview>("/api/v1/metrics/overview", { cache: "no-store" });
}

export function queryChat(question: string): Promise<ChatResponse> {
  return request<ChatResponse>("/api/v1/chat/query", {
    method: "POST",
    body: JSON.stringify({ question }),
  });
}
