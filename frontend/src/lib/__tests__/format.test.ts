import type { IntradayProfilePoint } from "@/lib/api";
import { describe, expect, it } from "vitest";

import {
  anomalyLabel,
  briefingQuestion,
  confidenceLabel,
  coverageChip,
  coverageTone,
  formatCompactNumber,
  formatCoverage,
  formatHourFromNumber,
  formatLongDate,
  formatShortDate,
  getIntradayExtremes,
  mapKpiToUi,
  modeLabel,
  sourceLabel,
} from "@/lib/format";

describe("format helpers", () => {
  it("formats dates, numbers and percentages predictably", () => {
    expect(formatShortDate("2026-04-20")).toBe("Apr 20");
    expect(formatLongDate("2026-04-20")).toBe("Apr 20, 2026");
    expect(formatCompactNumber(12500)).toBe("12.5K");
    expect(formatCoverage(0.834)).toBe("83.4%");
    expect(formatHourFromNumber(7)).toBe("07:00");
  });

  it("maps status labels and visual tokens", () => {
    expect(confidenceLabel(null)).toBe("steady");
    expect(confidenceLabel("high")).toBe("high");
    expect(coverageTone("high")).toContain("--signal-cyan");
    expect(coverageChip("medium")).toContain("--signal-amber");
    expect(modeLabel("llm_enhanced")).toBe("polished");
    expect(modeLabel("deterministic_fallback")).toBe("polish unavailable");
    expect(modeLabel("grounded")).toBe("grounded");
  });

  it("maps KPI and source metadata to UI-friendly labels", () => {
    expect(
      mapKpiToUi({
        key: "coverage_ratio",
        label: "Coverage ratio",
        value: 0.91,
        formatted_value: "91%",
        change_label: "Stable vs previous window",
        context: "Share of expected data points present",
        confidence: "high",
      }),
    ).toEqual({
      label: "Coverage",
      value: "91%",
      caption: "Stable vs previous window",
    });

    expect(sourceLabel("availability_hourly.csv")).toBe("hourly rhythm");
    expect(sourceLabel("custom_table.csv")).toBe("custom table");
  });

  it("detects intraday extremes and formats anomaly and briefing copy", () => {
    const profile: IntradayProfilePoint[] = [
      {
        hour: 8,
        mean_signal: 0.52,
        median_signal: 0.51,
        avg_points: 12,
        coverage_ratio: 0.94,
        coverage_flag: "high",
      },
      {
        hour: 13,
        mean_signal: 0.81,
        median_signal: 0.8,
        avg_points: 12,
        coverage_ratio: 0.91,
        coverage_flag: "high",
      },
      {
        hour: 22,
        mean_signal: 0.34,
        median_signal: 0.33,
        avg_points: 12,
        coverage_ratio: 0.88,
        coverage_flag: "medium",
      },
    ];

    const { strongest, weakest } = getIntradayExtremes(profile);

    expect(strongest?.hour).toBe(13);
    expect(weakest?.hour).toBe(22);
    expect(
      anomalyLabel({
        hour_bucket: "09:00",
        date: "2026-04-18",
        hour: 9,
        mean_signal: 0.44,
        baseline_mean: 0.61,
        baseline_median: 0.59,
        zscore: -2.5,
        delta_vs_hour_median: -0.15,
        n_points: 6,
        anomaly_direction: "low",
        coverage_flag: "medium",
        confidence: "medium",
      }),
    ).toBe("Apr 18 · 09:00 · dip");
    expect(
      briefingQuestion({
        target_date: "2026-04-18",
        headline: "Sharp dip at lunch",
        summary: "Sharp dip at lunch.",
        confidence: "medium",
        mean_signal: 0.44,
        formatted_mean_signal: "44%",
        median_signal: 0.46,
        coverage_ratio: 0.89,
        coverage_flag: "medium",
        delta_vs_prior_day: -0.08,
        delta_vs_prior_day_label: "-8 pts vs previous day",
        strongest_hour: {
          hour: 11,
          label: "11:00",
          mean_signal: 0.71,
          coverage_ratio: 0.96,
          coverage_flag: "high",
        },
        weakest_hour: {
          hour: 14,
          label: "14:00",
          mean_signal: 0.22,
          coverage_ratio: 0.83,
          coverage_flag: "medium",
        },
        top_anomalies: [],
        highlights: ["Coverage remained acceptable despite the dip."],
        cautions: ["Interpret with care because coverage softened mid-day."],
        suggested_questions: ["How does this compare with the previous week?"],
      }),
    ).toBe("What happened on 2026-04-18?");
  });
});
