"""Page 1 — Alerts: table of underpriced listings, filterable by zip & bedrooms."""

from __future__ import annotations

import dash_bootstrap_components as dbc
from dash import dash_table, dcc, html

from dashboard.data import fetch_bedroom_options, fetch_underpriced, fetch_zip_codes


def layout():
    try:
        zip_options = fetch_zip_codes()
        bed_options = fetch_bedroom_options()
        df = fetch_underpriced()
    except Exception:
        zip_options, bed_options = [], []
        df = None

    filters = dbc.Row(
        [
            dbc.Col(
                dcc.Dropdown(
                    id="filter-zip",
                    options=[{"label": z, "value": z} for z in zip_options],
                    placeholder="Filter by zip code…",
                    className="dash-bootstrap",
                    style={"color": "#000"},
                ),
                width=3,
            ),
            dbc.Col(
                dcc.Dropdown(
                    id="filter-beds",
                    options=[{"label": f"{b} BR", "value": b} for b in bed_options],
                    placeholder="Filter by bedrooms…",
                    className="dash-bootstrap",
                    style={"color": "#000"},
                ),
                width=3,
            ),
        ],
        className="mb-3",
    )

    if df is not None and not df.empty:
        table = dash_table.DataTable(
            id="alerts-table",
            columns=[
                {"name": "Zip", "id": "zip_code"},
                {"name": "Price", "id": "price", "type": "numeric", "format": {"specifier": "$,.0f"}},
                {"name": "BR", "id": "bedrooms"},
                {"name": "Sqft", "id": "sqft"},
                {"name": "Median", "id": "rolling_median", "type": "numeric", "format": {"specifier": "$,.0f"}},
                {"name": "Z-Score", "id": "z_score", "type": "numeric", "format": {"specifier": ".2f"}},
                {"name": "Source", "id": "source"},
                {"name": "URL", "id": "url", "presentation": "markdown"},
            ],
            data=df.to_dict("records"),
            sort_action="native",
            filter_action="native",
            page_size=25,
            style_table={"overflowX": "auto"},
            style_header={"backgroundColor": "#303030", "color": "#fff", "fontWeight": "bold"},
            style_cell={
                "backgroundColor": "#222",
                "color": "#ddd",
                "border": "1px solid #444",
                "textAlign": "left",
                "padding": "8px",
            },
            style_data_conditional=[
                {
                    "if": {"filter_query": "{z_score} < -2.0"},
                    "backgroundColor": "#5c1a1a",
                    "color": "#ff6b6b",
                },
            ],
        )
    else:
        table = dbc.Alert(
            "No underpriced listings found. Run the scraper and scoring pipeline first.",
            color="warning",
        )

    return html.Div([
        html.H2("Underpriced Listing Alerts", className="text-info mb-3"),
        filters,
        table,
    ])
