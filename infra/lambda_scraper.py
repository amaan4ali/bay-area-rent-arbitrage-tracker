"""AWS Lambda handler: trigger scraping pipeline, archive raw JSON to S3, load into PostgreSQL.

Invoked by EventBridge on a daily schedule.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone

import boto3

from db.config import AWS_REGION, BAY_AREA_ZIP_CODES, S3_BUCKET_NAME
from db.crud import bulk_upsert_listings
from db.session import get_session, init_db
from scraper.craigslist import CraigslistScraper
from scraper.apartments import ApartmentsScraper

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

s3 = boto3.client("s3", region_name=AWS_REGION)


def handler(event: dict, context: object) -> dict:
    """Lambda entrypoint for the scraping pipeline."""
    init_db()

    zip_codes = event.get("zip_codes", BAY_AREA_ZIP_CODES)
    sources = event.get("sources", ["craigslist", "apartments"])
    max_pages = event.get("max_pages", 5)

    scraper_map = {
        "craigslist": CraigslistScraper,
        "apartments": ApartmentsScraper,
    }

    total_scraped = 0
    all_raw: list[dict] = []

    for src_name in sources:
        if src_name not in scraper_map:
            continue
        scraper = scraper_map[src_name]()

        for zc in zip_codes:
            for listing in scraper.scrape_zip(zc, max_pages=max_pages):
                all_raw.append(listing)

    # ── Archive raw JSON to S3 ────────────────────────────────────────────
    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    s3_key = f"raw/listings_{ts}.json"

    # Convert datetime objects to ISO strings for JSON serialisation
    serialisable = []
    for row in all_raw:
        row_copy = dict(row)
        for k, v in row_copy.items():
            if isinstance(v, datetime):
                row_copy[k] = v.isoformat()
        serialisable.append(row_copy)

    s3.put_object(
        Bucket=S3_BUCKET_NAME,
        Key=s3_key,
        Body=json.dumps(serialisable, default=str),
        ContentType="application/json",
    )
    logger.info("Archived %d raw listings to s3://%s/%s", len(serialisable), S3_BUCKET_NAME, s3_key)

    # ── Load into PostgreSQL ──────────────────────────────────────────────
    session = get_session()
    try:
        batch_size = 100
        for i in range(0, len(all_raw), batch_size):
            batch = all_raw[i : i + batch_size]
            total_scraped += bulk_upsert_listings(session, batch)
    except Exception:
        session.rollback()
        logger.error("Failed to load listings into PostgreSQL", exc_info=True)
        raise
    finally:
        session.close()

    return {
        "statusCode": 200,
        "body": {
            "listings_scraped": len(all_raw),
            "rows_upserted": total_scraped,
            "s3_key": s3_key,
        },
    }
