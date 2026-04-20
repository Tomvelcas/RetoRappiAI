import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getBackendHealth,
  getCoverageExtremes,
  getDayBriefing,
  getMetricsOverview,
  queryChat,
} from "@/lib/api";

const fetchMock = vi.fn();

describe("api client", () => {
  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it("builds metric queries with the expected parameters", async () => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ generated_at: "now" }),
    });

    await getMetricsOverview({
      startDate: "2026-04-01",
      endDate: "2026-04-20",
      limit: 5,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8418/api/v1/metrics/overview?start_date=2026-04-01&end_date=2026-04-20&limit=5",
      expect.objectContaining({
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
      }),
    );
  });

  it("applies endpoint defaults and posts chat payloads", async () => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });

    await getCoverageExtremes();
    await getDayBriefing({ targetDate: "2026-04-18" });
    await queryChat({ question: "Explain the biggest dip" });
    await getBackendHealth();

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://localhost:8418/api/v1/metrics/coverage-extremes?limit=3",
      expect.any(Object),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://localhost:8418/api/v1/metrics/day-briefing?target_date=2026-04-18&anomaly_limit=3",
      expect.any(Object),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "http://localhost:8418/api/v1/chat/query",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ question: "Explain the biggest dip" }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(4, "http://localhost:8418/health", expect.any(Object));
  });

  it("surfaces API error details when the backend returns them", async () => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({ detail: "Invalid date range" }),
    });

    await expect(getMetricsOverview()).rejects.toThrow("Invalid date range");
  });

  it("falls back to a status-based message when the error body is unreadable", async () => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => {
        throw new Error("broken body");
      },
    });

    await expect(getMetricsOverview()).rejects.toThrow("Request failed with status 503");
  });
});
