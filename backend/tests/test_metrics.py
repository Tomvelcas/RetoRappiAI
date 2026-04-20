"""Metrics endpoint tests."""

from fastapi.testclient import TestClient


def test_metrics_overview_returns_real_analytics_payload(client: TestClient) -> None:
    response = client.get("/api/v1/metrics/overview")

    assert response.status_code == 200
    payload = response.json()

    assert payload["kpis"]
    assert payload["trend"]
    assert payload["intraday_profile"]
    assert payload["quality"]["selected_coverage_ratio"] > 0
    assert payload["time_window"]["effective_start"] == "2026-02-01"
    assert payload["time_window"]["effective_end"] == "2026-02-11"
    assert payload["kpis"][0]["label"] == "Mean Signal Level"
    assert payload["top_anomalies"][0]["confidence"] in {"high", "medium", "low"}


def test_daily_endpoint_filters_requested_range(client: TestClient) -> None:
    response = client.get(
        "/api/v1/metrics/daily",
        params={"start_date": "2026-02-10", "end_date": "2026-02-10"},
    )

    assert response.status_code == 200
    payload = response.json()

    assert len(payload["points"]) == 1
    assert payload["points"][0]["date"] == "2026-02-10"
    assert payload["time_window"]["effective_start"] == "2026-02-10"
    assert payload["time_window"]["effective_end"] == "2026-02-10"


def test_invalid_date_range_returns_400(client: TestClient) -> None:
    response = client.get(
        "/api/v1/metrics/overview",
        params={"start_date": "2026-02-11", "end_date": "2026-02-10"},
    )

    assert response.status_code == 400
    assert "start_date" in response.json()["detail"]


def test_coverage_extremes_returns_low_and_high_days(client: TestClient) -> None:
    response = client.get("/api/v1/metrics/coverage-extremes", params={"limit": 3})

    assert response.status_code == 200
    payload = response.json()

    assert len(payload["lowest_coverage_days"]) == 3
    assert len(payload["highest_coverage_days"]) == 3
    assert (
        payload["lowest_coverage_days"][0]["coverage_ratio"]
        <= payload["lowest_coverage_days"][1]["coverage_ratio"]
    )
    assert (
        payload["highest_coverage_days"][0]["coverage_ratio"]
        >= payload["highest_coverage_days"][1]["coverage_ratio"]
    )


def test_intraday_profile_returns_clock_hour_distribution(client: TestClient) -> None:
    response = client.get("/api/v1/metrics/intraday-profile")

    assert response.status_code == 200
    payload = response.json()

    assert payload["points"]
    assert payload["points"][0]["label"]
    assert payload["strongest_hour"]["label"]
    assert payload["weakest_hour"]["label"]


def test_anomalies_endpoint_returns_ranked_findings(client: TestClient) -> None:
    response = client.get("/api/v1/metrics/anomalies", params={"limit": 2})

    assert response.status_code == 200
    payload = response.json()

    assert len(payload["items"]) == 2
    assert payload["items"][0]["date"]
    assert payload["items"][0]["severity"] in {"high", "medium", "low"}


def test_quality_endpoint_returns_dataset_health_indicators(client: TestClient) -> None:
    response = client.get("/api/v1/metrics/quality")

    assert response.status_code == 200
    payload = response.json()

    assert payload["selected_coverage_ratio"] > 0
    assert payload["rows_observed"] > 0
    assert payload["coverage_status"] in {"high", "medium", "low"}


def test_day_briefing_returns_single_day_narrative(client: TestClient) -> None:
    response = client.get(
        "/api/v1/metrics/day-briefing",
        params={"target_date": "2026-02-10", "anomaly_limit": 2},
    )

    assert response.status_code == 200
    payload = response.json()

    assert payload["briefing"]["target_date"] == "2026-02-10"
    assert payload["briefing"]["summary"]
    assert payload["briefing"]["strongest_hour"]["label"]
    assert payload["briefing"]["suggested_questions"]


def test_metrics_not_found_errors_are_translated_to_404(
    client: TestClient,
    monkeypatch,
) -> None:
    def _raise_lookup_error(*args, **kwargs) -> None:
        raise LookupError("No hay datos para esa fecha.")

    monkeypatch.setattr(
        "app.api.routes.metrics.get_metrics_day_briefing",
        _raise_lookup_error,
    )

    response = client.get(
        "/api/v1/metrics/day-briefing",
        params={"target_date": "2026-03-01"},
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "No hay datos para esa fecha."
