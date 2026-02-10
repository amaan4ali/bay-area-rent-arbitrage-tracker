"""Plotly Dash application — Bay Area Rent Arbitrage Tracker.

Three-page dark-themed dashboard:
  1. Alerts — underpriced listings table
  2. Map    — scattermapbox of flagged listings
  3. Trends — rolling median rent over time
"""

from __future__ import annotations

import dash
import dash_bootstrap_components as dbc
from dash import Dash, dcc, html
from dash.dependencies import Input, Output

from db.config import DASH_DEBUG, DASH_HOST, DASH_PORT, DASH_REFRESH_INTERVAL_HOURS
from dashboard.pages import alerts, map_view, trends

# ── App initialisation ────────────────────────────────────────────────────────

app = Dash(
    __name__,
    external_stylesheets=[dbc.themes.DARKLY],
    suppress_callback_exceptions=True,
    title="Bay Area Rent Arbitrage Tracker",
)
server = app.server  # for gunicorn / Lambda

# ── Layout ────────────────────────────────────────────────────────────────────

REFRESH_MS = DASH_REFRESH_INTERVAL_HOURS * 60 * 60 * 1000

app.layout = dbc.Container(
    fluid=True,
    className="p-0",
    children=[
        dcc.Interval(id="auto-refresh", interval=REFRESH_MS, n_intervals=0),
        dcc.Location(id="url", refresh=False),

        # Navbar
        dbc.Navbar(
            dbc.Container(
                [
                    dbc.NavbarBrand(
                        "Bay Area Rent Arbitrage Tracker",
                        className="ms-2 fw-bold",
                    ),
                    dbc.Nav(
                        [
                            dbc.NavLink("Alerts", href="/", active="exact"),
                            dbc.NavLink("Map", href="/map", active="exact"),
                            dbc.NavLink("Trends", href="/trends", active="exact"),
                        ],
                        navbar=True,
                    ),
                    dbc.Button(
                        "Refresh Now",
                        id="btn-refresh",
                        color="info",
                        size="sm",
                        className="ms-auto",
                    ),
                ],
                fluid=True,
            ),
            color="dark",
            dark=True,
            sticky="top",
        ),

        # Page content
        html.Div(id="page-content", className="p-4"),
    ],
)


# ── Routing ───────────────────────────────────────────────────────────────────

@app.callback(
    Output("page-content", "children"),
    [Input("url", "pathname"), Input("auto-refresh", "n_intervals"), Input("btn-refresh", "n_clicks")],
)
def render_page(pathname: str | None, _n_intervals: int, _n_clicks: int | None):
    if pathname == "/map":
        return map_view.layout()
    if pathname == "/trends":
        return trends.layout()
    return alerts.layout()


# ── Run ───────────────────────────────────────────────────────────────────────

def main() -> None:
    app.run(host=DASH_HOST, port=DASH_PORT, debug=DASH_DEBUG)


if __name__ == "__main__":
    main()
