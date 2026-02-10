"""CLI entrypoint for the scraping pipeline.

Usage:
    python -m scraper.run --source craigslist --zip 94110
    python -m scraper.run --source apartments --zip 94110
    python -m scraper.run --source all          # scrape all zips from all sources
"""

from __future__ import annotations

import logging
import sys

import click

from db.config import BAY_AREA_ZIP_CODES
from db.crud import bulk_upsert_listings
from db.session import get_session, init_db
from scraper.craigslist import CraigslistScraper
from scraper.apartments import ApartmentsScraper

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

SCRAPERS = {
    "craigslist": CraigslistScraper,
    "apartments": ApartmentsScraper,
}

BATCH_SIZE = 50


@click.command()
@click.option(
    "--source",
    type=click.Choice(["craigslist", "apartments", "all"]),
    default="all",
    help="Which source to scrape.",
)
@click.option(
    "--zip",
    "zip_codes",
    multiple=True,
    help="Zip code(s) to scrape. Omit to scrape all configured zips.",
)
@click.option("--max-pages", default=10, help="Max pages per zip code.")
def main(source: str, zip_codes: tuple[str, ...], max_pages: int) -> None:
    """Scrape rental listings and load them into PostgreSQL."""
    init_db()

    zips = list(zip_codes) if zip_codes else BAY_AREA_ZIP_CODES
    sources = list(SCRAPERS.keys()) if source == "all" else [source]

    total_inserted = 0

    for src_name in sources:
        scraper = SCRAPERS[src_name]()
        logger.info("Starting %s scraper for %d zip codes", src_name, len(zips))

        for zc in zips:
            batch: list[dict] = []
            for listing in scraper.scrape_zip(zc, max_pages=max_pages):
                batch.append(listing)
                if len(batch) >= BATCH_SIZE:
                    total_inserted += _flush(batch)
                    batch = []
            if batch:
                total_inserted += _flush(batch)

            logger.info("Finished zip %s via %s", zc, src_name)

    logger.info("Done. Total rows upserted: %d", total_inserted)


def _flush(batch: list[dict]) -> int:
    session = get_session()
    try:
        count = bulk_upsert_listings(session, batch)
        return count
    except Exception:
        session.rollback()
        logger.error("Failed to upsert batch of %d rows", len(batch), exc_info=True)
        return 0
    finally:
        session.close()


if __name__ == "__main__":
    main()
