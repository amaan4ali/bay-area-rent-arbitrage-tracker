"""Data-access helpers for the dashboard (read-only queries via pandas)."""

from __future__ import annotations

import pandas as pd
from sqlalchemy import text

from db.session import engine


def fetch_underpriced(zip_code: str | None = None, bedrooms: int | None = None) -> pd.DataFrame:
    """Return a DataFrame of underpriced listings joined with scores."""
    query = """
        SELECT
            l.id, l.url, l.source, l.zip_code, l.price, l.bedrooms,
            l.bathrooms, l.sqft, l.description, l.listing_date,
            s.rolling_median, s.z_score, s.scored_at
        FROM listings l
        JOIN scored_listings s ON l.id = s.listing_id
        WHERE s.is_underpriced = true
    """
    params: dict[str, object] = {}
    if zip_code:
        query += " AND l.zip_code = :zip_code"
        params["zip_code"] = zip_code
    if bedrooms is not None:
        query += " AND l.bedrooms = :bedrooms"
        params["bedrooms"] = bedrooms
    query += " ORDER BY s.z_score ASC LIMIT 500"

    with engine.connect() as conn:
        return pd.read_sql(text(query), conn, params=params)


def fetch_all_scored() -> pd.DataFrame:
    """Return all scored listings (for the map)."""
    query = """
        SELECT
            l.id, l.url, l.zip_code, l.price, l.bedrooms, l.sqft,
            l.description, s.rolling_median, s.z_score, s.is_underpriced
        FROM listings l
        JOIN scored_listings s ON l.id = s.listing_id
        ORDER BY s.z_score ASC
        LIMIT 2000
    """
    with engine.connect() as conn:
        return pd.read_sql(text(query), conn)


def fetch_trends() -> pd.DataFrame:
    """Return weekly median rent per zip_code for trend charts."""
    query = """
        SELECT
            zip_code,
            bedrooms,
            date_trunc('week', scraped_at) AS week,
            percentile_cont(0.5) WITHIN GROUP (ORDER BY price) AS median_price,
            count(*) AS listing_count
        FROM listings
        WHERE price IS NOT NULL
        GROUP BY zip_code, bedrooms, date_trunc('week', scraped_at)
        ORDER BY week
    """
    with engine.connect() as conn:
        return pd.read_sql(text(query), conn)


def fetch_zip_codes() -> list[str]:
    """Return distinct zip codes that have scored listings."""
    query = "SELECT DISTINCT zip_code FROM listings ORDER BY zip_code"
    with engine.connect() as conn:
        df = pd.read_sql(text(query), conn)
    return df["zip_code"].tolist()


def fetch_bedroom_options() -> list[int]:
    """Return distinct bedroom counts present in scored listings."""
    query = """
        SELECT DISTINCT bedrooms FROM listings
        WHERE bedrooms IS NOT NULL
        ORDER BY bedrooms
    """
    with engine.connect() as conn:
        df = pd.read_sql(text(query), conn)
    return df["bedrooms"].tolist()
