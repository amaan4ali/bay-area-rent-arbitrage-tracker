"""Page 2 — Map: Scattermapbox of flagged listings color-coded by z-score."""

from __future__ import annotations

import dash_bootstrap_components as dbc
import plotly.express as px
from dash import dcc, html

from dashboard.data import fetch_all_scored

# Approximate lat/lng centroids for Bay Area zip codes (subset).
# In production you'd geocode via an API; this lookup is good enough for the
# dashboard prototype.
ZIP_COORDS: dict[str, tuple[float, float]] = {
    "94102": (37.7813, -122.4167), "94103": (37.7726, -122.4110),
    "94107": (37.7621, -122.3971), "94109": (37.7935, -122.4180),
    "94110": (37.7486, -122.4153), "94112": (37.7210, -122.4427),
    "94114": (37.7585, -122.4348), "94116": (37.7436, -122.4857),
    "94117": (37.7701, -122.4429), "94122": (37.7594, -122.4843),
    "94601": (37.7769, -122.2177), "94602": (37.8009, -122.2117),
    "94603": (37.7380, -122.1846), "94606": (37.7903, -122.2444),
    "94607": (37.8026, -122.2870), "94609": (37.8348, -122.2629),
    "94610": (37.8127, -122.2419), "94611": (37.8332, -122.2199),
    "94702": (37.8686, -122.2856), "94703": (37.8630, -122.2768),
    "94704": (37.8676, -122.2586), "94705": (37.8609, -122.2440),
    "95110": (37.3320, -121.8900), "95112": (37.3508, -121.8863),
    "95113": (37.3353, -121.8906), "95116": (37.3510, -121.8569),
    "95118": (37.2570, -121.8888), "95120": (37.2158, -121.8569),
    "95121": (37.3031, -121.8166), "95123": (37.2413, -121.8329),
    "95125": (37.2958, -121.8893), "95126": (37.3269, -121.9159),
    "94301": (37.4469, -122.1616), "94303": (37.4585, -122.1139),
    "94306": (37.4166, -122.1310),
    "94040": (37.3911, -122.0768), "94041": (37.3895, -122.0815),
    "94043": (37.4021, -122.0746),
    "94085": (37.3880, -122.0249), "94086": (37.3722, -122.0365),
    "94087": (37.3509, -122.0359),
    "94536": (37.5570, -121.9856), "94538": (37.5241, -121.9638),
    "94539": (37.5129, -121.9265),
    "94595": (37.8803, -122.0658), "94596": (37.8905, -122.0518),
    "94597": (37.9092, -122.0584),
    "94401": (37.5715, -122.3249), "94402": (37.5537, -122.3311),
    "94403": (37.5393, -122.3073), "94404": (37.5541, -122.2718),
}


def layout():
    try:
        df = fetch_all_scored()
    except Exception:
        df = None

    if df is None or df.empty:
        return dbc.Alert(
            "No scored listings available. Run the scoring pipeline first.",
            color="warning",
            className="mt-4",
        )

    # Add lat/lng from zip lookup
    df["lat"] = df["zip_code"].map(lambda z: ZIP_COORDS.get(z, (37.77, -122.42))[0])
    df["lng"] = df["zip_code"].map(lambda z: ZIP_COORDS.get(z, (37.77, -122.42))[1])

    fig = px.scatter_mapbox(
        df,
        lat="lat",
        lon="lng",
        color="z_score",
        size_max=12,
        color_continuous_scale="RdYlGn_r",
        range_color=[-3, 1],
        hover_name="zip_code",
        hover_data={"price": ":$,.0f", "bedrooms": True, "z_score": ":.2f", "lat": False, "lng": False},
        zoom=9,
        center={"lat": 37.56, "lon": -122.05},
        mapbox_style="carto-darkmatter",
        title="Listings by Z-Score (red = underpriced)",
    )
    fig.update_layout(
        margin={"r": 0, "t": 40, "l": 0, "b": 0},
        paper_bgcolor="#222",
        font_color="#ddd",
        height=700,
    )

    return html.Div([
        html.H2("Listing Map", className="text-info mb-3"),
        dcc.Graph(figure=fig, style={"height": "700px"}),
    ])
