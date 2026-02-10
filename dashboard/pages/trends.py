"""Page 3 — Trends: rolling median rent over time per zip code."""

from __future__ import annotations

import dash_bootstrap_components as dbc
import plotly.express as px
from dash import dcc, html

from dashboard.data import fetch_trends, fetch_zip_codes


def layout():
    try:
        df = fetch_trends()
        zip_options = fetch_zip_codes()
    except Exception:
        df = None
        zip_options = []

    if df is None or df.empty:
        return dbc.Alert(
            "No trend data available yet. Scrape listings over multiple weeks to see trends.",
            color="warning",
            className="mt-4",
        )

    # Default: show top-10 most common zip codes
    top_zips = df.groupby("zip_code")["listing_count"].sum().nlargest(10).index.tolist()
    filtered = df[df["zip_code"].isin(top_zips)]

    fig = px.line(
        filtered,
        x="week",
        y="median_price",
        color="zip_code",
        markers=True,
        title="Weekly Median Rent by Zip Code",
        labels={"median_price": "Median Rent ($)", "week": "Week", "zip_code": "Zip Code"},
    )
    fig.update_layout(
        template="plotly_dark",
        paper_bgcolor="#222",
        plot_bgcolor="#1a1a2e",
        font_color="#ddd",
        height=550,
        legend=dict(orientation="h", y=-0.15),
    )

    # Bedroom breakdown chart
    bed_df = df.groupby(["week", "bedrooms"]).agg({"median_price": "median"}).reset_index()
    bed_df = bed_df[bed_df["bedrooms"].notna()]
    fig_beds = px.line(
        bed_df,
        x="week",
        y="median_price",
        color="bedrooms",
        markers=True,
        title="Weekly Median Rent by Bedroom Count",
        labels={"median_price": "Median Rent ($)", "week": "Week", "bedrooms": "Bedrooms"},
    )
    fig_beds.update_layout(
        template="plotly_dark",
        paper_bgcolor="#222",
        plot_bgcolor="#1a1a2e",
        font_color="#ddd",
        height=450,
    )

    return html.Div([
        html.H2("Rent Trends", className="text-info mb-3"),
        dbc.Row([
            dbc.Col(
                dcc.Dropdown(
                    id="trend-zip-filter",
                    options=[{"label": z, "value": z} for z in zip_options],
                    value=top_zips[:5],
                    multi=True,
                    placeholder="Select zip codes…",
                    style={"color": "#000"},
                ),
                width=6,
            ),
        ], className="mb-3"),
        dcc.Graph(figure=fig),
        html.Hr(),
        dcc.Graph(figure=fig_beds),
    ])
