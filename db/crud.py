"""CRUD operations with upsert (deduplication) logic."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import inspect
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from db.models import Listing, ScoredListing


def upsert_listing(session: Session, data: dict[str, Any]) -> Listing:
    """Insert a listing or update it if the URL already exists.

    Deduplication is keyed on the ``url`` column.  On conflict the mutable
    fields (price, description, scraped_at, …) are updated so we always keep
    the freshest data.
    """
    stmt = pg_insert(Listing).values(**data)

    # On duplicate url → update every column except id and url
    update_cols = {
        c.key: stmt.excluded[c.key]
        for c in inspect(Listing).columns
        if c.key not in ("id", "url")
    }
    stmt = stmt.on_conflict_do_update(index_elements=["url"], set_=update_cols)
    session.execute(stmt)
    session.commit()

    return session.query(Listing).filter_by(url=data["url"]).one()


def bulk_upsert_listings(session: Session, rows: list[dict[str, Any]]) -> int:
    """Bulk-upsert a batch of listing dicts. Returns the number of rows affected."""
    if not rows:
        return 0

    stmt = pg_insert(Listing).values(rows)
    update_cols = {
        c.key: stmt.excluded[c.key]
        for c in inspect(Listing).columns
        if c.key not in ("id", "url")
    }
    stmt = stmt.on_conflict_do_update(index_elements=["url"], set_=update_cols)
    result = session.execute(stmt)
    session.commit()
    return result.rowcount  # type: ignore[return-value]


def upsert_scored_listing(session: Session, data: dict[str, Any]) -> None:
    """Insert or update a scored listing keyed on listing_id."""
    stmt = pg_insert(ScoredListing).values(**data)
    update_cols = {
        c.key: stmt.excluded[c.key]
        for c in inspect(ScoredListing).columns
        if c.key not in ("id", "listing_id")
    }
    stmt = stmt.on_conflict_do_update(index_elements=["listing_id"], set_=update_cols)
    session.execute(stmt)
    session.commit()


def bulk_upsert_scored_listings(session: Session, rows: list[dict[str, Any]]) -> int:
    """Bulk-upsert scored listing rows. Returns rows affected."""
    if not rows:
        return 0

    stmt = pg_insert(ScoredListing).values(rows)
    update_cols = {
        c.key: stmt.excluded[c.key]
        for c in inspect(ScoredListing).columns
        if c.key not in ("id", "listing_id")
    }
    stmt = stmt.on_conflict_do_update(index_elements=["listing_id"], set_=update_cols)
    result = session.execute(stmt)
    session.commit()
    return result.rowcount  # type: ignore[return-value]


def get_underpriced_listings(
    session: Session,
    zip_code: str | None = None,
    bedrooms: int | None = None,
    limit: int = 200,
) -> list[dict[str, Any]]:
    """Return underpriced listings with their scores, optionally filtered."""
    q = (
        session.query(Listing, ScoredListing)
        .join(ScoredListing, Listing.id == ScoredListing.listing_id)
        .filter(ScoredListing.is_underpriced.is_(True))
    )
    if zip_code:
        q = q.filter(Listing.zip_code == zip_code)
    if bedrooms is not None:
        q = q.filter(Listing.bedrooms == bedrooms)
    q = q.order_by(ScoredListing.z_score.asc()).limit(limit)

    results = []
    for listing, scored in q.all():
        results.append({
            "id": listing.id,
            "url": listing.url,
            "source": listing.source,
            "zip_code": listing.zip_code,
            "price": listing.price,
            "bedrooms": listing.bedrooms,
            "bathrooms": listing.bathrooms,
            "sqft": listing.sqft,
            "listing_date": listing.listing_date,
            "rolling_median": scored.rolling_median,
            "z_score": scored.z_score,
            "scored_at": scored.scored_at,
        })
    return results
